import {
  normalizeClubRecruitType,
  type ClubRecruitType,
} from 'src/common/constants/club-recruit-type'
import type {
  ClubRecruitmentActivityLocationType,
  ClubRecruitmentTerm,
} from 'src/common/constants/club-recruitment'
import { ClubRecruitmentEntity } from '../../infra/database/entities/club-recruitment.entity'

export type ClubRecruitment = {
  id: string
  clubId: string
  description: string
  recruitType: ClubRecruitType
  recruitYear: number
  recruitTerm: ClubRecruitmentTerm
  deadline: string
  recruitCount: number | null
  recruitCountText: string
  isCollegeLimited: boolean
  eligibilityText: string
  applicationUrl: string
  applicationProcess: string
  hasMembershipFee: boolean
  membershipFeeText: string | null
  activityLocationType: ClubRecruitmentActivityLocationType
  activityLocationText: string
  mainActivities: string
  extraInfo: string | null
  yearMonth: string
  createdAt: string
  updatedAt: string
}

export const toClubRecruitmentDomain = (it: ClubRecruitmentEntity): ClubRecruitment => ({
  id: String(it.id),
  clubId: it.clubId,
  description: it.description,
  recruitType: normalizeClubRecruitType(it.recruitType),
  recruitYear: it.recruitYear,
  recruitTerm: it.recruitTerm as ClubRecruitmentTerm,
  deadline: it.deadline,
  recruitCount: it.recruitCount,
  recruitCountText: it.recruitCountText,
  isCollegeLimited: it.isCollegeLimited,
  eligibilityText: it.eligibilityText,
  applicationUrl: it.applicationUrl,
  applicationProcess: it.applicationProcess,
  hasMembershipFee: it.hasMembershipFee,
  membershipFeeText: it.membershipFeeText,
  activityLocationType: it.activityLocationType as ClubRecruitmentActivityLocationType,
  activityLocationText: it.activityLocationText,
  mainActivities: it.mainActivities,
  extraInfo: it.extraInfo,
  yearMonth: it.yearMonth,
  createdAt: it.createdAt,
  updatedAt: it.updatedAt,
})
