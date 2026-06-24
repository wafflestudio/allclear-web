import { SelectQueryBuilder } from 'typeorm'
import { ClubEntity } from 'server/infra/database/entities'
import { MinActivityPeriodFilter, SearchFilters } from './search.types'

const LATEST_RECRUITMENT_ID = latestRecruitmentColumn('id')
const LATEST_RECRUITMENT_DEADLINE = latestRecruitmentColumn('deadline')
const LATEST_RECRUITMENT_HAS_MEMBERSHIP_FEE = latestRecruitmentColumn('has_membership_fee')

export function applySearchFilters(
  qb: SelectQueryBuilder<ClubEntity>,
  filters: SearchFilters,
): SelectQueryBuilder<ClubEntity> {
  if (filters.affiliationType !== undefined) {
    qb.andWhere('club.affiliation_type = :affiliationType', {
      affiliationType: filters.affiliationType,
    })
  }

  if (filters.recruitType !== undefined) {
    qb.andWhere('club.recruit_type = :recruitType', {
      recruitType: filters.recruitType,
    })
  }

  if (filters.hasDongbang !== undefined) {
    qb.andWhere('club.has_dongbang = :hasDongbang', {
      hasDongbang: filters.hasDongbang,
    })
  }

  if (filters.isOfficialVerified !== undefined) {
    qb.andWhere('club.is_official_verified = :isOfficialVerified', {
      isOfficialVerified: filters.isOfficialVerified,
    })
  }

  applyMinActivityPeriodFilter(qb, filters.minActivityPeriods)
  applyRecruitmentFilters(qb, filters)
  return qb
}

function applyMinActivityPeriodFilter(
  qb: SelectQueryBuilder<ClubEntity>,
  minActivityPeriods: MinActivityPeriodFilter[] | undefined,
): void {
  if (minActivityPeriods === undefined || minActivityPeriods.length === 0) {
    return
  }

  const hasThreeOrMore = minActivityPeriods.includes('3_plus')
  const exactValues = minActivityPeriods
    .filter((value): value is '0' | '1' | '2' => value !== '3_plus')
    .map(Number)

  if (hasThreeOrMore && exactValues.length > 0) {
    qb.andWhere(
      '(club.min_activity_period IN (:...minActivityPeriodExactValues) OR club.min_activity_period >= :minActivityPeriodGte)',
      {
        minActivityPeriodExactValues: exactValues,
        minActivityPeriodGte: 3,
      },
    )
    return
  }

  if (hasThreeOrMore) {
    qb.andWhere('club.min_activity_period >= :minActivityPeriodGte', {
      minActivityPeriodGte: 3,
    })
    return
  }

  qb.andWhere('club.min_activity_period IN (:...minActivityPeriodExactValues)', {
    minActivityPeriodExactValues: exactValues,
  })
}

function applyRecruitmentFilters(qb: SelectQueryBuilder<ClubEntity>, filters: SearchFilters): void {
  if (filters.hasMembershipFee === undefined && filters.isRecruiting === undefined) {
    return
  }

  if (filters.hasMembershipFee !== undefined) {
    qb.andWhere(`(${LATEST_RECRUITMENT_HAS_MEMBERSHIP_FEE}) = :hasMembershipFee`, {
      hasMembershipFee: filters.hasMembershipFee,
    })
  }

  if (filters.isRecruiting === true) {
    qb.andWhere(`(${LATEST_RECRUITMENT_ID}) IS NOT NULL`)
    qb.andWhere(`(${LATEST_RECRUITMENT_DEADLINE}) > NOW()`)
  }

  if (filters.isRecruiting === false) {
    qb.andWhere(`((${LATEST_RECRUITMENT_ID}) IS NULL OR (${LATEST_RECRUITMENT_DEADLINE}) <= NOW())`)
  }
}

function latestRecruitmentColumn(columnName: 'id' | 'deadline' | 'has_membership_fee'): string {
  return `
    SELECT recruitment.${columnName}
    FROM club_recruitment recruitment
    WHERE recruitment.club_id = club.uuid
      AND recruitment.deleted_at IS NULL
    ORDER BY recruitment.year_month DESC, recruitment.created_at DESC
    LIMIT 1
  `
}
