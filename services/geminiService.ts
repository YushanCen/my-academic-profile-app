
import { GoogleGenAI } from "@google/genai";

export async function optimizeBio(bio: string): Promise<string> {
  try {
    // Instantiate right before making an API call to ensure the latest injected API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rewrite the following academic bio to be more professional, concise, and impactful for a faculty homepage: "${bio}"`,
    });
    return response.text || bio;
  } catch (error) {
    console.error("Gemini Error:", error);
    return bio;
  }
}

export async function suggestResearchInterests(currentInterests: string[]): Promise<string[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Given these research interests: ${currentInterests.join(', ')}, suggest 3 more specific and modern academic keywords or areas. Return only the 3 keywords separated by commas.`,
    });
    const result = response.text || "";
    return result.split(',').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
}
