
'use server';
/**
 * @fileOverview A Genkit flow to generate a weather scene image.
 * - generateWeatherScene - A function that handles weather scene image generation.
 * - GenerateWeatherSceneInput - The input type for the function.
 * - GenerateWeatherSceneOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeatherSceneInputSchema = z.object({
  locationName: z.string().describe('The name of the location (e.g., city, region).'),
  weatherDescription: z.string().describe('A brief description of the current weather (e.g., "clear sky", "light rain").'),
  temperature: z.number().describe('The current temperature in Celsius.'),
});
export type GenerateWeatherSceneInput = z.infer<typeof GenerateWeatherSceneInputSchema>;

const GenerateWeatherSceneOutputSchema = z.object({
  imageUri: z.string().describe("Data URI of the generated image (e.g., 'data:image/png;base64,...') or an empty string if generation failed."),
  prompt: z.string().describe('The prompt used for image generation.'),
  reliability: z.enum(['High', 'Medium', 'Low', 'Experimental', 'Unavailable']).describe('Confidence level in the relevance/quality of the generated image.'),
  modelUsed: z.string().optional().describe('The model used for generation.'),
});
export type GenerateWeatherSceneOutput = z.infer<typeof GenerateWeatherSceneOutputSchema>;


export async function generateWeatherScene(input: GenerateWeatherSceneInput): Promise<GenerateWeatherSceneOutput> {
  return generateWeatherSceneFlow(input);
}

const generateWeatherSceneFlow = ai.defineFlow(
  {
    name: 'generateWeatherSceneFlow',
    inputSchema: GenerateWeatherSceneInputSchema,
    outputSchema: GenerateWeatherSceneOutputSchema,
  },
  async (input) => {
    const promptText = `Generate a photorealistic image representing a typical weather scene for: ${input.locationName} with ${input.weatherDescription} and temperature around ${input.temperature}°C. Focus on the atmosphere and environment.`;
    let imageUri = '';
    let reliability: GenerateWeatherSceneOutput['reliability'] = 'Unavailable';
    let modelUsed: string | undefined = 'googleai/gemini-2.0-flash-exp';

    try {
      console.log("Attempting image generation with prompt:", promptText);
      const {media} = await ai.generate({
        model: modelUsed,
        prompt: promptText,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Important: Both TEXT and IMAGE
           safetySettings: [ // Permissive safety settings
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        },
      });

      console.log("Raw image generation result:", JSON.stringify(media, null, 2));


      if (media && media.url) {
        imageUri = media.url;
        reliability = 'Experimental'; // Since it's AI, reliability is often experimental
        console.log("Image generated successfully:", imageUri.substring(0,100) + "...");
      } else {
        console.warn("Image generation did not return a media object with a URL.");
        reliability = 'Unavailable';
      }
    } catch (error) {
      console.error("Error during image generation flow:", error);
      reliability = 'Unavailable';
    }

    return {
      imageUri: imageUri,
      prompt: promptText,
      reliability: reliability,
      modelUsed: modelUsed,
    };
  }
);
