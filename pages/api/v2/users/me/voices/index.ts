import { NextApiHandler } from 'next'
import { Provider } from 'server/provider'
import { UserService } from 'server/service/user.service'
import { SlackService } from 'server/service/slack.service'
import { UserVoiceSchema } from 'src/lib/schemas/users'
import { withV2ApiHandler } from 'server/http/api-error'

const handler: NextApiHandler = async (req, res) => {
  const userService = Provider.getService(UserService)
  const slackService = Provider.getService(SlackService)

  const user = await userService.getUserByAccountId(req.headers.user as string)
  const { content } = UserVoiceSchema.parse(req.body)
  await userService.throwUserVoice(user.serviceUserId, content)
  await slackService.sendMessage(
    'DRAGONITE',
    'C0AEQRLAGMU',
    `*행운의 망나뇽이 유저의 소중한 의견을 들고왔어요*
유저 이름: ${user.name || user.nickname}
유저 연락처: ${user.phone}
편지 본문: "${content}"`,
  )
  return res.status(204).send(null)
}

export default withV2ApiHandler({
  methods: ['POST'],
  handler,
  logPrefix: 'userVoice',
})
