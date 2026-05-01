import { z } from 'src/lib/schemas/zod'
import { TermsSchema } from './common'

export const TermsResponseSchema = z
  .object({
    data: z.array(TermsSchema),
  })
  .openapi('TermsResponse')
