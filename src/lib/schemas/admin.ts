import { z } from 'src/lib/schemas/zod'

const PendingClubManagerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  student_id: z.string(),
})

const PendingClubSchema = z
  .object({
    uuid: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    affiliation: z.string(),
    short_description: z.string(),
    created_at: z.string(),
    manager: PendingClubManagerSchema,
  })
  .openapi('PendingClub')

export const PendingClubsResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
      total_count: z.number().int(),
      clubs: z.array(PendingClubSchema),
    }),
  })
  .openapi('PendingClubsResponse')

export type PendingClubsResponse = z.infer<typeof PendingClubsResponseSchema>
