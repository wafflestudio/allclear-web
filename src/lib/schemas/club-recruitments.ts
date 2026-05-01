import {
  CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES,
  REGULAR_MEETING_DAYS,
} from 'src/common/constants/club-recruitment'
import { z } from 'src/lib/schemas/zod'

const TimestampStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid datetime string',
  })

const BooleanInputSchema = z.preprocess((value) => {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return value
}, z.boolean())

const TrimmedStringSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return ''
  }
  return typeof value === 'string' ? value.trim() : value
}, z.string())

const NullableTrimmedStringSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  z.string().trim().nullable(),
)

export const RegularMeetingSchema = z
  .object({
    id: z.string().regex(/^\d+$/).optional(),
    dayOfWeek: z.enum(REGULAR_MEETING_DAYS),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
  })
  .openapi('RegularMeeting')

export const ClubRecruitmentParamsSchema = z
  .object({
    uuid: z.string().uuid(),
  })
  .openapi('ClubRecruitmentParams')

export const ClubRecruitmentIdParamsSchema = z
  .object({
    uuid: z.string().uuid(),
    recruitmentId: z.string().regex(/^\d+$/),
  })
  .openapi('ClubRecruitmentIdParams')

export const UpsertClubRecruitmentSchema = z
  .object({
    title: TrimmedStringSchema,
    deadline: TimestampStringSchema,
    isMandatory: BooleanInputSchema,
    hasRegularMeeting: BooleanInputSchema,
    regularMeetings: z
      .array(RegularMeetingSchema.omit({ id: true }))
      .optional()
      .default([]),
    activityLocationType: z.enum(CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES),
    activityLocationText: TrimmedStringSchema,
    hasEligibility: BooleanInputSchema,
    eligibilityText: TrimmedStringSchema,
    hasCapacityLimit: BooleanInputSchema,
    capacityLimitText: TrimmedStringSchema,
    hasMembershipFee: BooleanInputSchema,
    membershipFeeText: TrimmedStringSchema,
    applicationUrl: TrimmedStringSchema,
    applicationProcess: TrimmedStringSchema,
    fullRecruitmentText: NullableTrimmedStringSchema,
    imageUrls: z.array(z.string()).optional().default([]),
  })
  .openapi('UpsertClubRecruitment')

export type UpsertClubRecruitment = z.infer<typeof UpsertClubRecruitmentSchema>

export const ClubRecruitmentSchema = z
  .object({
    id: z.string().regex(/^\d+$/),
    clubId: z.string().uuid(),
    title: z.string(),
    deadline: z.string(),
    isMandatory: z.boolean(),
    hasRegularMeeting: z.boolean(),
    regularMeetings: z.array(RegularMeetingSchema.required({ id: true })),
    activityLocationType: z.enum(CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES),
    activityLocationText: z.string(),
    hasEligibility: z.boolean(),
    eligibilityText: z.string(),
    hasCapacityLimit: z.boolean(),
    capacityLimitText: z.string(),
    hasMembershipFee: z.boolean(),
    membershipFeeText: z.string(),
    applicationUrl: z.string(),
    applicationProcess: z.string(),
    fullRecruitmentText: z.string().nullable(),
    imageUrls: z.array(z.string()),
    yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('ClubRecruitment')

export type ClubRecruitmentDto = z.infer<typeof ClubRecruitmentSchema>

export const ClubRecruitmentsResponseSchema = z
  .object({
    recruitments: z.array(ClubRecruitmentSchema),
    totalSize: z.number().int(),
  })
  .openapi('ClubRecruitmentsResponse')

export type ClubRecruitmentsResponse = z.infer<typeof ClubRecruitmentsResponseSchema>
