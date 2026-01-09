"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);

const prompt = `
  Analyze this image of a lecture whiteboard or slide. 
  Extract the educational content and structure it into a JSON object.
  The JSON structure should be:
  {
    "title": "A short, descriptive title",
    "subject": "The academic subject (e.g., Computer Science, Calculus, History)",
    "summary": "A concise summary of the concepts shown (max 3 sentences)",
    "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
    "quiz": [
      {
        "question": "A multiple choice question based on the content",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0 // Index of the correct option (0-3)
      }
    ]
  }
  Do not include markdown formatting or backticks in the response, just the raw JSON string.
`;

export async function generateLectureNotes(imageBase64: string) {
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Fallback order: Flash (Fastest) -> Pro (Smarter) -> Pro Vision (Legacy/Stable)
  //, "gemini-1.5-pro-001" , "gemini-1.5-flash-001"
  //"gemini-pro-vision", "gemini-1.5-flash", "gemini-1.5-pro"
  // We use the specific versions to avoid alias 404s on some keys
  const modelsToTry = ["gemini-2.0-flash"];

  let lastError;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      if (!text) throw new Error("Empty response from AI");

      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanText);

    } catch (error: any) {
      console.error(`Failed with ${modelName}:`, error.message);
      lastError = error;
      // Continue to next model
      continue;
    }
  }

  // All failed - Diagnostic Step
  console.error("All vision models failed. Running diagnostic...");
  let diagnosticMsg = "";

  try {
    // 1. Check Text Generation (Basic Permission)
    const diagModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    await diagModel.generateContent("Hello?");
    diagnosticMsg += "\n[Pass] Basic Text Generation works.";
  } catch (e: any) {
    diagnosticMsg += `\n[Fail] Basic Text Generation failed: ${e.message}`;
  }

  try {
    // 2. List Available Models (The User Request)
    // We use a direct fetch because the SDK's list method might vary
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    if (data.models) {
      const modelNames = data.models.map((m: any) => m.name.replace("models/", "")).join(", ");
      diagnosticMsg += `\n[Info] Available Models for your Key: ${modelNames}`;
    } else {
      diagnosticMsg += `\n[Fail] Could not list models. Response: ${JSON.stringify(data)}`;
    }
  } catch (e: any) {
    diagnosticMsg += `\n[Fail] ListModels request failed: ${e.message}`;
  }

  console.error("Diagnostic Result:", diagnosticMsg);

  throw new Error(`AI Connection Failed. \n${diagnosticMsg}\n\nLast Error: ${lastError?.message}`);
}
