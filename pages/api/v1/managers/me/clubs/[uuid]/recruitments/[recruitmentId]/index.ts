import { NextApiRequest, NextApiResponse } from 'next'
import { z, ZodIssue } from 'zod'
import { Provider } from 'server/provider'
import { ClubRecruitmentService } from 'server/service/club-recruitment.service'
import { UserService } from 'server/service/user.service'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UserNotFoundError,
} from 'server/domain/error'
import {
  ClubRecruitmentIdParamsSchema,
  UpsertClubRecruitmentSchema,
  type ClubRecruitmentDto,
} from 'src/lib/schemas/club-recruitments'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClubRecruitmentDto | string | ZodIssue[] | null>,
) {
  try {
    const clubRecruitmentService = Provider.getService(ClubRecruitmentService)
    const userService = Provider.getService(UserService)
    const user = await userService.getUserByAccountId(req.headers.user as string)
    const { uuid: clubUuid, recruitmentId } = ClubRecruitmentIdParamsSchema.parse(req.query)

    if (req.method === 'GET') {
      const recruitment = await clubRecruitmentService.findManagedRecruitmentById(
        clubUuid,
        recruitmentId,
        user.serviceUserId,
      )
      return res.status(200).json(recruitment)
    }

    if (req.method === 'PUT') {
      const body = UpsertClubRecruitmentSchema.parse(req.body)
      const recruitment = await clubRecruitmentService.updateRecruitment(
        clubUuid,
        recruitmentId,
        user.serviceUserId,
        body,
      )
      return res.status(200).json(recruitment)
    }

    if (req.method === 'DELETE') {
      await clubRecruitmentService.deleteRecruitment(clubUuid, recruitmentId, user.serviceUserId)
      return res.status(204).send(null)
    }
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return res.status(404).send('user not found')
    }
    if (err instanceof NotFoundError) {
      return res.status(404).send('resource not found')
    }
    if (err instanceof ForbiddenError) {
      return res.status(403).send('forbidden')
    }
    if (err instanceof ConflictError) {
      return res.status(409).send(err.message)
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('manage club recruitment detail error: ', err)
    return res.status(500).send('Internal Server Error')
  }

  return res.status(405).end()
}
