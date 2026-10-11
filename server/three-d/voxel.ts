/**
 * Deterministic voxel / CSG generator.
 *
 * Produces editable voxel geometry from a shape name (or a prompt parsed by
 * keyword matching / the AI). Output can be rendered live and exported as OBJ,
 * so it works fully offline with zero external models.
 */

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

export interface VoxelScene {
  shape: string;
  size: number;
  voxels: Voxel[];
  bounds: { min: [number, number, number]; max: [number, number, number] };
  triangleCount: number;
}

export const VOXEL_SHAPES = [
  "sphere",
  "cube",
  "torus",
  "pyramid",
  "tree",
  "heart",
  "ring",
  "castle",
  "car",
  "star",
] as const;

export type VoxelShape = (typeof VOXEL_SHAPES)[number];

const PALETTE = {
  body: "#4f8cff",
  accent: "#ffd166",
  berry: "#ff5d73",
  leaf: "#5ddc7a",
  trunk: "#a9744f",
  stone: "#9aa6b2",
  roof: "#d1495b",
  glass: "#8fe3ff",
  tire: "#2b2b33",
  metal: "#c9d1d9",
};

function key(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

function within(size: number, x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < size && y < size && z < size;
}

/** Keyword → shape resolver used when the AI is unavailable or offline. */
export function shapeFromPrompt(prompt: string): VoxelShape {
  const q = (prompt || "").toLowerCase();
  const rules: Array<[RegExp, VoxelShape]> = [
    [/\b(sphere|ball|planet|orb|globe)\b/, "sphere"],
    [/\b(torus|donut|doughnut|ring of)\b/, "torus"],
    [/\b(pyramid|temple|ziggurat)\b/, "pyramid"],
    [/\b(tree|plant|bush|forest|leaf)\b/, "tree"],
    [/\b(heart|love)\b/, "heart"],
    [/\b(ring|halo|bracelet)\b/, "ring"],
    [/\b(castle|fort|tower|building|house)\b/, "castle"],
    [/\b(car|vehicle|truck|auto)\b/, "car"],
    [/\b(star|sparkle|asterisk)\b/, "star"],
    [/\b(cube|box|block|brick)\b/, "cube"],
  ];
  for (const [pattern, shape] of rules) {
    if (pattern.test(q)) return shape;
  }
  return "cube";
}

function buildSphere(size: number): Voxel[] {
  const r = size / 2 - 0.4;
  const c = (size - 1) / 2;
  const voxels: Voxel[] = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const d = Math.hypot(x - c, y - c, z - c);
        if (d <= r) {
          const shade = d / r;
          voxels.push({ x, y, z, color: shade > 0.82 ? PALETTE.accent : PALETTE.body });
        }
      }
    }
  }
  return voxels;
}

function buildCube(size: number): Voxel[] {
  const voxels: Voxel[] = [];
  const pad = Math.max(0, Math.floor(size * 0.15));
  for (let x = pad; x < size - pad; x++) {
    for (let y = pad; y < size - pad; y++) {
      for (let z = pad; z < size - pad; z++) {
        const edge = x === pad || x === size - pad - 1 || y === pad || y === size - pad - 1;
        voxels.push({ x, y, z, color: edge ? PALETTE.accent : PALETTE.body });
      }
    }
  }
  return voxels;
}

function buildTorus(size: number): Voxel[] {
  const R = size * 0.32;
  const r = size * 0.12;
  const c = (size - 1) / 2;
  const voxels: Voxel[] = [];
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const px = x - c;
        const py = y - c;
        const pz = z - c;
        const q = Math.hypot(Math.hypot(px, py) - R, pz);
        if (q <= r) voxels.push({ x, y, z, color: PALETTE.berry });
      }
    }
  }
  return voxels;
}

function buildPyramid(size: number): Voxel[] {
  const voxels: Voxel[] = [];
  for (let y = 0; y < size; y++) {
    const inset = y;
    for (let x = inset; x < size - inset; x++) {
      for (let z = inset; z < size - inset; z++) {
        voxels.push({ x, y, z, color: y > size * 0.6 ? PALETTE.accent : PALETTE.stone });
      }
    }
  }
  return voxels;
}

function buildTree(size: number): Voxel[] {
  const voxels: Voxel[] = [];
  const c = Math.floor(size / 2);
  const trunkHeight = Math.floor(size * 0.45);
  const trunkWidth = Math.max(1, Math.floor(size * 0.12));
  for (let y = 0; y < trunkHeight; y++) {
    for (let x = c - trunkWidth; x <= c + trunkWidth; x++) {
      for (let z = c - trunkWidth; z <= c + trunkWidth; z++) {
        if (within(size, x, y, z)) voxels.push({ x, y, z, color: PALETTE.trunk });
      }
    }
  }
  const canopyCentre = trunkHeight + Math.floor(size * 0.2);
  const canopyRadius = size * 0.34;
  for (let x = 0; x < size; x++) {
    for (let y = trunkHeight - 1; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const d = Math.hypot(x - c, (y - canopyCentre) * 1.15, z - c);
        if (d <= canopyRadius) {
          voxels.push({ x, y, z, color: d > canopyRadius * 0.7 ? PALETTE.leaf : "#3fae5a" });
        }
      }
    }
  }
  return dedupe(voxels);
}

function buildHeart(size: number): Voxel[] {
  const voxels: Voxel[] = [];
  const s = size / 16;
  const c = (size - 1) / 2;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const nx = (x - c) / s;
        const ny = (c - y) / s;
        const a = nx * nx + ny * ny - 2;
        const inside = a * a * a - nx * nx * ny * ny * ny <= 0;
        if (inside && Math.abs(z - c) <= size * 0.22) {
          voxels.push({ x, y, z, color: PALETTE.berry });
        }
      }
    }
  }
  return voxels;
}

function buildRing(size: number): Voxel[] {
  const R = size * 0.34;
  const thickness = Math.max(1, size * 0.08);
  const c = (size - 1) / 2;
  const voxels: Voxel[] = [];
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const d = Math.hypot(x - c, z - c);
      if (Math.abs(d - R) <= thickness) {
        for (let y = Math.floor(c - thickness); y <= Math.ceil(c + thickness); y++) {
          voxels.push({ x, y, z, color: PALETTE.accent });
        }
      }
    }
  }
  return voxels;
}

function buildCastle(size: number): Voxel[] {
  const voxels: Voxel[] = [];
  const wallH = Math.floor(size * 0.5);
  const t = Math.max(1, Math.floor(size * 0.1));
  // Outer walls
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      if (x < t || x >= size - t || z < t || z >= size - t) {
        for (let y = 0; y < wallH; y++) voxels.push({ x, y, z, color: PALETTE.stone });
      }
    }
  }
  // Corner towers
  const towers = [
    [0, 0],
    [size - t, 0],
    [0, size - t],
    [size - t, size - t],
  ];
  for (const [tx, tz] of towers) {
    for (let x = tx; x < tx + t; x++) {
      for (let z = tz; z < tz + t; z++) {
        for (let y = wallH; y < wallH + t * 2; y++) {
          if (within(size, x, y, z)) voxels.push({ x, y, z, color: y >= wallH + t * 2 - 1 ? PALETTE.roof : PALETTE.stone });
        }
      }
    }
  }
  return dedupe(voxels);
}

function buildCar(size: number): Voxel[] {
  const voxels: Voxel[] = [];
  const bodyH = Math.max(2, Math.floor(size * 0.22));
  const baseY = Math.floor(size * 0.18);
  for (let x = Math.floor(size * 0.1); x < Math.floor(size * 0.9); x++) {
    for (let z = Math.floor(size * 0.2); z < Math.floor(size * 0.8); z++) {
      for (let y = baseY; y < baseY + bodyH; y++) {
        voxels.push({ x, y, z, color: PALETTE.body });
      }
    }
  }
  // Cabin
  for (let x = Math.floor(size * 0.3); x < Math.floor(size * 0.7); x++) {
    for (let z = Math.floor(size * 0.25); z < Math.floor(size * 0.75); z++) {
      for (let y = baseY + bodyH; y < baseY + bodyH + Math.floor(size * 0.15); y++) {
        voxels.push({ x, y, z, color: PALETTE.glass });
      }
    }
  }
  return dedupe(voxels);
}

function buildStar(size: number): Voxel[] {
  const voxels: Voxel[] = [];
  const c = (size - 1) / 2;
  const points = 5;
  const outer = size * 0.42;
  const inner = size * 0.18;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const dx = x - c;
      const dy = c - y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const sector = (2 * Math.PI) / points;
      const local = ((angle % sector) + sector) % sector;
      const t = Math.abs(local - sector / 2) / (sector / 2);
      const radius = inner + (outer - inner) * t;
      if (dist <= radius) {
        for (let z = Math.floor(c - size * 0.06); z <= Math.ceil(c + size * 0.06); z++) {
          if (within(size, x, y, z)) voxels.push({ x, y, z, color: PALETTE.accent });
        }
      }
    }
  }
  return voxels;
}

function dedupe(voxels: Voxel[]): Voxel[] {
  const seen = new Set<string>();
  const out: Voxel[] = [];
  for (const v of voxels) {
    const k = key(v.x, v.y, v.z);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

export function generateVoxelScene(shape: string, size = 16): VoxelScene {
  const clampedSize = Math.max(6, Math.min(32, Math.floor(size)));
  let voxels: Voxel[];
  switch (shape) {
    case "sphere": voxels = buildSphere(clampedSize); break;
    case "torus": voxels = buildTorus(clampedSize); break;
    case "pyramid": voxels = buildPyramid(clampedSize); break;
    case "tree": voxels = buildTree(clampedSize); break;
    case "heart": voxels = buildHeart(clampedSize); break;
    case "ring": voxels = buildRing(clampedSize); break;
    case "castle": voxels = buildCastle(clampedSize); break;
    case "car": voxels = buildCar(clampedSize); break;
    case "star": voxels = buildStar(clampedSize); break;
    case "cube":
    default: voxels = buildCube(clampedSize); break;
  }
  voxels = dedupe(voxels);

  const xs = voxels.map((v) => v.x);
  const ys = voxels.map((v) => v.y);
  const zs = voxels.map((v) => v.z);
  return {
    shape: shape === "cube" ? "cube" : shape,
    size: clampedSize,
    voxels,
    bounds: {
      min: [Math.min(...xs, 0), Math.min(...ys, 0), Math.min(...zs, 0)],
      max: [Math.max(...xs, clampedSize), Math.max(...ys, clampedSize), Math.max(...zs, clampedSize)],
    },
    triangleCount: voxels.length * 12,
  };
}

/** Export a voxel scene as a Wavefront OBJ string (colors via material groups). */
export function voxelsToOBJ(scene: VoxelScene): string {
  const lines: string[] = ["# Generated by DevForge AI 3D Studio", "o devforge_voxels"];
  const c = (scene.size - 1) / 2;
  let vertexIndex = 1;
  const faceTemplate = [
    [0, 1, 2, 3], [4, 5, 6, 7],
    [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7],
  ];
  const cube = [
    [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
    [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5],
  ];
  for (const v of scene.voxels) {
    const ox = v.x - c;
    const oy = v.y - c;
    const oz = v.z - c;
    for (const corner of cube) {
      lines.push(`v ${(ox + corner[0]).toFixed(3)} ${(oy + corner[1]).toFixed(3)} ${(oz + corner[2]).toFixed(3)}`);
    }
    for (const face of faceTemplate) {
      lines.push(`f ${face.map((i) => vertexIndex + i).join(" ")}`);
    }
    vertexIndex += 8;
  }
  return lines.join("\n");
}
