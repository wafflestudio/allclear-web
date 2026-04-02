import { NextApiRequest, NextApiResponse } from 'next'
import { ZodIssue, z } from 'zod'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { UserService } from 'server/service/user.service'
import { UserNotFoundError } from 'server/domain/error'
import { Club } from 'server/domain/model/Club'
import { CreateClubCreationRequestSchema } from 'src/lib/schemas/managers'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Club | string | ZodIssue[]>,
) {
  try {
    const clubService = Provider.getService(ClubService)
    const userService = Provider.getService(UserService)

    if (req.method === 'POST') {
      const user = await userService.getUserByAccountId(req.headers.user as string)
      const body = CreateClubCreationRequestSchema.parse(req.body)
      const club = await clubService.createClubCreationRequest(user.serviceUserId, body)
      return res.status(201).json(club)
    }
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return res.status(404).send('user not found')
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('createClubCreationRequest error: ', err)
    return res.status(500).send('Internal Server Error')
  }

  return res.status(405).end()
}
