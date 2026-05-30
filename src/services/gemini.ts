import { GoogleGenAI } from "@google/genai";
import type { CorrectionResult } from "../types";

export const IMPROVE_PROMPT = `You are an expert English editor and communication assistant.
Your task is to improve the provided text while preserving its original meaning.

Rules:
- Fix grammar errors.
- Fix spelling mistakes.
- Fix punctuation.
- Improve sentence structure.
- Rewrite awkward phrases naturally.
- Improve clarity and readability.
- Maintain original intent.
- Do not add new information.
- Keep the same tone whenever possible.
- Remove repetition.
- Return only the corrected text.
- Do not include explanations.
- Do not include notes.
- Do not include quotation marks.
- Output only the final improved text.`;

export async function getGrammarCorrection(
  text: string,
  apiKey: string
): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error("No text provided for correction.");
  }

  const sanitized = text.trim().slice(0, 10000);

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: sanitized,
    config: {
      systemInstruction: IMPROVE_PROMPT,
      temperature: 0.3,
    },
  });

  const result = response.text;
  if (!result) throw new Error("Empty response from Gemini API.");
  return result.trim();
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    await getGrammarCorrection("Hello world.", apiKey);
    return true;
  } catch {
    return false;
  }
}

export function buildCorrectionResult(
  original: string,
  corrected: string
): CorrectionResult {
  return {
    original,
    corrected,
    timestamp: Date.now(),
  };
}
