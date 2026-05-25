import { NextApiHandler } from 'next'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { Club } from 'server/domain/model/Club'
import { ClubUuidParamsSchema } from 'src/lib/schemas/clubs'
import { withV2ApiHandler } from 'server/http/api-error'

const handler: NextApiHandler<Club> = async (req, res) => {
  const clubService = Provider.getService(ClubService)
  const { uuid: clubUuid } = ClubUuidParamsSchema.parse(req.query)
  const club = await clubService.findPublicByUuid(clubUuid)
  return res.status(200).json(club)
}

export default withV2ApiHandler({
  methods: ['GET'],
  handler,
  logPrefix: 'getClubDetail',
})
