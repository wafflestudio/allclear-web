import { z } from 'src/lib/schemas/zod'

export const ValidationIssueSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
  })
  .passthrough()
  .openapi('ValidationIssue')

export const HealthCheckSchema = z
  .object({
    status: z.literal('ok'),
  })
  .openapi('HealthCheck')

export const OkResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .openapi('OkResponse')

export const TokenResponseSchema = z
  .object({
    token: z.string(),
  })
  .openapi('TokenResponse')

export const CollegeMajorSchema = z
  .object({
    id: z.number().int(),
    college: z.string(),
    major: z.string().nullable(),
  })
  .openapi('CollegeMajor')

export const ReviewKeywordSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    color: z.string(),
    iconUri: z.string(),
    totalUpvotes: z.number().int().optional(),
  })
  .openapi('ReviewKeyword')

export const ReviewKeywordCategorySchema = z
  .object({
    id: z.number().int(),
    title: z.string(),
    color: z.string(),
    iconUri: z.string().optional(),
    keywords: z.array(ReviewKeywordSchema),
  })
  .openapi('ReviewKeywordCategory')

export type ReviewKeywordCategory = z.infer<typeof ReviewKeywordCategorySchema>

export const ClubCategorySchema = z
  .object({
    category: z.string(),
    count: z.number().int(),
  })
  .passthrough()
  .openapi('ClubCategory')

export const UserSchema = z
  .object({
    id: z.string(),
    serviceUserId: z.string(),
    nickname: z.string(),
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    gender: z.string(),
    birthDate: z.string().nullable(),
    birthYear: z.string(),
    college: z.string(),
    major: z.string(),
    admissionClass: z.number().nullable(),
    grade: z.number().nullable(),
  })
  .openapi('User')

export const ClubSchema = z
  .object({
    id: z.string().uuid(),
    uuid: z.string().uuid(),
    name: z.string(),
    fullName: z.string(),
    description: z.string(),
    introduction: z.string(),
    type: z.string(),
    category: z.string(),
    college: z.string(),
    affiliationType: z.string(),
    collegeMajorId: z.number().nullable(),
    collegeMajor: CollegeMajorSchema.nullable(),
    recruitType: z.string(),
    isPopular: z.boolean(),
    hasDongbang: z.boolean(),
    activityCycle: z.string(),
    membershipFee: z.string(),
    tags: z.array(z.string()),
    imageUri: z.string(),
    blurHash: z.string().nullable(),
    article: z.string(),
    articleUploadedAt: z.string().nullable(),
    status: z.string(),
    rejectReason: z.string(),
    avgRating: z.number(),
    totalReviews: z.number().int(),
    reviewKeywords: z.array(ReviewKeywordSchema),
    latestComment: z.string(),
  })
  .openapi('Club')
