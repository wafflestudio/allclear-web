import { ClubEntity } from '../../infra/database/entities'
import { ENV } from '../../ENV'
import { CollegeMajor } from './CollegeMajor'

export type ReviewKeyword = {
  id: string
  title: string
  color: string
  iconUri: string
  totalUpvotes: number
}

export type Club = {
  // uuid와 동일한 필드. 기존의 id는 number 타입이었으나, string 타입으로 변경되었다.
  id: string
  uuid: string
  name: string
  fullName: string
  description: string
  introduction: string
  type: string
  category: string
  college: string
  affiliationType: string
  collegeMajorId: number | null
  collegeMajor: CollegeMajor | null
  recruitType: string
  isPopular: boolean
  hasDongbang: boolean
  activityCycle: string
  membershipFee: string
  tags: string[]
  imageUri: string
  blurHash: string | null
  article: string
  articleUploadedAt: string | null
  status: string
  rejectReason: string
  avgRating: number
  totalReviews: number
  reviewKeywords: ReviewKeyword[]
  latestComment: string
}

export const toClubDomain = (
  it: ClubEntity,
  review?: {
    totalReviews: number
    avgRating: number
    reviewKeywords: ReviewKeyword[]
    latestComment: string
  },
): Club => ({
  id: it.uuid,
  uuid: it.uuid,
  name: it.name,
  fullName: it.fullName,
  description: it.description,
  introduction: it.introduction ?? '',
  type: it.type,
  category: it.category,
  college: it.college ?? '',
  affiliationType: it.affiliationType,
  collegeMajorId: it.collegeMajorId,
  collegeMajor: it.collegeMajor
    ? {
        id: it.collegeMajor.id,
        college: it.collegeMajor.college,
        major: it.collegeMajor.major,
      }
    : null,
  recruitType: it.recruitType ?? '',
  isPopular: it.isPopular,
  hasDongbang: it.hasDongbang,
  activityCycle: it.activityCycle ?? '',
  membershipFee: it.membershipFee ?? '',
  tags: it.tags,
  imageUri: encode(it.imageUri) || ENV.R2.DEFAULT_CLUB_IMAGE,
  blurHash: it.blurHash,
  article: it.article ?? '',
  articleUploadedAt: it.articleUploadedAt,
  status: it.status,
  rejectReason: it.rejectReason ?? '',
  avgRating: review?.avgRating ?? 0,
  totalReviews: review?.totalReviews ?? 0,
  reviewKeywords: review?.reviewKeywords ?? [],
  latestComment: review?.latestComment ?? '',
})

function encode(imageUri: string | undefined): string {
  if (!imageUri) {
    return ''
  }
  const splitter = '%2F'
  const parts = imageUri.split(splitter)
  const lastPart = parts.pop() ?? ''

  const encodedLastPart = encodeURIComponent(lastPart)
  return `${parts.join(splitter)}${splitter}${encodedLastPart}`
}
