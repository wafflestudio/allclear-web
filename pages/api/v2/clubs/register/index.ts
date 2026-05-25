import { NextApiHandler } from 'next'
import { Provider } from 'server/provider'
import { ClubService } from 'server/service/club.service'
import { UserService } from 'server/service/user.service'
import { UserNotFoundError } from 'server/domain/error'
import { ClubRegisterRequestSchema } from 'src/lib/schemas/managers'
import {
  API_ERROR_CODES,
  ApiErrorMapper,
  toApiError,
  withV2ApiHandler,
} from 'server/http/api-error'

type ClubRegisterResponse = {
  success: boolean
  message: string
}

const handler: NextApiHandler<ClubRegisterResponse> = async (req, res) => {
  const clubService = Provider.getService(ClubService)
  const userService = Provider.getService(UserService)

  const user = await userService.getUserByAccountId(req.headers.user as string)
  const body = ClubRegisterRequestSchema.parse(req.body)
  await clubService.registerClub(user.serviceUserId, body)

  return res.status(201).json({
    success: true,
    message: '동아리 등록 신청이 완료되었습니다.',
  })
}

const mapRegisterError: ApiErrorMapper = (err) => {
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
  methods: ['POST'],
  handler,
  logPrefix: 'registerClub',
  mapError: mapRegisterError,
})
