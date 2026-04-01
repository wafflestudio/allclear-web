import { ILike, In, IsNull, Raw, Repository } from 'typeorm'
import { InjectRepository, Service } from '../provider'
import { ClubEntity, UserActivityLogEntity, UserActivityLogType } from '../infra/database/entities'
import { ClubCategory } from '../domain/model/ClubCategory'
import { CATEGORIES } from '../../src/fixtures/category'
import { Club, ReviewKeyword, toClubDomain } from 'server/domain/model/Club'
import { ClubReviewKeywordEntity } from '../infra/database/entities/club-review-keyword.entity'
import { UserClubReviewEntity } from '../infra/database/entities/user-club-review.entity'
import { groupBy, round, toPairs } from 'lodash-es'
import { ClubManagerEntity } from '../infra/database/entities/club-manager.entity'
import { UserSavedClubEntity } from '../infra/database/entities/user-saved-club.entity'
import { ClubManagerRegisterRequestEntity } from '../infra/database/entities/club-manager-register-request.entity'
import dayjs from 'dayjs'
import { disassemble } from 'es-hangul'
import leven from 'leven'
import { NotFoundError } from '../domain/error'

type ClubUuid = string
type ReviewKeywordId = string
type ClubSearchResponse = {
  clubs: Club[]
  correctedQuery: string | null
  isTypoCorrected: boolean
}
type ClubCorrectionSource = Pick<ClubEntity, 'name' | 'fullName' | 'tags'>
type CorrectionCandidate = {
  term: string
  normalizedTerm: string
  decomposedTerm: string
}

const sortByPopularAndEachRandom = (clubs: Club[]) =>
  clubs.sort((a, b) => {
    if (a.isPopular && !b.isPopular) {
      return -1
    }
    if (!a.isPopular && b.isPopular) {
      return 1
    }
    return (
      Math.random() - 0.5 + (a.imageUri && !b.imageUri ? -0.2 : !a.imageUri && b.imageUri ? 0.2 : 0)
    )
  })

@Service
export class ClubService {
  @InjectRepository(ClubEntity)
  private readonly clubRepository: Repository<ClubEntity>
  @InjectRepository(UserActivityLogEntity)
  private readonly userActivityLogRepository: Repository<UserActivityLogEntity>
  @InjectRepository(ClubReviewKeywordEntity)
  private readonly clubReviewKeywordRepository: Repository<ClubReviewKeywordEntity>
  @InjectRepository(UserClubReviewEntity)
  private readonly userClubReviewRepository: Repository<UserClubReviewEntity>
  @InjectRepository(UserSavedClubEntity)
  private readonly userSavedClubRepository: Repository<UserSavedClubEntity>
  @InjectRepository(ClubManagerEntity)
  private readonly clubManagerRepository: Repository<ClubManagerEntity>
  @InjectRepository(ClubManagerRegisterRequestEntity)
  private readonly clubManagerRegisterRequestRepository: Repository<ClubManagerRegisterRequestEntity>

  async findByUuid(uuid: string): Promise<Club> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.CALL_GET_CLUB_API,
        params: JSON.stringify({ uuid }),
      })
      .catch(console.error)
    const club = await this.clubRepository.findOneByOrFail({
      uuid,
    })
    const clubReview = await this.getClubReviews([club.uuid])
    return toClubDomain(club, clubReview.get(club.uuid))
  }

  async findByAuthKey(authkey: string): Promise<Club> {
    const club = await this.clubRepository.findOneByOrFail({
      authkey,
    })
    return toClubDomain(club)
  }

  async getManagedClubByUuid(clubUuid: string, serviceUserId: string): Promise<Club> {
    // check permission
    await this.clubManagerRepository.findOneByOrFail({
      clubId: clubUuid,
      serviceUserId,
    })
    const club = await this.clubRepository.findOneByOrFail({
      uuid: clubUuid,
    })
    return toClubDomain(club)
  }

  async findByCategory(category: string): Promise<Club[]> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.CALL_LIST_CLUBS_OF_CATEGORY_API,
        params: JSON.stringify({ category }),
      })
      .catch(console.error)
    const entities = await this.clubRepository.findBy({
      category,
    })
    const clubReview = await this.getClubReviews(entities.map((it) => it.uuid))
    const clubs = entities.map((it) => toClubDomain(it, clubReview.get(it.uuid)))
    return sortByPopularAndEachRandom(clubs)
  }

  async findAllManagedByUser(serviceUserId: string): Promise<Club[]> {
    const clubManagers = await this.clubManagerRepository.findBy({
      serviceUserId,
    })
    const clubs = await this.clubRepository.findBy({
      uuid: In(clubManagers.map((it) => it.clubId)),
    })
    return clubs.map((it) => toClubDomain(it))
  }

  async findClubsReviewedByMe(serviceUserId: string): Promise<Club[]> {
    const clubReviews = await this.userClubReviewRepository.findBy({ serviceUserId })
    const clubIds = Array.from(new Set(clubReviews.map((it) => it.clubId)))
    const club = await this.clubRepository.findBy({
      uuid: In(clubIds),
    })
    return club.map((it) => toClubDomain(it))
  }

  async findMySavedClubs(serviceUserId: string): Promise<Club[]> {
    const savedClubs = await this.userSavedClubRepository.findBy({ serviceUserId })
    const clubIds = Array.from(new Set(savedClubs.map((it) => it.clubId)))
    const club = await this.clubRepository.findBy({
      uuid: In(clubIds),
    })
    return club.map((it) => toClubDomain(it))
  }

  async saveClubToMyCollection(serviceUserId: string, clubId: string) {
    await this.userSavedClubRepository.insert({ serviceUserId, clubId })
  }

  async unsaveClubFromMyCollection(serviceUserId: string, clubId: string) {
    await this.userSavedClubRepository.delete({ serviceUserId, clubId })
  }

  async findPopular(): Promise<Club[]> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.CALL_LIST_POPULAR_CLUBS_API,
        params: '{}',
      })
      .catch(console.error)
    const entities = await this.clubRepository.findBy({
      isPopular: true,
    })
    const clubReview = await this.getClubReviews(entities.map((it) => it.uuid))
    const clubs = entities.map((it) => toClubDomain(it, clubReview.get(it.uuid)))
    return sortByPopularAndEachRandom(clubs)
  }

  async findLatestUploaded(topN = 20): Promise<Club[]> {
    const entities = await this.clubRepository.find({
      order: {
        articleUploadedAt: {
          direction: 'DESC',
          nulls: 'LAST',
        },
      },
      take: topN,
    })
    const clubReview = await this.getClubReviews(entities.map((it) => it.uuid))
    return entities.map((it) => toClubDomain(it, clubReview.get(it.uuid)))
  }

  async search(query: string): Promise<Club[]> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.CALL_SEARCH_CLUBS_API,
        params: JSON.stringify({ query }),
      })
      .catch(console.error)
    return this.searchByQuery(query)
  }

  async searchWithTypoCorrection(query: string): Promise<ClubSearchResponse> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.CALL_SEARCH_CLUBS_API,
        params: JSON.stringify({ query }),
      })
      .catch(console.error)
    const clubs = await this.searchByQuery(query)
    if (clubs.length > 0) {
      return {
        clubs,
        correctedQuery: null,
        isTypoCorrected: false,
      }
    }

    const correctedQuery = await this.findCorrectedSearchQuery(query)
    if (!correctedQuery || correctedQuery === query ) {
      return {
        clubs: [],
        correctedQuery: null,
        isTypoCorrected: false,
      }
    }

    const correctedClubs = await this.searchByQuery(correctedQuery)
    if (correctedClubs.length === 0) {
      return {
        clubs: [],
        correctedQuery: null,
        isTypoCorrected: false,
      }
    }

    return {
      clubs: correctedClubs,
      correctedQuery,
      isTypoCorrected: true,
    }
  }

  private async searchByQuery(query: string): Promise<Club[]> {
    const entities = await this.clubRepository.find({
      where: [
        {
          // name ILIKE '%query%'
          name: ILike(`%${query}%`),
          deletedAt: IsNull(),
        },
        {
          // full_name ILIKE '%query%'
          fullName: ILike(`%${query}%`),
          deletedAt: IsNull(),
        },
        {
          // ARRAY_TO_STRING(tags, ',') ILIKE '%query%'
          tags: Raw((tagsAlias) => `ARRAY_TO_STRING(${tagsAlias}, ',') ILIKE :query`, {
            query: `%${query}%`,
          }),
          deletedAt: IsNull(),
        },
      ],
    })
    const clubReview = await this.getClubReviews(entities.map((it) => it.uuid))
    const clubs = entities.map((it) => toClubDomain(it, clubReview.get(it.uuid)))
    return sortByPopularAndEachRandom(clubs)
  }

  private normalizeSearchTerm(term: string): string {
    return term.trim().toLowerCase().replace(/\s+/g, '')
  }

  private decomposeToJamo(term: string): string {
    return disassemble(term).replace(/\s+/g, '')
  }

  private calculateJamoSimilarity(query: string, candidate: string): number {
    const maxLength = Math.max(query.length, candidate.length)
    if (maxLength === 0) {
      return 0
    }
    return 1 - leven(query, candidate) / maxLength
  }

  private minimumJamoSimilarity(jamoLength: number): number {
    if (jamoLength <= 4) {
      return 0.8
    }
    if (jamoLength <= 8) {
      return 0.75
    }
    return 0.7
  }

  private async findCorrectedSearchQuery(query: string): Promise<string | null> {
    
    // Step 1. query 예쁘게 가공하기
    if (query.trim().length < 2) {
      return null
    }
    const normalizedQuery = this.normalizeSearchTerm(query)
    const decomposedQuery = this.decomposeToJamo(normalizedQuery)
    if (!decomposedQuery) {
      return null
    }

    // Step 2. clubs에서 필요한 정보 가져오기
    const clubs = await this.clubRepository.find({
      select: {
        name: true,
        fullName: true,
        tags: true,
      },
      where: {
        deletedAt: IsNull(),
      },
    })

    // Step 3. 교정될 문자열 후보 가져오기
    const candidateTerms = this.collectCorrectionCandidates(clubs, normalizedQuery.length)

    // Step 4. 최고의 문자열 선정하기
    const bestCandidate = candidateTerms
      .map((candidate) => {
        return {
          ...candidate,
          similarity: this.calculateJamoSimilarity(decomposedQuery, candidate.decomposedTerm),
          lengthDiff: Math.abs(candidate.decomposedTerm.length - decomposedQuery.length),
        }
      })
      .filter((it) => it.normalizedTerm !== normalizedQuery)
      .sort(
        (a, b) =>
          b.similarity - a.similarity ||
          a.lengthDiff - b.lengthDiff ||
          a.normalizedTerm.length - b.normalizedTerm.length,
      )[0]

    if (!bestCandidate) {
      return null
    }

    if (bestCandidate.similarity < this.minimumJamoSimilarity(decomposedQuery.length)) {
      return null
    }

    return bestCandidate.term
  }

  private collectCorrectionCandidates(
    clubs: ClubCorrectionSource[],
    queryLength: number,
  ): CorrectionCandidate[] {

    const splitSearchTerms = (value: string | null | undefined) => {
      if (!value) { return [] }

      return value
        .split(/[\s,./()[\]{}\-_:;!?'"`~|]+/g)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
    }

    const candidates = new Map<string, CorrectionCandidate>()
    const register = (term: string) => {
      const normalizedTerm = this.normalizeSearchTerm(term)
      const decomposedTerm = this.decomposeToJamo(normalizedTerm)
      if (!normalizedTerm || !decomposedTerm) {
        return
      }

      if (!candidates.has(normalizedTerm)) {
        candidates.set(normalizedTerm, {
          term: term.trim(),
          normalizedTerm,
          decomposedTerm,
        })
      }
    }

    const registerExpandedTerms = (value: string | null | undefined) => {
      for (const term of splitSearchTerms(value)) {
        register(term)

        if (term.length <= queryLength + 1) {
          continue
        }

        for (const windowLength of [queryLength, queryLength + 1]) {
          if (windowLength < 2 || windowLength > term.length) {
            continue
          }

          for (let start = 0; start + windowLength <= term.length; start += 1) {
            register(term.slice(start, start + windowLength))
          }
        }
      }
    }

    for (const club of clubs) {
      register(club.name)
      registerExpandedTerms(club.name)
      registerExpandedTerms(club.fullName)
      for (const tag of club.tags ?? []) {
        registerExpandedTerms(tag)
      }
    }

    return Array.from(candidates.values())
  }

  async getCategories(): Promise<ClubCategory[]> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.CALL_GET_CATEGORY_LIST_API,
        params: '{}',
      })
      .catch(console.error)
    return CATEGORIES
  }

  private async getClubReviews(uuids: ClubUuid[]): Promise<
    Map<
      ClubUuid,
      {
        totalReviews: number
        avgRating: number
        reviewKeywords: ReviewKeyword[]
        latestComment: string
      }
    >
  > {
    if (uuids.length === 0) {
      return new Map()
    }
    const reviews = await this.userClubReviewRepository.find({
      where: {
        clubId: In(uuids),
      },
    })
    const clubToRatingKeywords: Map<
      ClubUuid,
      {
        totalReviews: number
        avgRating: number
        latestComment: string
        keywordUpvotes: Map<ReviewKeywordId, number>
      }
    > = this.clubToRatingKeywords(reviews)

    const keywords = await this.clubReviewKeywordRepository.find({
      order: {
        sortOrder: 'ASC',
      },
    })
    const out = uuids.map((uuid: ClubUuid) => {
      const { totalReviews, avgRating, latestComment, keywordUpvotes } = clubToRatingKeywords.get(
        uuid,
      ) ?? {
        totalReviews: 0,
        avgRating: 0,
        latestComment: '',
        keywordUpvotes: new Map<ReviewKeywordId, number>(),
      }
      const reviewKeywords = keywords
        .map((it) => ({
          id: it.id,
          title: it.title,
          color: it.color,
          iconUri: it.iconUri,
          totalUpvotes: keywordUpvotes.get(it.id) ?? 0,
        }))
        // 리뷰가 있는 키워드만 반환하도록 수정함
        .filter((it) => it.totalUpvotes > 0)
        .sort((a, b) => b.totalUpvotes - a.totalUpvotes)
      return [uuid, { totalReviews, avgRating, reviewKeywords, latestComment }] as const
    })
    return new Map(out)
  }

  private clubToRatingKeywords(reviews: UserClubReviewEntity[]): Map<
    ClubUuid,
    {
      totalReviews: number
      avgRating: number
      latestComment: string
      keywordUpvotes: Map<ReviewKeywordId, number>
    }
  > {
    const out = toPairs(groupBy(reviews, (review) => review.clubId)).map(
      ([clubId, reviews]: [ClubUuid, UserClubReviewEntity[]]): [
        ClubUuid,
        {
          totalReviews: number
          avgRating: number
          latestComment: string
          keywordUpvotes: Map<ReviewKeywordId, number>
        },
      ] => {
        const { totalRatings, sumRatings, keywordUpvotes } = this.aggregate(reviews)
        return [
          clubId,
          {
            totalReviews: reviews.length,
            avgRating: totalRatings > 0 ? round(sumRatings / totalRatings, 1) : 0,
            latestComment:
              reviews
                .filter((it) => it.content.length > 0)
                .sort((a, b) => (dayjs(a.updatedAt).isBefore(b.updatedAt) ? 1 : -1))[0]?.content ??
              '',
            keywordUpvotes,
          },
        ]
      },
    )
    return new Map(out)
  }

  private aggregate(reviews: UserClubReviewEntity[]): {
    totalRatings: number
    sumRatings: number
    keywordUpvotes: Map<ReviewKeywordId, number>
  } {
    return reviews.reduce(
      (acc, cur) => {
        if (cur.rating > 0) {
          acc.totalRatings += 1
          acc.sumRatings += cur.rating
        }
        cur.reviewKeywordIds.forEach((keywordId) => {
          acc.keywordUpvotes.set(keywordId, (acc.keywordUpvotes.get(keywordId) ?? 0) + 1)
        })
        return acc
      },
      { totalRatings: 0, sumRatings: 0, keywordUpvotes: new Map<ReviewKeywordId, number>() },
    )
  }

  async updateClub(uuid: string, club: Partial<ClubEntity>): Promise<boolean> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.EDIT_CLUB,
        userDevice: '',
        params: JSON.stringify({
          uuid: uuid,
          club: club,
        }),
        userIp: '',
      })
      .catch(console.error)
    const updated = await this.clubRepository.update(
      {
        uuid: uuid,
      },
      club,
    )
    return !!updated.affected && updated.affected > 0
  }

  async clubManagerRegisterRequest(
    serviceUserId: string,
    { clubId, clubName }: { clubId?: string; clubName?: string },
  ) {
    await this.clubManagerRegisterRequestRepository.insert({ serviceUserId, clubId, clubName })
  }

  async findCandidatesByName(clubName: string | undefined, total = 5): Promise<Club[]> {
    const clubs = await this.clubRepository.find()
    let out = clubs.filter(
      (it) => it.name.includes(clubName ?? '') || it.fullName.includes(clubName ?? ''),
    )
    if (out.length < total) {
      const candidiates = this.similarByEditDistance(
        clubs.filter((it) => !out.includes(it)),
        clubName,
        total,
      )
      out = [...out, ...candidiates]
    }
    return out.slice(0, total).map((it) => toClubDomain(it))
  }

  private similarByEditDistance(
    clubEntities: ClubEntity[],
    clubName: string | undefined,
    total: number,
  ): ClubEntity[] {
    return clubEntities
      .map((it) => ({
        entity: it,
        distance: leven(it.name, clubName ?? ''),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, total)
      .map((it) => it.entity)
  }

  async registerClubManager(serviceUserId: string, clubUuid: string) {
    const club = await this.clubRepository.findOneBy({ uuid: clubUuid })
    if (!club) {
      throw new NotFoundError('club not found')
    }
    const exist = await this.clubManagerRepository.findOneBy({ serviceUserId, clubId: clubUuid })
    if (exist) {
      return
    }
    await this.clubManagerRepository.insert({ serviceUserId, clubId: clubUuid })
  }
}
