export type Club = {
  id: number
  uuid: string // id와 동일한 필드. 기존의 id는 number 타입이었으나, string 타입으로 변경되었다.
  name: string
  fullName: string
  description: string
  introduction: string
  type: string
  category: string
  college: string
  recruitType: string
  isPopular: boolean
  hasDongbang: boolean
  activityCycle: string
  membershipFee: string
  tags: string[]
  imageUri: string
  article: string
  articleUploadedAt: string | null
}
