import { z } from 'zod'

// Schema para query params do ranking
export const rankingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
})

// ===== Response schema (para documentação OpenAPI) =====

export const rankingResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      status: z.string(),
      criticalEventsCount: z.number().int().min(0),
      recentCriticalCount: z.number().int().min(0),
      lastCriticalEventAt: z.date().nullable(),
    }),
  ),
})

export type RankingInput = z.infer<typeof rankingSchema>
