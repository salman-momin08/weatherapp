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
  imageUri: z.string().describe('The data URI of the generated image.'),
  reliability: z.string().describe('Information about the reliability of the generated image.'),
});
export type GenerateWeatherSceneOutput = z.infer<typeof GenerateWeatherSceneOutputSchema>;

export async function generateWeatherScene(input: GenerateWeatherSceneInput): Promise<GenerateWeatherSceneOutput> {
  return generateWeatherSceneFlow(input);
}

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
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate an image representing a typical weather scene for the location: ${input.location}`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const reliability = 'The image is AI-generated and may not perfectly represent the actual weather conditions or typical scenes for the location. Use with caution.';

    return {
      imageUri: media.url,
      reliability: reliability,
    };
  }
);
