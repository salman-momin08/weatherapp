
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

// This defined prompt is not directly used by the flow below, which calls ai.generate directly.
// It's kept for potential future use or as a reference.
const imagePrompt = ai.definePrompt({
  name: 'weatherImagePrompt',
  input: { schema: GenerateWeatherSceneInputSchema },
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

      console.log('Attempting image generation with input:', JSON.stringify(input));

      const generationResult = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: promptText,
        config: {
          responseModalities: ['TEXT', 'IMAGE'], // Adjusted order, ensure both are present
          safetySettings: [ // Added permissive safety settings for debugging
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            // Not all models support HARM_CATEGORY_CIVIC_INTEGRITY. If errors occur, comment this line out.
            // { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
          ],
        },
      });
      
      console.log('Raw image generation result:', JSON.stringify(generationResult, null, 2));

      // The Genkit image generation example uses `const {media} = await ai.generate(...)`
      // However, to be safe and handle potential variations, we check `mediaArr` first, then `media`.
      let mediaContent;
      if (generationResult.mediaArr && generationResult.mediaArr.length > 0) {
        mediaContent = generationResult.mediaArr[0];
      } else if (generationResult.media) {
        mediaContent = generationResult.media;
      }

      console.log('Extracted media content:', JSON.stringify(mediaContent, null, 2));

      if (mediaContent?.url) {
        return {
          imageUri: mediaContent.url,
          reliability: 'AI Generated Scene',
        };
      } else {
        console.warn('Image generation did not return a valid media URL. Media object was:', JSON.stringify(mediaContent, null, 2));
        return {
          imageUri: null,
          reliability: 'Image generation failed or returned no URL.',
        };
      }
    } catch (error) {
      console.error('Error in generateWeatherSceneFlow:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if ((error as any).details) {
          console.error('Genkit error details:', JSON.stringify((error as any).details, null, 2));
        }
      }
      return {
        imageUri: null,
        reliability: 'Image generation encountered an error. Check server logs for details.',
      };
    }
  }
);

