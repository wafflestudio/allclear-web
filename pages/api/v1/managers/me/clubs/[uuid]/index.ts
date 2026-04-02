import { NextApiHandler } from 'next'
import { z } from 'zod'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { UserService } from 'server/service/user.service'
import { UserNotFoundError } from 'server/domain/error'
import {
  CLUB_AFFILIATION_TYPES,
  CLUB_CATEGORIES,
  CLUB_COLLEGES,
  CLUB_RECRUIT_TYPES,
} from 'src/fixtures/club-options'

const RequestBody = z.object({
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

const QueryValidator = z.object({
  uuid: z.string().uuid(),
})

const api: NextApiHandler = async (req, res) => {
  try {
    const clubService = Provider.getService(ClubService)
    const userService = Provider.getService(UserService)

    const user = await userService.getUserByAccountId(req.headers.user as string)
    const { uuid: clubUuid } = QueryValidator.parse(req.query)
    if (req.method == 'GET') {
      const club = await clubService.getManagedClubByUuid(clubUuid, user.serviceUserId)
      return res.status(200).json(club)
    }

    if (req.method === 'PUT') {
      const club = await clubService.getManagedClubByUuid(clubUuid, user.serviceUserId)

      const body = RequestBody.parse(req.body)

      await clubService.updateClub(club.uuid, {
        name: body.name,
        fullName: body.fullName,
        description: body.fullName,
        type: body.type,
        recruitType: body.recruitType,
        category: body.category,
        tags: body.tags,
        college: body.college,
        affiliationType: body.affiliationType,
        collegeMajorId: body.collegeMajorId ?? null,
        introduction: body.introduction ?? '',
        ...((body.detail ?? '') !== club.article
          ? { article: body.detail ?? '', articleUploadedAt: new Date().toISOString() }
          : {}),
      })
      return res.status(200).end()
    }
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return res.status(404).send('user not found')
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('editClub error: ', err)
    return res.status(500).send('Internal Server Error')
  }
  // 다른 HTTP 메서드에 대한 처리 (예: POST, PUT, DELETE 등)
  return res.status(405).end() // Method Not Allowed
}

export default api
