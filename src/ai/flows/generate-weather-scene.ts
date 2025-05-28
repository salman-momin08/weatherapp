// 'use server'
'use server';

/**
 * @fileOverview Generates weather scene images based on location for app backgrounds.
 *
 * - generateWeatherScene - A function that generates weather scenes.
 * - GenerateWeatherSceneInput - The input type for the generateWeatherScene function.
 * - GenerateWeatherSceneOutput - The return type for the generateWeatherScene function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWeatherSceneInputSchema = z.object({
  location: z.string().describe('The location for which to generate a weather scene.'),
});
export type GenerateWeatherSceneInput = z.infer<typeof GenerateWeatherSceneInputSchema>;

const GenerateWeatherSceneOutputSchema = z.object({
  imageUri: z.string().describe('The data URI of the generated image. Can be empty if generation fails.'),
  reliability: z.string().describe('Information about the reliability of the generated image.'),
});
export type GenerateWeatherSceneOutput = z.infer<typeof GenerateWeatherSceneOutputSchema>;

export async function generateWeatherScene(input: GenerateWeatherSceneInput): Promise<GenerateWeatherSceneOutput> {
  return generateWeatherSceneFlow(input);
}

// This prompt is defined but not directly used by the generateWeatherSceneFlow below,
// as the flow constructs its own call to ai.generate.
// It's kept here for potential future use or as a reference.
const prompt = ai.definePrompt({
  name: 'generateWeatherScenePrompt',
  input: {schema: GenerateWeatherSceneInputSchema},
  output: {schema: GenerateWeatherSceneOutputSchema},
  prompt: `Generate an image representing a typical weather scene for the location: {{{location}}}. Also, provide information about the reliability and potential issues with the generated image. Return the image as a data URI and reliability information.`,
});

const generateWeatherSceneFlow = ai.defineFlow(
  {
    name: 'generateWeatherSceneFlow',
    inputSchema: GenerateWeatherSceneInputSchema,
    outputSchema: GenerateWeatherSceneOutputSchema,
  },
  async (input: GenerateWeatherSceneInput): Promise<GenerateWeatherSceneOutput> => {
    let imageUri = ''; // Default to empty string
    let reliabilityMessage = 'The image is AI-generated and may not perfectly represent the actual weather conditions or typical scenes for the location. Use with caution.';

    try {
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: `Generate an image representing a typical weather scene for the location: ${input.location}`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      if (media && media.url) {
        imageUri = media.url;
      } else {
        // Image generation failed or no image was returned by the model
        console.warn(`AI Scene generation warning: No media.url returned for location: ${input.location}`);
        reliabilityMessage = 'AI could not generate a weather scene image for this location. Displaying default background.';
      }
    } catch (error) {
      console.error(`Error during AI image generation for location ${input.location}:`, error);
      reliabilityMessage = 'An error occurred while trying to generate the AI weather scene. Displaying default background.';
      // imageUri remains empty string
    }

    return {
      imageUri: imageUri,
      reliability: reliabilityMessage,
    };
  }
);
