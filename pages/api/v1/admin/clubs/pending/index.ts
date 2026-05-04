import { NextApiRequest, NextApiResponse } from 'next'
import { Provider } from 'server/provider'
import { AdminClubService } from 'server/service/admin-club.service'
import { UserService } from 'server/service/user.service'
import { ForbiddenError } from 'server/domain/error'
import { type PendingClubsResponse } from 'src/lib/schemas/admin'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PendingClubsResponse | string>,
) {
  try {
    const userService = Provider.getService(UserService)
    const adminClubService = Provider.getService(AdminClubService)
    await userService.assertAdminRole(req.headers.user as string)

    if (req.method === 'GET') {
      const clubs = await adminClubService.getPendingClubs()
      return res.status(200).json({
        success: true,
        message: '승인 대기 중인 동아리 목록 조회가 완료되었습니다.',
        data: {
          total_count: clubs.length,
          clubs,
        },
      })
    }
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return res.status(403).send('Forbidden')
    }
    console.error('getPendingClubs error: ', err)
    return res.status(500).send('Internal Server Error')
  }

  return res.status(405).end()
}
