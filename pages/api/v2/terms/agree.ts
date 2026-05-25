import { NextApiHandler } from 'next'
import { Provider } from 'server/provider'
import { UserService } from 'server/service/user.service'
import { TermsService } from 'server/service/terms.service'
import { AgreeTermsSchema } from 'src/lib/schemas/terms'
import { withV2ApiHandler } from 'server/http/api-error'

const handler: NextApiHandler = async (req, res) => {
  const userService = Provider.getService(UserService)
  const termsService = Provider.getService(TermsService)

  const user = await userService.getUserByAccountId(req.headers.user as string)
  const body = AgreeTermsSchema.parse(req.body)
  await termsService.agreeToTerms(user.id, body.termUuids)
  return res.status(204).send(null)
}

export default withV2ApiHandler({
  methods: ['POST'],
  handler,
  logPrefix: 'agreeTerms',
})
