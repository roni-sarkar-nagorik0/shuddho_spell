import { z } from 'zod';
import {
  DEMO_SPEECH_MODES,
  type IDemoSpeechScore,
} from '../../application/dto/demo-speech-score';

/**
 * `POST /api/v1/demo/speech`.
 *
 * **A transcript, and never audio.** `07-speech-scoring.md` requires that the
 * server holds no recording of anybody's voice, and this schema is where that
 * is enforced rather than intended: there is no field a browser could put a
 * blob in, so there is no path by which one arrives.
 *
 * The ceiling is 300 characters. A spoken sentence is a dozen words; the
 * headroom is for a recogniser that heard the room, and the cap is what stops
 * an anonymous endpoint being handed a novel.
 */
export const demoSpeechBodySchema = z.object({
  wordId: z.string().uuid(),
  transcript: z.string().max(300),
  mode: z.enum(DEMO_SPEECH_MODES),
});

export type IDemoSpeechBody = z.infer<typeof demoSpeechBodySchema>;

const diagnosisSchema = z.object({
  expected: z.string(),
  heard: z.string(),
  articulationFix: z.string(),
});

export const demoSpeechScoreSchema = z.object({
  mode: z.enum(DEMO_SPEECH_MODES),
  scorePercent: z.number().nullable(),
  transcript: z.string(),
  heard: z.string(),
  isNotHeard: z.boolean(),
  isClean: z.boolean(),
  diagnoses: z.array(diagnosisSchema),
  sentence: z
    .object({
      usesTheWord: z.boolean(),
      wordCount: z.number(),
      isSentenceLength: z.boolean(),
    })
    .nullable(),
});

const _schemaMatchesContract: z.ZodType<IDemoSpeechScore> = demoSpeechScoreSchema;
void _schemaMatchesContract;
