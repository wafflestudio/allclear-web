import { NextApiHandler, NextApiRequest } from 'next'
import { Provider } from 'server/provider'
import { SearchService } from 'server/service/search.service'
import { Club } from 'server/domain/model/Club'
import { MinActivityPeriodFilter, SearchFilters } from 'server/service/search/search.types'
import { saveRecentSearchBestEffort } from 'server/service/recent-search.service'
import { resolveOptionalAuth } from 'server/util/optional-auth'
import { API_ERROR_CODES, ApiError, withV2ApiHandler } from 'server/http/api-error'

type ResponseData = {
  clubs: Club[]
  totalSize: number
  query: string
  correctedQuery: string | null
  isTypoCorrected: boolean
}

const INVALID_FILTER_MESSAGE = 'invalid search filter'

const MIN_ACTIVITY_PERIOD_FILTERS = new Set<MinActivityPeriodFilter>(['0', '1', '2', '3_plus'])

const handler: NextApiHandler<ResponseData> = async (req, res) => {
  const searchService = Provider.getService(SearchService)
  const auth = await resolveOptionalAuth(req)
  const query = req.query.query as string
  if (!query) {
    throw new ApiError({
      status: 400,
      code: API_ERROR_CODES.BAD_REQUEST,
      message: 'query is required',
    })
  }

  const filters = parseSearchFilters(req.query)
  const { clubs, correctedQuery, isTypoCorrected } = await searchService.searchWithTypoCorrection(
    query,
    { filters },
  )
  await saveRecentSearchBestEffort(auth, query)
  return res.status(200).json({
    clubs: clubs,
    totalSize: clubs.length,
    query,
    correctedQuery,
    isTypoCorrected,
  })
}

export default withV2ApiHandler({
  methods: ['GET'],
  handler,
  logPrefix: 'searchClubs',
})

function parseSearchFilters(query: NextApiRequest['query']): SearchFilters {
  return {
    affiliationType: parseAffiliationType(query.affiliation_type),
    isRecruiting: parseOptionalBoolean(query.is_recruiting),
    recruitType: parseRecruitType(query.recruit_type),
    hasMembershipFee: parseOptionalBoolean(query.has_membership_fee),
    hasDongbang: parseOptionalBoolean(query.has_dongbang),
    isOfficialVerified: parseOptionalBoolean(query.is_official_verified),
    minActivityPeriods: parseMinActivityPeriods(query.min_activity_period),
  }
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  throw invalidSearchFilter()
}

function parseAffiliationType(value: unknown): string | undefined {
  if (value === undefined || value === '전체') {
    return undefined
  }
  if (value === '중앙동아리') {
    return '중앙동아리'
  }
  if (value === '학과/단과대동아리') {
    return '소속동아리'
  }
  throw invalidSearchFilter()
}

function parseRecruitType(value: unknown): '정기' | '상시' | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === '정기' || value === '상시') {
    return value
  }
  throw invalidSearchFilter()
}

function parseMinActivityPeriods(value: unknown): MinActivityPeriodFilter[] | undefined {
  if (value === undefined) {
    return undefined
  }

  const values = Array.isArray(value) ? value : [value]
  const selected = values.map((it) => {
    if (typeof it !== 'string' || !MIN_ACTIVITY_PERIOD_FILTERS.has(it as MinActivityPeriodFilter)) {
      throw invalidSearchFilter()
    }
    return it as MinActivityPeriodFilter
  })

  const unique = Array.from(new Set(selected))
  if (unique.length === 0) {
    return undefined
  }
  return unique
}

function invalidSearchFilter() {
  return new ApiError({
    status: 400,
    code: API_ERROR_CODES.INVALID_SEARCH_FILTER,
    message: INVALID_FILTER_MESSAGE,
  })
}
