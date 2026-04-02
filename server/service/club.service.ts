import { In, IsNull, Repository } from 'typeorm'
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
import { NotFoundError } from '../domain/error'
import { sortByPopularAndEachRandom } from '../util/club-sort'
import { v4 as uuidv4 } from 'uuid'
import {
  PENDING_CLUB_STATUS,
  PUBLIC_CLUB_STATUS,
  REJECTED_CLUB_STATUS,
} from 'src/common/constants/club-status'
import type {
  ClubCreationDecision,
  CreateClubCreationRequest,
} from 'src/lib/schemas/managers'

type ClubUuid = string
type ReviewKeywordId = string

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
    const club = await this.getClubEntityByUuid(uuid)
    const clubReview = await this.getClubReviews([club.uuid])
    return toClubDomain(club, clubReview.get(club.uuid))
  }

  async findPublicByUuid(uuid: string): Promise<Club> {
    this.userActivityLogRepository
      .insert({
        type: UserActivityLogType.CALL_GET_CLUB_API,
        params: JSON.stringify({ uuid }),
      })
      .catch(console.error)
    const club = await this.getPublicClubEntityByUuid(uuid)
    const clubReview = await this.getClubReviews([club.uuid])
    return toClubDomain(club, clubReview.get(club.uuid))
  }

  async findByAuthKey(authkey: string): Promise<Club> {
    const club = await this.clubRepository.findOneByOrFail({
      authkey,
      deletedAt: IsNull(),
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
      status: PUBLIC_CLUB_STATUS,
      deletedAt: IsNull(),
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
      deletedAt: IsNull(),
    })
    return clubs.map((it) => toClubDomain(it))
  }

  async findClubsReviewedByMe(serviceUserId: string): Promise<Club[]> {
    const clubReviews = await this.userClubReviewRepository.findBy({ serviceUserId })
    const clubIds = Array.from(new Set(clubReviews.map((it) => it.clubId)))
    const club = await this.clubRepository.findBy({
      uuid: In(clubIds),
      deletedAt: IsNull(),
    })
    return club.map((it) => toClubDomain(it))
  }

  async findMySavedClubs(serviceUserId: string): Promise<Club[]> {
    const savedClubs = await this.userSavedClubRepository.findBy({ serviceUserId })
    const clubIds = Array.from(new Set(savedClubs.map((it) => it.clubId)))
    const club = await this.clubRepository.findBy({
      uuid: In(clubIds),
      deletedAt: IsNull(),
    })
    return club.map((it) => toClubDomain(it))
  }

  async saveClubToMyCollection(serviceUserId: string, clubId: string) {
    await this.getPublicClubEntityByUuid(clubId)
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
      status: PUBLIC_CLUB_STATUS,
      deletedAt: IsNull(),
    })
    const clubReview = await this.getClubReviews(entities.map((it) => it.uuid))
    const clubs = entities.map((it) => toClubDomain(it, clubReview.get(it.uuid)))
    return sortByPopularAndEachRandom(clubs)
  }

  async findLatestUploaded(topN = 20): Promise<Club[]> {
    const entities = await this.clubRepository.find({
      where: {
        status: PUBLIC_CLUB_STATUS,
        deletedAt: IsNull(),
      },
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

  async createClubCreationRequest(
    serviceUserId: string,
    club: CreateClubCreationRequest,
  ): Promise<Club> {
    const now = new Date().toISOString()
    const createdClub = await this.clubRepository.manager.transaction(async (manager) => {
      const clubRepository = manager.getRepository(ClubEntity)
      const clubManagerRepository = manager.getRepository(ClubManagerEntity)

      const entity = clubRepository.create({
        name: club.name,
        fullName: club.fullName,
        description: club.fullName,
        type: club.type,
        category: club.category,
        college: club.college,
        affiliationType: club.affiliationType,
        collegeMajorId: club.collegeMajorId ?? null,
        tags: club.tags,
        article: club.detail ?? '',
        articleUploadedAt: (club.detail ?? '').trim() ? now : null,
        recruitType: club.recruitType ?? null,
        introduction: club.introduction ?? '',
        authkey: uuidv4(),
        status: PENDING_CLUB_STATUS,
        approvedAt: null,
        rejectReason: '',
      })

      const created = await clubRepository.save(entity)
      await clubManagerRepository.insert({
        clubId: created.uuid,
        serviceUserId,
      })
      return created
    })

    return toClubDomain(createdClub)
  }

  async decideClubCreationRequest(
    clubUuid: string,
    decision: ClubCreationDecision,
  ): Promise<Club> {
    await this.getClubEntityByUuid(clubUuid)

    await this.clubRepository.update(
      {
        uuid: clubUuid,
        deletedAt: IsNull(),
      },
      {
        status: decision.status,
        approvedAt: decision.status === PUBLIC_CLUB_STATUS ? new Date().toISOString() : null,
        rejectReason:
          decision.status === REJECTED_CLUB_STATUS ? decision.rejectReason?.trim() ?? '' : '',
      },
    )

    const club = await this.getClubEntityByUuid(clubUuid)
    const clubReview = await this.getClubReviews([club.uuid])
    return toClubDomain(club, clubReview.get(club.uuid))
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

  async getClubReviews(uuids: ClubUuid[]): Promise<
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

  async registerClubManager(serviceUserId: string, clubUuid: string) {
    await this.getClubEntityByUuid(clubUuid)
    const exist = await this.clubManagerRepository.findOneBy({ serviceUserId, clubId: clubUuid })
    if (exist) {
      return
    }
    await this.clubManagerRepository.insert({ serviceUserId, clubId: clubUuid })
  }

  private async getClubEntityByUuid(uuid: string): Promise<ClubEntity> {
    const club = await this.clubRepository.findOneBy({
      uuid,
      deletedAt: IsNull(),
    })
    if (!club) {
      throw new NotFoundError('club not found')
    }
    return club
  }

  private async getPublicClubEntityByUuid(uuid: string): Promise<ClubEntity> {
    const club = await this.clubRepository.findOneBy({
      uuid,
      status: PUBLIC_CLUB_STATUS,
      deletedAt: IsNull(),
    })
    if (!club) {
      throw new NotFoundError('club not found')
    }
    return club
  }
}
