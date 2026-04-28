import { z } from 'src/lib/schemas/zod'
import { AnnouncementSchema } from './common'

export const AnnouncementsResponseSchema = z
  .object({
    data: z.array(AnnouncementSchema),
  })
  .openapi('AnnouncementsResponse')
