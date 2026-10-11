import { GoogleGenAI } from "@google/genai";

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  provider: string;
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "devforge-ide" } },
    });
  }
  return geminiClient;
}

/**
 * Free cloud text generation shared by every server feature.
 *
 * Tries the primary cloud integration first, then the secondary free
 * low-latency provider. Throws only when no cloud provider is reachable so
 * callers can decide whether to fall back to a deterministic local engine.
 * Provider/model details stay on the server and are never returned to the UI.
 */
export async function generateText(
  messages: ChatMsg[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();
  const conversation = messages.filter((m) => m.role !== "system");

  // Primary cloud provider.
  const gemini = getGeminiClient();
  if (gemini) {
    try {
      const contents = conversation
        .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
        .join("\n\n");
      const response = await gemini.models.generateContent({
        model: options.model || "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction: system || undefined,
          temperature: options.temperature ?? 0.4,
          ...(options.json ? { responseMimeType: "application/json" } : {}),
        },
      });
      const text = (response.text || "").trim();
      if (text) return { text, provider: "cloud" };
    } catch (error) {
      console.warn(
        "[ai] primary provider unavailable:",
        error instanceof Error ? error.message : error
      );
    }
  }

  // Secondary free provider.
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
          "User-Agent": "devforge-ide",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.maxTokens ?? 4096,
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return { text, provider: "cloud" };
      } else {
        console.warn("[ai] secondary provider error:", response.status);
      }
    } catch (error) {
      console.warn(
        "[ai] secondary provider unavailable:",
        error instanceof Error ? error.message : error
      );
    }
  }

  throw new Error("No AI provider is currently reachable.");
}

export function isCloudAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}
