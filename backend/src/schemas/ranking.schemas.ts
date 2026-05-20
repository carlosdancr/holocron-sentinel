import { z } from 'zod'

// Schema para query params do ranking
export const rankingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

export type RankingInput = z.infer<typeof rankingSchema>
