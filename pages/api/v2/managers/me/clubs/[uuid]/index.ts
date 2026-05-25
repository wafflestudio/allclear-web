import { NextApiHandler } from 'next'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { UserService } from 'server/service/user.service'
import { UserNotFoundError } from 'server/domain/error'
import { ClubUuidParamsSchema } from 'src/lib/schemas/clubs'
import { ManagedClubPatchSchema } from 'src/lib/schemas/managers'
import {
  API_ERROR_CODES,
  ApiErrorMapper,
  toApiError,
  withV2ApiHandler,
} from 'server/http/api-error'

const api: NextApiHandler = async (req, res) => {
  const clubService = Provider.getService(ClubService)
  const userService = Provider.getService(UserService)

  const user = await userService.getUserByAccountId(req.headers.user as string)
  const { uuid: clubUuid } = ClubUuidParamsSchema.parse(req.query)
  if (req.method == 'GET') {
    const club = await clubService.getManagedClubByUuid(clubUuid, user.serviceUserId)
    return res.status(200).json(club)
  }

  if (req.method === 'PATCH') {
    const body = ManagedClubPatchSchema.parse(req.body)
    const result = await clubService.patchManagedClub(clubUuid, user.serviceUserId, body)
    return res.status(200).json({
      success: true,
      message: '동아리 정보가 수정되었으며, 수정 이력이 기록되었습니다.',
      data: {
        club_uuid: result.clubUuid,
        updated_at: result.updatedAt,
      },
    })
  }
}

const mapManagedClubError: ApiErrorMapper = (err) => {
  if (err instanceof UserNotFoundError) {
    return toApiError({
      status: 401,
      code: API_ERROR_CODES.UNAUTHORIZED,
      message: 'Unauthorized',
      cause: err,
    })
  }
}

export default withV2ApiHandler({
  methods: ['GET', 'PATCH'],
  handler: api,
  logPrefix: 'editClub',
  mapError: mapManagedClubError,
})
