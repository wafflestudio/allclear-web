import { IsNull, QueryFailedError, Repository } from 'typeorm'
import { InjectRepository, Service } from '../provider'
import { ClubEntity } from '../infra/database/entities'
import { ClubManagerEntity } from '../infra/database/entities/club-manager.entity'
import { ClubRecruitmentEntity } from '../infra/database/entities/club-recruitment.entity'
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
    const entity = this.clubRecruitmentRepository.create({
      clubId: clubUuid,
      ...this.toPersistencePayload(recruitment),
      createdAt: now,
      updatedAt: now,
      yearMonth: formatYearMonth(now),
    })

    const saved = await this.saveOrThrowConflict(entity)
    return toClubRecruitmentDomain(saved)
  }

  async updateRecruitment(
    clubUuid: string,
    recruitmentId: string,
    serviceUserId: string,
    recruitment: UpsertClubRecruitment,
  ): Promise<ClubRecruitment> {
    const entity = await this.getManagedRecruitmentEntity(clubUuid, recruitmentId, serviceUserId)

    Object.assign(entity, this.toPersistencePayload(recruitment), {
      updatedAt: new Date().toISOString(),
      yearMonth: formatYearMonth(entity.createdAt),
    })

    const saved = await this.saveOrThrowConflict(entity)
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
    'id' | 'clubId' | 'yearMonth' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'syncYearMonth'
  > {
    return {
      description: recruitment.description,
      recruitType: recruitment.recruitType,
      recruitYear: recruitment.recruitYear,
      recruitTerm: recruitment.recruitTerm,
      deadline: new Date(recruitment.deadline).toISOString(),
      recruitCount: recruitment.recruitCount,
      recruitCountText: recruitment.recruitCountText,
      isCollegeLimited: recruitment.isCollegeLimited,
      eligibilityText: recruitment.eligibilityText,
      applicationUrl: recruitment.applicationUrl,
      applicationProcess: recruitment.applicationProcess,
      hasMembershipFee: recruitment.hasMembershipFee,
      membershipFeeText: recruitment.membershipFeeText,
      activityLocationType: recruitment.activityLocationType,
      activityLocationText: recruitment.activityLocationText,
      mainActivities: recruitment.mainActivities,
      extraInfo: recruitment.extraInfo,
    }
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
  ): Promise<ClubRecruitmentEntity> {
    const recruitment = await this.clubRecruitmentRepository.findOneBy({
      id: recruitmentId,
      clubId: clubUuid,
      deletedAt: IsNull(),
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

  private async saveOrThrowConflict(entity: ClubRecruitmentEntity): Promise<ClubRecruitmentEntity> {
    try {
      return await this.clubRecruitmentRepository.save(entity)
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
