import { NextApiRequest, NextApiResponse } from 'next'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { Club } from 'server/domain/model/Club'
import { z, ZodIssue } from 'zod'

const QueryValidator = z.object({
  uuid: z.string().uuid(),
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Club | string | ZodIssue[]>,
) {
  try {
    const clubService = Provider.getService(ClubService)
    if (req.method == 'GET') {
      const { uuid: ClubUuid } = QueryValidator.parse(req.query)
      const club = await clubService.findByUuid(ClubUuid)
      return res.status(200).json(club)
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('getClubDetail error: ', err)
    return res.status(500).send('Internal Server Error')
  }
}
