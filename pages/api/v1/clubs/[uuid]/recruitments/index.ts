import { NextApiRequest, NextApiResponse } from 'next'
import { z, ZodIssue } from 'zod'
import { Provider } from 'server/provider'
import { ClubRecruitmentService } from 'server/service/club-recruitment.service'
import { NotFoundError } from 'server/domain/error'
import {
  ClubRecruitmentParamsSchema,
  type ClubRecruitmentsResponse,
} from 'src/lib/schemas/club-recruitments'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClubRecruitmentsResponse | string | ZodIssue[]>,
) {
  try {
    const clubRecruitmentService = Provider.getService(ClubRecruitmentService)

    if (req.method === 'GET') {
      const { uuid: clubUuid } = ClubRecruitmentParamsSchema.parse(req.query)
      const recruitments = await clubRecruitmentService.findPublicRecruitmentsByClub(clubUuid)
      return res.status(200).json({
        recruitments,
        totalSize: recruitments.length,
      })
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).send('resource not found')
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('list public club recruitments error: ', err)
    return res.status(500).send('Internal Server Error')
  }

  return res.status(405).end()
}
