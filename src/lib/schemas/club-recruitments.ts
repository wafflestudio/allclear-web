import { CLUB_RECRUIT_TYPES } from 'src/common/constants/club-recruit-type'
import {
  CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES,
  CLUB_RECRUITMENT_TERMS,
} from 'src/common/constants/club-recruitment'
import { z } from 'src/lib/schemas/zod'

const TimestampStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'Invalid datetime string',
  })

const IntInputSchema = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value)
  }
  return value
}, z.number().int())

const NullableNonnegativeIntInputSchema = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    return Number(value)
  }
  return value
}, z.number().int().nonnegative().nullable())

const BooleanInputSchema = z.preprocess((value) => {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  return value
}, z.boolean())

const NullableTrimmedStringSchema = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  return value
}, z.string().nullable())

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
    description: z.string().trim(),
    recruitType: z.enum(CLUB_RECRUIT_TYPES),
    recruitYear: IntInputSchema,
    recruitTerm: z.enum(CLUB_RECRUITMENT_TERMS),
    deadline: TimestampStringSchema,
    recruitCount: NullableNonnegativeIntInputSchema,
    recruitCountText: z.string().trim(),
    isCollegeLimited: BooleanInputSchema,
    eligibilityText: z.string().trim(),
    applicationUrl: z.string().trim(),
    applicationProcess: z.string().trim(),
    hasMembershipFee: BooleanInputSchema,
    membershipFeeText: NullableTrimmedStringSchema,
    activityLocationType: z.enum(CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES),
    activityLocationText: z.string().trim(),
    mainActivities: z.string().trim(),
    extraInfo: NullableTrimmedStringSchema,
  })
  .openapi('UpsertClubRecruitment')

export type UpsertClubRecruitment = z.infer<typeof UpsertClubRecruitmentSchema>

export const ClubRecruitmentSchema = z
  .object({
    id: z.string().regex(/^\d+$/),
    clubId: z.string().uuid(),
    description: z.string(),
    recruitType: z.enum(CLUB_RECRUIT_TYPES),
    recruitYear: z.number().int(),
    recruitTerm: z.enum(CLUB_RECRUITMENT_TERMS),
    deadline: z.string(),
    recruitCount: z.number().int().nullable(),
    recruitCountText: z.string(),
    isCollegeLimited: z.boolean(),
    eligibilityText: z.string(),
    applicationUrl: z.string(),
    applicationProcess: z.string(),
    hasMembershipFee: z.boolean(),
    membershipFeeText: z.string().nullable(),
    activityLocationType: z.enum(CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES),
    activityLocationText: z.string(),
    mainActivities: z.string(),
    extraInfo: z.string().nullable(),
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
