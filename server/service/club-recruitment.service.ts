import { IsNull, QueryFailedError, Repository } from 'typeorm'
import { InjectRepository, Service } from '../provider'
import { ClubEntity } from '../infra/database/entities'
import { ClubManagerEntity } from '../infra/database/entities/club-manager.entity'
import { ClubRecruitmentEntity } from '../infra/database/entities/club-recruitment.entity'
import { RegularMeetingEntity } from '../infra/database/entities/regular-meeting.entity'
import { ConflictError, NotFoundError } from '../domain/error'
import { PUBLIC_CLUB_STATUS } from 'src/common/constants/club-status'
import { ClubRecruitment, toClubRecruitmentDomain } from '../domain/model/ClubRecruitment'
import { UpsertClubRecruitment } from 'src/lib/schemas/club-recruitments'
import { formatYearMonth } from 'src/common/utils/formatYearMonth'

@Service
export class ClubRecruitmentService {
  @InjectRepository(ClubEntity)
  private readonly clubRepository: Repository<ClubEntity>
  @InjectRepository(ClubManagerEntity)
  private readonly clubManagerRepository: Repository<ClubManagerEntity>
  @InjectRepository(ClubRecruitmentEntity)
  private readonly clubRecruitmentRepository: Repository<ClubRecruitmentEntity>

  async findPublicRecruitmentsByClub(clubUuid: string): Promise<ClubRecruitment[]> {
    await this.assertPublicClubExists(clubUuid)
    const recruitments = await this.clubRecruitmentRepository.find({
      where: {
        clubId: clubUuid,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    })

    return recruitments.map((it) => toClubRecruitmentDomain(it))
  }

  async findPublicRepresentativeRecruitmentByClub(
    clubUuid: string,
  ): Promise<ClubRecruitment | null> {
    await this.assertPublicClubExists(clubUuid)
    const recruitment = await this.clubRecruitmentRepository.findOne({
      where: {
        clubId: clubUuid,
        deletedAt: IsNull(),
      },
      order: {
        yearMonth: 'DESC',
        createdAt: 'DESC',
      },
    })

    return recruitment ? toClubRecruitmentDomain(recruitment) : null
  }

  async findPublicRecruitmentById(
    clubUuid: string,
    recruitmentId: string,
  ): Promise<ClubRecruitment> {
    await this.assertPublicClubExists(clubUuid)
    const recruitment = await this.getRecruitmentEntity(clubUuid, recruitmentId)
    return toClubRecruitmentDomain(recruitment)
  }

  async findManagedRecruitmentsByClub(
    clubUuid: string,
    serviceUserId: string,
  ): Promise<ClubRecruitment[]> {
    await this.assertManagedClubExists(clubUuid, serviceUserId)
    const recruitments = await this.clubRecruitmentRepository.find({
      where: {
        clubId: clubUuid,
        deletedAt: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    })

    return recruitments.map((it) => toClubRecruitmentDomain(it))
  }

  async findManagedRecruitmentById(
    clubUuid: string,
    recruitmentId: string,
    serviceUserId: string,
  ): Promise<ClubRecruitment> {
    const recruitment = await this.getManagedRecruitmentEntity(
      clubUuid,
      recruitmentId,
      serviceUserId,
    )
    return toClubRecruitmentDomain(recruitment)
  }

  async createRecruitment(
    clubUuid: string,
    serviceUserId: string,
    recruitment: UpsertClubRecruitment,
  ): Promise<ClubRecruitment> {
    await this.assertManagedClubExists(clubUuid, serviceUserId)

    const now = new Date().toISOString()
    const saved = await this.clubRecruitmentRepository.manager.transaction(async (manager) => {
      const clubRecruitmentRepository = manager.getRepository(ClubRecruitmentEntity)
      const regularMeetingRepository = manager.getRepository(RegularMeetingEntity)
      const entity = clubRecruitmentRepository.create({
        clubId: clubUuid,
        ...this.toPersistencePayload(recruitment),
        createdAt: now,
        updatedAt: now,
        yearMonth: formatYearMonth(now),
      })

      const created = await this.saveOrThrowConflict(entity, clubRecruitmentRepository)
      const regularMeetings = this.toRegularMeetingEntities(recruitment.regularMeetings).map(
        (regularMeeting) => ({
          ...regularMeeting,
          clubRecruitmentId: created.id,
        }),
      )
      if (regularMeetings.length > 0) {
        await regularMeetingRepository.insert(regularMeetings)
      }
      return this.getRecruitmentEntity(clubUuid, created.id, clubRecruitmentRepository)
    })
    return toClubRecruitmentDomain(saved)
  }

  async updateRecruitment(
    clubUuid: string,
    recruitmentId: string,
    serviceUserId: string,
    recruitment: UpsertClubRecruitment,
  ): Promise<ClubRecruitment> {
    const entity = await this.getManagedRecruitmentEntity(clubUuid, recruitmentId, serviceUserId)

    const saved = await this.clubRecruitmentRepository.manager.transaction(async (manager) => {
      const clubRecruitmentRepository = manager.getRepository(ClubRecruitmentEntity)
      const regularMeetingRepository = manager.getRepository(RegularMeetingEntity)

      Object.assign(entity, this.toPersistencePayload(recruitment), {
        regularMeetings: [],
        updatedAt: new Date().toISOString(),
        yearMonth: formatYearMonth(entity.createdAt),
      })

      await regularMeetingRepository.delete({ clubRecruitmentId: entity.id })
      const updated = await this.saveOrThrowConflict(entity, clubRecruitmentRepository)
      const regularMeetings = this.toRegularMeetingEntities(recruitment.regularMeetings).map(
        (regularMeeting) => ({
          ...regularMeeting,
          clubRecruitmentId: updated.id,
        }),
      )
      if (regularMeetings.length > 0) {
        await regularMeetingRepository.insert(regularMeetings)
      }
      return this.getRecruitmentEntity(clubUuid, recruitmentId, clubRecruitmentRepository)
    })

    return toClubRecruitmentDomain(saved)
  }

  async deleteRecruitment(
    clubUuid: string,
    recruitmentId: string,
    serviceUserId: string,
  ): Promise<void> {
    const recruitment = await this.getManagedRecruitmentEntity(
      clubUuid,
      recruitmentId,
      serviceUserId,
    )
    await this.clubRecruitmentRepository.softDelete(recruitment.id)
  }

  private toPersistencePayload(
    recruitment: UpsertClubRecruitment,
  ): Omit<
    ClubRecruitmentEntity,
    | 'id'
    | 'clubId'
    | 'regularMeetings'
    | 'yearMonth'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
    | 'syncYearMonth'
  > {
    return {
      title: recruitment.title,
      deadline: new Date(recruitment.deadline).toISOString(),
      isMandatory: recruitment.isMandatory,
      hasRegularMeeting: recruitment.hasRegularMeeting,
      activityLocationType: recruitment.activityLocationType,
      activityLocationText: recruitment.activityLocationText,
      hasEligibility: recruitment.hasEligibility,
      eligibilityText: recruitment.eligibilityText,
      hasCapacityLimit: recruitment.hasCapacityLimit,
      capacityLimitText: recruitment.capacityLimitText,
      hasMembershipFee: recruitment.hasMembershipFee,
      membershipFeeText: recruitment.membershipFeeText,
      applicationUrl: recruitment.applicationUrl,
      applicationProcess: recruitment.applicationProcess,
      fullRecruitmentText: recruitment.fullRecruitmentText,
      imageUrls: recruitment.imageUrls,
    }
  }

  private toRegularMeetingEntities(
    regularMeetings: UpsertClubRecruitment['regularMeetings'],
  ): Partial<RegularMeetingEntity>[] {
    return regularMeetings.map((regularMeeting) => ({
      dayOfWeek: regularMeeting.dayOfWeek,
      startTime: regularMeeting.startTime,
      endTime: regularMeeting.endTime,
    }))
  }

  private async getManagedRecruitmentEntity(
    clubUuid: string,
    recruitmentId: string,
    serviceUserId: string,
  ): Promise<ClubRecruitmentEntity> {
    await this.assertManagedClubExists(clubUuid, serviceUserId)
    return this.getRecruitmentEntity(clubUuid, recruitmentId)
  }

  private async getRecruitmentEntity(
    clubUuid: string,
    recruitmentId: string,
    repository: Repository<ClubRecruitmentEntity> = this.clubRecruitmentRepository,
  ): Promise<ClubRecruitmentEntity> {
    const recruitment = await repository.findOne({
      where: {
        id: recruitmentId,
        clubId: clubUuid,
        deletedAt: IsNull(),
      },
    })

    if (!recruitment) {
      throw new NotFoundError('recruitment not found')
    }

    return recruitment
  }

  private async assertPublicClubExists(clubUuid: string): Promise<void> {
    const club = await this.clubRepository.findOneBy({
      uuid: clubUuid,
      status: PUBLIC_CLUB_STATUS,
      deletedAt: IsNull(),
    })

    if (!club) {
      throw new NotFoundError('club not found')
    }
  }

  private async assertManagedClubExists(clubUuid: string, serviceUserId: string): Promise<void> {
    const [club, clubManager] = await Promise.all([
      this.clubRepository.findOneBy({
        uuid: clubUuid,
        deletedAt: IsNull(),
      }),
      this.clubManagerRepository.findOneBy({
        clubId: clubUuid,
        serviceUserId,
      }),
    ])

    if (!club || !clubManager) {
      throw new NotFoundError('club not found')
    }
  }

  private async saveOrThrowConflict(
    entity: ClubRecruitmentEntity,
    repository: Repository<ClubRecruitmentEntity> = this.clubRecruitmentRepository,
  ): Promise<ClubRecruitmentEntity> {
    try {
      return await repository.save(entity)
    } catch (error) {
      if (this.isMonthlyRecruitmentConflict(error)) {
        throw new ConflictError('recruitment already exists for this month')
      }
      throw error
    }
  }

  private isMonthlyRecruitmentConflict(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false
    }

    const driverError = (
      error as QueryFailedError & {
        driverError?: { code?: string; constraint?: string }
      }
    ).driverError

    return (
      driverError?.code === '23505' && driverError?.constraint === 'idx_unique_club_month_active'
    )
  }
}
