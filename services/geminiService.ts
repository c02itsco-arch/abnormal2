import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Transaction } from "../types";

// Initialize Gemini with the strictly required process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends transaction data to Gemini to identify anomalies.
 * We limit the context to prevent token overflow for large CSVs in this demo.
 */
export const analyzeAnomalies = async (data: Transaction[]): Promise<AnalysisResult> => {
  try {
    // Model selection based on task complexity (Data Analysis)
    const modelName = 'gemini-2.5-flash';

    // Prepare a subset of data to ensure we don't exceed token limits for the demo
    // In a production app, we might aggregate or batch this.
    const sampleData = data.slice(0, 700).map(t => ({
      id: t.id,
      actCode: t.actCode,
      monthly: t.monthly,
      amount: t.amount
    }));

    const prompt = `
      Analyze the provided financial transaction JSON data.
      Your task is to detect anomalies in the 'amount' field.
      
      Look for:
      1. Outliers: Amounts that are significantly higher or lower than the average for the same 'actCode'.
      2. Irregularities: Unusual spikes based on 'monthly' trends.
      
      Return a JSON object containing:
      - "anomalies": An array of the top 10 most suspicious transactions. Each item must have:
        - "transactionId": The exact 'id' from the input.
        - "reason": A short, clear explanation of why it is anomalous (e.g., "Amount is 10x higher than average for actCode 41039160").
        - "severity": "HIGH", "MEDIUM", or "LOW".
      - "summary": A brief paragraph summarizing the overall data quality and key findings.
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
                  transactionId: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
                },
                required: ["transactionId", "reason", "severity"],
              },
            },
            summary: { type: Type.STRING },
          },
          required: ["anomalies", "summary"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response from Gemini.");
    }

    const parsed = JSON.parse(resultText) as AnalysisResult;
    return parsed;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze data with Gemini. Please check your API Key and try again.");
  }
};