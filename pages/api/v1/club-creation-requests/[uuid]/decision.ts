import { NextApiRequest, NextApiResponse } from 'next'
import { ZodIssue, z } from 'zod'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { NotFoundError } from 'server/domain/error'
import { Club } from 'server/domain/model/Club'
import { ClubUuidParamsSchema } from 'src/lib/schemas/clubs'
import { ClubCreationDecisionSchema } from 'src/lib/schemas/managers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Club | string | ZodIssue[]>,
) {
  try {
    const clubService = Provider.getService(ClubService)

    if (req.method === 'PATCH') {
      const { uuid: clubUuid } = ClubUuidParamsSchema.parse(req.query)
      const body = ClubCreationDecisionSchema.parse(req.body)
      const club = await clubService.decideClubCreationRequest(clubUuid, body)
      return res.status(200).json(club)
    }
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).send('club not found')
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('decideClubCreationRequest error: ', err)
    return res.status(500).send('Internal Server Error')
  }

  return res.status(405).end()
}
