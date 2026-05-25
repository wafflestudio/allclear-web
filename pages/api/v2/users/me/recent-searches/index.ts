import { NextApiHandler } from 'next'
import {
  deleteGuestRecentSearches,
  deleteMemberRecentSearches,
  findGuestRecentSearches,
  findMemberRecentSearches,
  RecentSearch,
} from 'server/service/recent-search.service'
import { assertNever } from 'server/util/assert-never'
import { resolveOptionalAuth } from 'server/util/optional-auth'
import { withV2ApiHandler } from 'server/http/api-error'

type RecentSearchesResponse = {
  recentSearches: RecentSearch[]
  totalSize: number
}

const handler: NextApiHandler<RecentSearchesResponse> = async (req, res) => {
  const auth = await resolveOptionalAuth(req)

  if (req.method === 'GET') {
    let recentSearches: RecentSearch[]
    if (auth.type === 'member') {
      recentSearches = await findMemberRecentSearches(auth.accountId)
    } else if (auth.type === 'guest') {
      recentSearches = await findGuestRecentSearches(auth.guestId)
    } else {
      assertNever(auth)
    }

    return res.status(200).json({
      recentSearches,
      totalSize: recentSearches.length,
    })
  }

  if (req.method === 'DELETE') {
    if (auth.type === 'member') {
      await deleteMemberRecentSearches(auth.accountId)
    } else if (auth.type === 'guest') {
      await deleteGuestRecentSearches(auth.guestId)
    } else {
      assertNever(auth)
    }
    return res.status(204).end()
  }
}

export default withV2ApiHandler({
  methods: ['GET', 'DELETE'],
  handler,
  logPrefix: 'recentSearches',
})
