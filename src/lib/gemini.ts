import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY as string;

// Ensure API key is present
if (!apiKey) {
    console.warn("Missing NEXT_PUBLIC_GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenerativeAI(apiKey || "dummy_key");

export const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
});
