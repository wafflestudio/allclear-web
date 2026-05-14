import { NextApiRequest, NextApiResponse } from 'next'
import { z, ZodIssue } from 'zod'
import { Provider } from 'server/provider'
import { UserService } from 'server/service/user.service'
import { UserNotFoundError } from 'server/domain/error'
import { CreateRecentSearchSchema } from 'src/lib/schemas/users'

type RecentSearch = {
  id: string
  query: string
  createdAt: string
}

type RecentSearchesResponse = {
  recentSearches: RecentSearch[]
  totalSize: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecentSearchesResponse | string | ZodIssue[]>,
) {
  try {
    const userService = Provider.getService(UserService)
    const user = await userService.getUserByAccountId(req.headers.user as string)

    if (req.method === 'GET') {
      const recentSearches = await userService.findRecentSearches(user.serviceUserId)
      return res.status(200).json({
        recentSearches: recentSearches.map((it) => ({
          id: it.id,
          query: it.query,
          createdAt: it.createdAt,
        })),
        totalSize: recentSearches.length,
      })
    }

    if (req.method === 'POST') {
      const { query } = CreateRecentSearchSchema.parse(req.body)
      await userService.saveRecentSearch(user.serviceUserId, query)
      return res.status(204).end()
    }

    if (req.method === 'DELETE') {
      await userService.deleteRecentSearches(user.serviceUserId)
      return res.status(204).end()
    }

    return res.status(405).end()
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return res.status(404).send('user not found')
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('recentSearches error: ', err)
    return res.status(500).send('internal server error')
  }
}
