import { z } from 'zod';

export const defaultAiSafeguard = {
  id: 'default-original-task-aware',
  name: 'Default task-aware generation',
  readonly: true,
  guidelines:
    'Treat user input as instructions when it is phrased as a task, such as "write", "create", "draft", "summarize", or "generate". Do not quote or summarize the instruction itself as the final content. Produce the requested content. Keep output original, avoid close paraphrasing of third-party wording, avoid unsupported factual claims, respect the selected source safety type, require alt text for images, and keep WordPress publishing as draft unless explicitly confirmed.'
} as const;

export const aiSafeguardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  guidelines: z.string().min(20),
  readonly: z.boolean().default(false)
});

export const aiSafeguardsSchema = z.array(aiSafeguardSchema).min(1);

export type AiSafeguard = z.infer<typeof aiSafeguardSchema>;

export function normalizeAiSafeguards(value?: AiSafeguard[] | null) {
  const customSafeguards = (value ?? []).filter((item) => item.id !== defaultAiSafeguard.id);
  const safeguards = aiSafeguardsSchema.parse([
    defaultAiSafeguard,
    ...customSafeguards.map((item) => ({
      ...item,
      readonly: false
    }))
  ]);

  return safeguards;
}

export function resolveSelectedSafeguard(safeguards: AiSafeguard[], selectedId?: string | null) {
  return safeguards.find((item) => item.id === selectedId) ?? safeguards[0] ?? defaultAiSafeguard;
}
