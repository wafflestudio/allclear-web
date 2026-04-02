import { Club } from 'server/domain/model/Club'
import { NextApiRequest, NextApiResponse } from 'next'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { SearchService } from 'server/service/search.service'
import { UserNotFoundError } from 'server/domain/error'
import { UserService } from 'server/service/user.service'
import { z } from 'zod'
import { SlackService } from '../../../../../../server/service/slack.service'

const ClubManagerRegisterRequestValidator = z.object({
  clubId: z.string().uuid().optional(),
  clubName: z.string().nonempty().optional(),
})

type ResponseData = {
  clubs: Club[]
  totalSize: number
}

// const app = new App({
//   token: ENV.SLACK.TOKEN.DRAGONITE,
//   signingSecret: ENV.SLACK.SIGNING_SECRET,
// })
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string | null>,
) {
  try {
    const clubService = Provider.getService(ClubService)
    const searchService = Provider.getService(SearchService)
    const userService = Provider.getService(UserService)
    const slackService = Provider.getService(SlackService)

    const user = await userService.getUserByAccountId(req.headers.user as string)
    if (req.method == 'GET') {
      const clubs = await clubService.findAllManagedByUser(user.serviceUserId)
      return res.status(200).json({
        clubs: clubs,
        totalSize: clubs.length,
      })
    }
    if (req.method === 'POST') {
      const { clubId, clubName } = ClubManagerRegisterRequestValidator.parse(req.body)
      await clubService.clubManagerRegisterRequest(user.serviceUserId, {
        clubId,
        clubName,
      })
      let clubs: Club[] = []
      if (clubId) {
        clubs = [await clubService.findByUuid(clubId)]
      } else {
        clubs = await searchService.findCandidatesByName(clubName)
      }
      const clubDetails = clubs.map((club) => `- ${club.name} (ID: \`${club.id}\`)`).join('\n')
      await slackService.sendMessage(
        'DRAGONITE',
        'C0AEQRLAGMU',
        `*행운의 망나뇽이 동아리 관리자 등록 요청을 들고왔어요*
유저: ${user.name || user.nickname} (Service User ID: ${user.serviceUserId})
연락처: ${user.phone}
동아리명: ${clubName}${
          clubs.length
            ? `\n\n망나뇽이 올클 DB에 있는 유사한 이름의 동아리를 물어왔어요\n${clubDetails}`
            : ''
        }`,
      )
      return res.status(204).send(null)
    }
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return res.status(404).send('user not found')
    }
    console.error('listClubsManagedByMe error: ', err)
    return res.status(500).send('Internal Server Error')
  }
}
