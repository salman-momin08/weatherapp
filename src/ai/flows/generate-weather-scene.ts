
'use server';
/**
 * @fileOverview A Genkit flow to generate a weather scene image.
 *
 * - generateWeatherScene - A function that generates an image representing weather conditions.
 * - GenerateWeatherSceneInput - The input type for the generateWeatherScene function.
 * - GenerateWeatherSceneOutput - The return type for the generateWeatherScene function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeatherSceneInputSchema = z.object({
  location: z.string().describe('The city or location for the weather scene.'),
  description: z
    .string()
    .describe('A description of the current weather conditions (e.g., "sunny", "cloudy with light rain").'),
});
export type GenerateWeatherSceneInput = z.infer<typeof GenerateWeatherSceneInputSchema>;

const GenerateWeatherSceneOutputSchema = z.object({
  imageUri: z.string().nullable().describe('The data URI of the generated image, or null if generation failed.'),
  reliability: z.string().nullable().describe('A brief note on the reliability or nature of the generated image.'),
});
export type GenerateWeatherSceneOutput = z.infer<typeof GenerateWeatherSceneOutputSchema>;

export async function generateWeatherScene(
  input: GenerateWeatherSceneInput
): Promise<GenerateWeatherSceneOutput> {
  return generateWeatherSceneFlow(input);
}

// Define the prompt for image generation
const imagePrompt = ai.definePrompt({
  name: 'weatherImagePrompt',
  input: { schema: GenerateWeatherSceneInputSchema },
  // We expect a media output, but Genkit's `generate` with image models will give media directly.
  // The output schema here is more for documenting what our flow returns.
  output: { schema: GenerateWeatherSceneOutputSchema }, 
  prompt: `Generate a vibrant, high-quality photographic background image. The image should depict a typical scene for "{{description}}" weather conditions in the city of "{{location}}". Ensure the image is suitable as a wallpaper, focusing on realistic atmospheric effects and common landscapes or cityscapes relevant to the location and weather. Avoid any text, watermarks, or overlays on the image.`,
});


const generateWeatherSceneFlow = ai.defineFlow(
  {
    name: 'generateWeatherSceneFlow',
    inputSchema: GenerateWeatherSceneInputSchema,
    outputSchema: GenerateWeatherSceneOutputSchema,
  },
  async (input) => {
    try {
      const promptText = `Generate a vibrant, high-quality photographic background image. The image should depict a typical scene for "${input.description}" weather conditions in the city of "${input.location}". Ensure the image is suitable as a wallpaper, focusing on realistic atmospheric effects and common landscapes or cityscapes relevant to the location and weather. Avoid any text, watermarks, or overlays on the image.`;

      const {mediaArr} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', // Ensure this model is appropriate and available
        prompt: promptText,
        config: {
          responseModalities: ['IMAGE', 'TEXT'], // Important: Request IMAGE modality
        },
      });
      
      const media = mediaArr?.[0]; // Assuming the first media item is the image

      if (media?.url) {
        return {
          imageUri: media.url,
          reliability: 'AI Generated Scene',
        };
      } else {
        console.warn('Image generation did not return a valid media URL.');
        return {
          imageUri: null,
          reliability: 'Image generation failed or returned no URL.',
        };
      }
    } catch (error) {
      console.error('Error in generateWeatherSceneFlow:', error);
      return {
        imageUri: null,
        reliability: 'Image generation encountered an error.',
      };
    }
  }
);
