import { NextApiRequest, NextApiResponse } from 'next'
import { z, ZodIssue } from 'zod'
import { Provider } from 'server/provider'
import { ClubRecruitmentService } from 'server/service/club-recruitment.service'
import { UserService } from 'server/service/user.service'
import { ConflictError, NotFoundError, UserNotFoundError } from 'server/domain/error'
import {
  ClubRecruitmentParamsSchema,
  UpsertClubRecruitmentSchema,
  type ClubRecruitmentDto,
  type ClubRecruitmentsResponse,
} from 'src/lib/schemas/club-recruitments'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClubRecruitmentsResponse | ClubRecruitmentDto | string | ZodIssue[]>,
) {
  try {
    const clubRecruitmentService = Provider.getService(ClubRecruitmentService)
    const userService = Provider.getService(UserService)
    const user = await userService.getUserByAccountId(req.headers.user as string)
    const { uuid: clubUuid } = ClubRecruitmentParamsSchema.parse(req.query)

    if (req.method === 'GET') {
      const recruitments = await clubRecruitmentService.findManagedRecruitmentsByClub(
        clubUuid,
        user.serviceUserId,
      )
      return res.status(200).json({
        recruitments,
        totalSize: recruitments.length,
      })
    }

    if (req.method === 'POST') {
      const body = UpsertClubRecruitmentSchema.parse(req.body)
      const recruitment = await clubRecruitmentService.createRecruitment(
        clubUuid,
        user.serviceUserId,
        body,
      )
      return res.status(201).json(recruitment)
    }
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return res.status(404).send('user not found')
    }
    if (err instanceof NotFoundError) {
      return res.status(404).send('resource not found')
    }
    if (err instanceof ConflictError) {
      return res.status(409).send(err.message)
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('manage club recruitments error: ', err)
    return res.status(500).send('Internal Server Error')
  }

  return res.status(405).end()
}
