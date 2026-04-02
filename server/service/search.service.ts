import { ILike, IsNull, Raw, Repository } from 'typeorm'
import { Inject, InjectRepository, Service } from '../provider'
import { ClubEntity, UserActivityLogEntity, UserActivityLogType } from '../infra/database/entities'
import { Club, toClubDomain } from 'server/domain/model/Club'
import { disassemble } from 'es-hangul'
import leven from 'leven'
import { ClubService } from './club.service'
import { sortByPopularAndEachRandom } from '../util/club-sort'
import { PUBLIC_CLUB_STATUS } from 'src/common/constants/club-status'

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

@Service
export class SearchService {
  @InjectRepository(ClubEntity)
  private readonly clubRepository: Repository<ClubEntity>
  @InjectRepository(UserActivityLogEntity)
  private readonly userActivityLogRepository: Repository<UserActivityLogEntity>
  @Inject(ClubService)
  private readonly clubService: ClubService

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
    if (!correctedQuery || correctedQuery === query) {
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

  async findCandidatesByName(clubName: string | undefined, total = 5): Promise<Club[]> {
    const clubs = await this.clubRepository.find({
      where: {
        deletedAt: IsNull(),
      },
    })
    let out = clubs.filter(
      (it) => it.name.includes(clubName ?? '') || it.fullName.includes(clubName ?? ''),
    )
    if (out.length < total) {
      const candidates = this.similarByEditDistance(
        clubs.filter((it) => !out.includes(it)),
        clubName,
        total,
      )
      out = [...out, ...candidates]
    }
    return out.slice(0, total).map((it) => toClubDomain(it))
  }

  private async searchByQuery(query: string): Promise<Club[]> {
    const entities = await this.clubRepository.find({
      where: [
        {
          name: ILike(`%${query}%`),
          status: PUBLIC_CLUB_STATUS,
          deletedAt: IsNull(),
        },
        {
          fullName: ILike(`%${query}%`),
          status: PUBLIC_CLUB_STATUS,
          deletedAt: IsNull(),
        },
        {
          tags: Raw((tagsAlias) => `ARRAY_TO_STRING(${tagsAlias}, ',') ILIKE :query`, {
            query: `%${query}%`,
          }),
          status: PUBLIC_CLUB_STATUS,
          deletedAt: IsNull(),
        },
      ],
    })
    const clubReview = await this.clubService.getClubReviews(entities.map((it) => it.uuid))
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
    if (query.trim().length < 2) {
      return null
    }
    const normalizedQuery = this.normalizeSearchTerm(query)
    const decomposedQuery = this.decomposeToJamo(normalizedQuery)
    if (!decomposedQuery) {
      return null
    }

    const clubs = await this.clubRepository.find({
      select: {
        name: true,
        fullName: true,
        tags: true,
      },
      where: {
        status: PUBLIC_CLUB_STATUS,
        deletedAt: IsNull(),
      },
    })

    const candidateTerms = this.collectCorrectionCandidates(clubs, normalizedQuery.length)

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
}
