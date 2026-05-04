import { z } from 'src/lib/schemas/zod'
import { CLUB_DECISION_STATUSES, REJECTED_CLUB_STATUS } from 'src/common/constants/club-status'

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

export const PendingClubDecisionSchema = z
  .object({
    status: z.enum(CLUB_DECISION_STATUSES),
    reject_reason: z.string().trim().max(300).optional(),
    is_official_verified: z.boolean(),
  })
  .superRefine(({ status, reject_reason }, ctx) => {
    if (status === REJECTED_CLUB_STATUS && !reject_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['reject_reason'],
        message: 'reject_reason is required when status is REJECTED',
      })
    }
  })
  .openapi('PendingClubDecision')

export type PendingClubDecision = z.infer<typeof PendingClubDecisionSchema>

export const PendingClubDecisionResponseSchema = z
  .object({
    success: z.literal(true),
    message: z.string(),
    data: z.object({
      club_uuid: z.string().uuid(),
      status: z.enum(CLUB_DECISION_STATUSES),
      processed_at: z.string(),
    }),
  })
  .openapi('PendingClubDecisionResponse')

export type PendingClubDecisionResponse = z.infer<typeof PendingClubDecisionResponseSchema>
