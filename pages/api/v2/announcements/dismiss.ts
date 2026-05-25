import { NextApiHandler } from 'next'
import { Provider } from 'server/provider'
import { AnnouncementService } from 'server/service/announcement.service'
import { DismissAnnouncementsSchema } from 'src/lib/schemas/announcements'
import { withV2ApiHandler } from 'server/http/api-error'

const handler: NextApiHandler = async (req, res) => {
  const announcementService = Provider.getService(AnnouncementService)
  const body = DismissAnnouncementsSchema.parse(req.body)
  await announcementService.dismissAnnouncements(req.headers.user as string, body.announcementUuids)
  return res.status(204).send(null)
}

export default withV2ApiHandler({
  methods: ['POST'],
  handler,
  logPrefix: 'dismissAnnouncements',
})
