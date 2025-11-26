import { GoogleGenAI } from "@google/genai";
import { AspectRatio } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_NAME = 'gemini-2.5-flash-image';

/**
 * Generates an image from a text prompt.
 */
export const generateImage = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          // Gemini Flash Image handles resolution automatically, defaulting to reasonable quality
        }
      }
    });

    // Extract image
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data returned from Gemini.");
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate image.");
  }
};

/**
 * Edits an image based on visual context (masked area) and a prompt.
 * We overlay the mask on the image to guide the model, as 2.5 Flash Image 
 * works best with visual cues in the input image for specific edits.
 */
export const editImageWithMask = async (
  originalImageBase64: string, 
  maskedImageBase64: string, 
  prompt: string
): Promise<string> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  try {
    // Strip headers for API usage
    const base64Data = maskedImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: 'image/png',
            },
          },
          {
            // We guide the model to look at the visual cue provided by the mask (which we colorized in the UI component)
            text: `Edit the image. Focus on the area highlighted with the red translucent overlay. ${prompt}. Return the final image cleanly without the red overlay.`
          },
        ],
      },
      // Note: aspect ratio is inferred from input or defaults to 1:1 if not specified, 
      // but for editing we generally want to maintain the input. 
      // We do not strictly enforce aspect ratio config here to let the model follow the input image dimensions.
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No edited image returned.");
  } catch (error: any) {
    console.error("Gemini Edit Error:", error);
    throw new Error(error.message || "Failed to edit image.");
  }
};
