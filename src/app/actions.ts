"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(apiKey);

const prompt = `
  Analyze the provided image(s) of a lecture whiteboard or slide acting as an expert academic tutor.
  If multiple images are provided, treat them as sequential pages/slides of the same lecture.
  
  Extract the educational content and structure it into a JSON object.
  The JSON structure should be:
  {
    "title": "A short, descriptive title",
    "subject": "The academic subject (e.g., Computer Science, Calculus, History)",
    "summary": "A comprehensive, detailed summary of the lecture content. Explain the concepts thoroughly as if teaching a student. (Min 2 paragraphs)",
    "keyPoints": ["Detailed Point 1", "Detailed Point 2", "Detailed Point 3", "Detailed Point 4", "Detailed Point 5"],
    "quiz": [
      {
        "question": "A challenging multiple choice question testing conceptual understanding",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0 // Index of the correct option (0-3)
      }
    ]
  }

  IMPORTANT REQUIREMENTS:
  1. Generate AT LEAST 5 unique quiz questions.
  2. The summary must be detailed and educational, not just a brief overview.
  3. Key points should be substantive statements, not short phrases.
  4. Do not include markdown formatting or backticks in the response, just the raw JSON string.
`;

export async function generateLectureNotes(imagesBase64: string | string[]) {
  try {
    if (!apiKey) {
      return { success: false, error: "Gemini API Key is missing. Please check Vercel Environment Variables." };
    }

    // Ensure array
    const imageList = Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64];
    const parts: any[] = [{ text: prompt }];

    imageList.forEach((img) => {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg",
        },
      });
    });

    const modelsToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
          const data = JSON.parse(cleanText);
          return { success: true, data };
        } catch (parseError) {
          console.error("JSON Parse Error:", text);
          continue;
        }

      } catch (error: any) {
        console.error(`Failed with ${modelName}:`, error.message);
        lastError = error;
        continue;
      }
    }

    // Diagnostic if all fail
    let diagnosticMsg = "";
    try {
      const basicModel = genAI.getGenerativeModel({ model: "gemini-pro" });
      await basicModel.generateContent("test");
    } catch (testError: any) {
      if (testError.message.includes("API key not valid")) {
        return { success: false, error: "Invalid API Key. Please update NEXT_PUBLIC_GEMINI_API_KEY in Vercel." };
      }
      diagnosticMsg = testError.message;
    }

    return { success: false, error: `AI Generation Failed. All models failed. Last error: ${lastError?.message || 'Unknown'}. Diag: ${diagnosticMsg}` };

  } catch (fatalError: any) {
    console.error("Fatal Server Action Error:", fatalError);
    return { success: false, error: `Server Error: ${fatalError.message}` };
  }
}
