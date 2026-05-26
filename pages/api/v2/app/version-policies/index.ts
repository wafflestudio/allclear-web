import { NextApiRequest, NextApiResponse } from 'next'
import { ZodIssue, z } from 'zod'
import { BadRequestError } from 'server/domain/error'
import { Provider } from 'server/provider'
import { AppVersionService } from 'server/service/app-version.service'
import {
  AppVersionPolicyResponse,
  AppVersionPolicyUpdateSchema,
} from 'src/lib/schemas/app-versions'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AppVersionPolicyResponse | string | ZodIssue[]>,
) {
  try {
    if (req.method === 'POST') {
      const appVersionService = Provider.getService(AppVersionService)
      const body = AppVersionPolicyUpdateSchema.parse(req.body)
      const policy = await appVersionService.upsertPolicy(body)

      return res.status(200).json({
        success: true,
        message: '앱 버전 정책이 저장되었습니다.',
        data: policy,
      })
    }
  } catch (err) {
    if (err instanceof BadRequestError) {
      return res.status(400).send(err.message)
    }
    if (err instanceof z.ZodError) {
      return res.status(400).json(err.errors)
    }
    console.error('upsertAppVersionPolicy error: ', err)
    return res.status(500).send('Internal Server Error')
  }

  return res.status(405).end()
}
