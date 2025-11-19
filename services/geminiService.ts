import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Transaction } from "../types";

// Initialize Gemini with the strictly required process.env.API_KEY
// This variable is injected by Vite at build time via vite.config.ts
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to strip Markdown code blocks from the response text
 * e.g. ```json { ... } ``` -> { ... }
 */
const cleanJsonString = (text: string): string => {
  let clean = text.trim();
  // Remove opening ```json or ```
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '');
  }
  // Remove closing ```
  if (clean.endsWith('```')) {
    clean = clean.replace(/\s*```$/, '');
  }
  return clean;
};

/**
 * Sends transaction data to Gemini to identify anomalies.
 */
export const analyzeAnomalies = async (data: Transaction[]): Promise<AnalysisResult> => {
  try {
    // Model selection based on task complexity (Data Analysis)
    // Using 'gemini-2.5-flash' as requested for general text/analysis tasks
    const modelName = 'gemini-2.5-flash';

    // Prepare a subset of data to ensure we don't exceed token limits for the demo
    // We sanitize the data to only include relevant fields for analysis
    // Limit to 500 transactions to be safe with token limits on free tier/flash models
    const sampleData = data.slice(0, 500).map(t => ({
      id: t.id,
      actCode: t.actCode,
      monthly: t.monthly,
      amount: t.amount
    }));

    const prompt = `
      Analyze the provided financial transaction JSON data to detect anomalies in the 'amount' field.
      
      Rules:
      1. Identify **Outliers**: Amounts significantly deviating from the norm for a specific 'actCode'.
      2. Identify **Irregularities**: Unusual patterns or spikes across 'monthly' periods.
      3. Focus on the top 10 most significant anomalies.
      
      Return the response strictly as a JSON object adhering to the schema.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: JSON.stringify(sampleData) + "\n\n" + prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            anomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  transactionId: { type: Type.NUMBER, description: "The original id from input" },
                  reason: { type: Type.STRING, description: "Explanation of why this is anomalous" },
                  severity: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                },
                required: ["transactionId", "reason", "severity"],
              },
            },
            summary: { type: Type.STRING, description: "Executive summary of the findings" },
          },
          required: ["anomalies", "summary"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    // Clean markdown syntax if present before parsing
    const cleanedJson = cleanJsonString(resultText);
    const parsed = JSON.parse(cleanedJson) as AnalysisResult;
    return parsed;

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    // Handle potential API key issues or quota limits
    if (error.message?.includes('403') || error.message?.includes('API key')) {
        throw new Error("Invalid or missing API Key. Please check your Vercel environment variables.");
    }
    throw new Error("Failed to analyze data. " + (error.message || "Unknown error"));
  }
};