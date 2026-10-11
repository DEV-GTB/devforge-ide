import express from "express";
import { generateText, isCloudAIConfigured } from "../ai/textModel";
import { TinyMLP, TrainExample } from "./tinyNet";
import {
  generateVoxelScene,
  shapeFromPrompt,
  voxelsToOBJ,
  VOXEL_SHAPES,
} from "./voxel";

const router = express.Router();

// ---------------------------------------------------------------------------
// 1. AI-generated Three.js scenes
// ---------------------------------------------------------------------------

const SCENE_CONTRACT = `You are a senior Three.js engineer. Write a single self-contained JavaScript scene.

STRICT RULES:
- Output ONLY JavaScript. No markdown fences, no explanations, no import statements.
- THREE is already available in scope (the viewer imports it before your code runs).
- Define exactly one function: function buildScene(scene, camera, renderer) { ... }
- Inside it, add meshes/lights/animation to the provided THREE.Scene.
- Use only core three.js APIs (no external loaders/packages).
- Keep geometry counts modest (a few thousand triangles max).
- Optionally return { update(t), dispose() } to animate or clean up.
- End the file with: export { buildScene };
`;

function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:javascript|js|typescript|ts)?\s*([\s\S]*?)```/i);
  let code = (fenced ? fenced[1] : text).trim();
  // Remove any stray import lines the model added.
  code = code
    .split("\n")
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n")
    .trim();
  if (!code.includes("buildScene")) {
    throw new Error("Generated scene did not match the expected contract.");
  }
  if (!code.includes("export")) {
    code += "\nexport { buildScene };";
  }
  return code;
}

function fallbackSceneCode(prompt: string, style: string): string {
  const safePrompt = JSON.stringify(prompt);
  const safeStyle = JSON.stringify(style);
  return `// Offline fallback scene (no cloud AI available)
function buildScene(scene, camera, renderer) {
  const description = ${safePrompt};
  const style = ${safeStyle};
  scene.background = new THREE.Color(0x0b1020);
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(5, 8, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0x4f8cff, 2.2, 40);
  rim.position.set(-6, 4, -5);
  scene.add(rim);

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.4, 0.42, 160, 24),
    new THREE.MeshStandardMaterial({ color: 0x4f8cff, metalness: 0.55, roughness: 0.25 })
  );
  knot.position.y = 1.9;
  scene.add(knot);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 0.3, 64),
    new THREE.MeshStandardMaterial({ color: 0x1c2233, metalness: 0.3, roughness: 0.7 })
  );
  platform.position.y = -0.15;
  scene.add(platform);

  const stars = new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 400 }, () => new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      ))
    ),
    new THREE.PointsMaterial({ color: 0x9db4ff, size: 0.08 })
  );
  scene.add(stars);

  return {
    description,
    update(t) {
      knot.rotation.x = t * 0.6;
      knot.rotation.y = t * 0.9;
      stars.rotation.y = t * 0.05;
    }
  };
}
export { buildScene };
`;
}

router.post("/scene", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const style = String(req.body?.style || "modern stylized").trim();
  if (!prompt) {
    return res.status(400).json({ error: "A scene prompt is required." });
  }

  try {
    const { text, provider } = await generateText(
      [
        { role: "system", content: SCENE_CONTRACT },
        {
          role: "user",
          content: `Build a Three.js scene for: "${prompt}". Visual style: ${style}. Make it visually rich but performant.`,
        },
      ],
      { temperature: 0.5 }
    );
    const code = stripCodeFences(text);
    return res.json({ success: true, code, provider, mode: "cloud" });
  } catch (error) {
    console.warn("[3d] scene AI unavailable, using fallback:", error instanceof Error ? error.message : error);
    return res.json({
      success: true,
      code: fallbackSceneCode(prompt, style),
      provider: "offline",
      mode: "local",
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Hosted text/image-to-3D mesh (configurable external model)
// ---------------------------------------------------------------------------

// Configure THREED_HF_ENDPOINT to a Hugging Face text/image-to-3D inference
// endpoint (e.g. a TripoSR Space's /run/predict or an Inference Endpoint URL).
// HUGGINGFACE_API_KEY is used as the bearer token when present.
router.post("/mesh", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const image = typeof req.body?.image === "string" ? req.body.image : "";
  const endpoint = process.env.THREED_HF_ENDPOINT;
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  if (!endpoint) {
    return res.json({
      success: false,
      configured: false,
      fallback: buildProceduralFallback(prompt),
      message:
        "Hosted 3D generation is not configured. Set THREED_HF_ENDPOINT (and HUGGINGFACE_API_KEY) to enable real mesh generation. Showing a procedural fallback for now.",
    });
  }

  try {
    // Gradio-style payload used by most public text/image-to-3D Spaces.
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ data: [image || prompt] }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return res.status(502).json({
        success: false,
        configured: true,
        error: `3D service responded ${response.status}: ${detail.slice(0, 200)}`,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      // Accept several common shapes returned by Gradio/Inference endpoints.
      const url = payload?.data?.[0]?.url || payload?.url || payload?.output;
      return res.json({ success: true, configured: true, modelUrl: url, raw: payload });
    }

    const glb = Buffer.from(await response.arrayBuffer()).toString("base64");
    return res.json({ success: true, configured: true, glb });
  } catch (error) {
    return res.status(502).json({
      success: false,
      configured: true,
      error: error instanceof Error ? error.message : "3D service request failed.",
    });
  }
});

function buildProceduralFallback(prompt: string) {
  const shape = shapeFromPrompt(prompt || "cube");
  const scene = generateVoxelScene(shape, 14);
  return {
    shape: scene.shape,
    format: "obj",
    obj: voxelsToOBJ(scene),
  };
}

// ---------------------------------------------------------------------------
// 3. Deterministic voxel / CSG generator
// ---------------------------------------------------------------------------

router.get("/shapes", (_req, res) => {
  res.json({ shapes: VOXEL_SHAPES });
});

router.post("/voxel", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  const requestedShape = String(req.body?.shape || "").trim();
  const size = Number(req.body?.size) || 16;

  let shape = requestedShape;
  let decidedBy = "explicit";

  if (!shape || !VOXEL_SHAPES.includes(shape as any)) {
    if (prompt && isCloudAIConfigured()) {
      try {
        const { text } = await generateText(
          [
            {
              role: "system",
              content: `Choose the best matching shape from this list for the user's request: ${VOXEL_SHAPES.join(", ")}. Reply with ONLY the single shape word, lowercase.`,
            },
            { role: "user", content: prompt },
          ],
          { temperature: 0 }
        );
        const candidate = text.trim().toLowerCase().split(/\s+/)[0];
        if (VOXEL_SHAPES.includes(candidate as any)) {
          shape = candidate;
          decidedBy = "ai";
        }
      } catch {
        // fall through to keyword matching
      }
    }
    if (!shape || !VOXEL_SHAPES.includes(shape as any)) {
      shape = shapeFromPrompt(prompt);
      decidedBy = "keyword";
    }
  }

  const scene = generateVoxelScene(shape, size);
  return res.json({
    success: true,
    shape: scene.shape,
    decidedBy,
    size: scene.size,
    voxels: scene.voxels,
    bounds: scene.bounds,
    triangleCount: scene.triangleCount,
    obj: voxelsToOBJ(scene),
  });
});

// ---------------------------------------------------------------------------
// 4. Trainable tiny model (real gradient descent, no GPU, no database)
// ---------------------------------------------------------------------------

interface StoredModel {
  id: string;
  name: string;
  task: "classify" | "regress";
  sizes: number[];
  model: TinyMLP;
  summary: ReturnType<TinyMLP["train"]>;
  classes?: string[];
  createdAt: string;
}

const models = new Map<string, StoredModel>();

interface RawExample {
  input?: number[];
  output?: number[];
  label?: string;
}

function toTrainingSet(
  rawExamples: RawExample[],
  classes: string[] | undefined,
  task: "classify" | "regress"
): { examples: TrainExample[]; classes?: string[]; outputSize: number } {
  if (!Array.isArray(rawExamples) || rawExamples.length === 0) {
    throw new Error("At least one training example is required.");
  }

  let resolvedClasses = classes && classes.length ? classes : undefined;
  const examples: TrainExample[] = [];

  for (const example of rawExamples) {
    if (!Array.isArray(example.input) || !example.input.every((n) => typeof n === "number")) {
      throw new Error("Every example needs an 'input' array of numbers.");
    }
    if (task === "classify" && typeof example.label === "string") {
      if (!resolvedClasses) resolvedClasses = [];
      if (!resolvedClasses.includes(example.label)) resolvedClasses.push(example.label);
      examples.push({ input: example.input, output: [] });
    } else if (Array.isArray(example.output) && example.output.every((n) => typeof n === "number")) {
      examples.push({ input: example.input, output: example.output });
    } else {
      throw new Error("Every example needs either an 'output' number array or a 'label'.");
    }
  }

  if (task === "classify" && resolvedClasses) {
    for (let i = 0; i < examples.length; i++) {
      const label = (rawExamples[i] as RawExample).label;
      const oneHot = resolvedClasses.map((c) => (c === label ? 1 : 0));
      examples[i] = { input: examples[i].input, output: oneHot };
    }
  }

  const outputSize = examples[0].output.length;
  return { examples, classes: resolvedClasses, outputSize };
}

router.post("/train", (req, res) => {
  try {
    const name = String(req.body?.name || `model-${Date.now()}`).slice(0, 60);
    const task: "classify" | "regress" = req.body?.task === "regress" ? "regress" : "classify";
    const rawExamples: RawExample[] = req.body?.examples || [];
    const hidden: number[] = Array.isArray(req.body?.hidden) && req.body.hidden.length
      ? req.body.hidden.map((n: any) => Math.max(1, Math.min(256, Number(n) || 8)))
      : [12];
    const epochs = Math.max(1, Math.min(5000, Number(req.body?.epochs) || 300));
    const lr = Math.max(0.0001, Math.min(1, Number(req.body?.lr) || 0.15));
    const seed = Number(req.body?.seed) || 42;

    const { examples, classes, outputSize } = toTrainingSet(rawExamples, req.body?.classes, task);
    const inputSize = examples[0].input.length;
    if (inputSize > 1024) throw new Error("Input dimension is too large (max 1024).");
    if (examples.length > 5000) throw new Error("Too many training examples (max 5000).");

    const sizes = [inputSize, ...hidden, outputSize];
    const model = new TinyMLP(sizes, seed);
    const summary = model.train(examples, epochs, lr);

    const id = `mdl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const stored: StoredModel = {
      id,
      name,
      task,
      sizes,
      model,
      summary,
      classes,
      createdAt: new Date().toISOString(),
    };
    models.set(id, stored);

    return res.json({
      success: true,
      id,
      name,
      task,
      sizes,
      classes,
      summary,
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Training failed.",
    });
  }
});

router.get("/train", (_req, res) => {
  res.json({
    models: Array.from(models.values()).map((m) => ({
      id: m.id,
      name: m.name,
      task: m.task,
      sizes: m.sizes,
      classes: m.classes,
      summary: m.summary,
      createdAt: m.createdAt,
    })),
  });
});

router.get("/train/:id", (req, res) => {
  const stored = models.get(req.params.id);
  if (!stored) return res.status(404).json({ error: "Model not found." });
  res.json({
    id: stored.id,
    name: stored.name,
    task: stored.task,
    sizes: stored.sizes,
    classes: stored.classes,
    summary: stored.summary,
    params: stored.model.toJSON(),
  });
});

router.post("/train/:id/predict", (req, res) => {
  const stored = models.get(req.params.id);
  if (!stored) return res.status(404).json({ error: "Model not found." });
  const input = req.body?.input;
  if (!Array.isArray(input) || !input.every((n: any) => typeof n === "number")) {
    return res.status(400).json({ error: "Provide an 'input' array of numbers." });
  }
  if (input.length !== stored.sizes[0]) {
    return res.status(400).json({ error: `Expected ${stored.sizes[0]} inputs, received ${input.length}.` });
  }
  const output = stored.model.predict(input);
  const result: Record<string, unknown> = { output };
  if (stored.task === "classify") {
    const best = output.indexOf(Math.max(...output));
    result.predictedIndex = best;
    result.predictedLabel = stored.classes ? stored.classes[best] : best;
    result.confidence = Number(output[best].toFixed(4));
  }
  res.json({ success: true, ...result });
});

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    cloudAI: isCloudAIConfigured(),
    hostedMesh: Boolean(process.env.THREED_HF_ENDPOINT),
    shapes: VOXEL_SHAPES.length,
    trainedModels: models.size,
  });
});

export default router;
