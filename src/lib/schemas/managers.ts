import {
  CLUB_AFFILIATION_TYPES,
  CLUB_CATEGORIES,
  CLUB_COLLEGES,
  CLUB_RECRUIT_TYPES,
} from 'src/fixtures/club-options'
import { z } from 'src/lib/schemas/zod'
import { ClubSchema } from 'src/lib/schemas/common'

export const ManagerClubParamsSchema = z
  .object({
    serviceUserId: z.string().uuid(),
    uuid: z.string().uuid(),
  })
  .openapi('ManagerClubParams')

export const ClubManagerRegisterRequestSchema = z
  .object({
    clubId: z.string().uuid().optional(),
    clubName: z.string().nonempty().optional(),
  })
  .openapi('ClubManagerRegisterRequest')

export const ManagedClubUpdateSchema = z
  .object({
    name: z.string().nonempty().max(30),
    fullName: z.string().nonempty().max(50),
    type: z.enum(['교내', '연합']),
    recruitType: z.enum(CLUB_RECRUIT_TYPES).nullable().optional(),
    category: z.enum(CLUB_CATEGORIES),
    tags: z
      .array(
        z
          .string()
          .nonempty()
          .max(10)
          .regex(/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9_\-.]+$/),
      )
      .max(5),
    college: z.enum(CLUB_COLLEGES),
    affiliationType: z.enum(CLUB_AFFILIATION_TYPES),
    collegeMajorId: z.number().int().nullable().optional(),
    introduction: z.string().max(1000).nullable().optional(),
    detail: z.string().max(5000).nullable().optional(),
  })
  .openapi('ManagedClubUpdate')

export const ManagedClubsResponseSchema = z
  .object({
    clubs: z.array(ClubSchema),
    totalSize: z.number().int(),
  })
  .openapi('ManagedClubsResponse')

export const ClubImageUploadSchema = z
  .object({
    file: z.string().openapi({
      type: 'string',
      format: 'binary',
      description: '업로드할 동아리 이미지 파일',
    }),
  })
  .openapi('ClubImageUpload')
