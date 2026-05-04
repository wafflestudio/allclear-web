import { In, Repository } from 'typeorm'
import { InjectRepository, Service } from '../provider'
import { ClubEntity } from '../infra/database/entities'
import { ClubManagerEntity } from '../infra/database/entities/club-manager.entity'
import { PENDING_CLUB_STATUS } from 'src/common/constants/club-status'

export type PendingClubItem = {
  uuid: string
  name: string
  category: string
  affiliation: string
  short_description: string
  created_at: string
  manager: {
    name: string
    phone: string
    student_id: string
  }
}

@Service
export class AdminClubService {
  @InjectRepository(ClubEntity)
  private readonly clubRepository: Repository<ClubEntity>

  @InjectRepository(ClubManagerEntity)
  private readonly clubManagerRepository: Repository<ClubManagerEntity>

  async getPendingClubs(): Promise<PendingClubItem[]> {
    const clubs = await this.clubRepository.find({
      where: { status: PENDING_CLUB_STATUS },
      order: { createdAt: 'ASC' },
    })

    if (clubs.length === 0) return []

    const managers = await this.clubManagerRepository.findBy({
      clubId: In(clubs.map((c) => c.uuid)),
    })
    const managerMap = new Map(managers.map((m) => [m.clubId, m]))

    return clubs.map((club) => {
      const manager = managerMap.get(club.uuid)
      return {
        uuid: club.uuid,
        name: club.name,
        category: club.category,
        affiliation:
          club.affiliationType === '소속동아리'
            ? club.collegeMajor?.major ?? club.collegeMajor?.college ?? ''
            : club.affiliationType,
        short_description: club.shortDescription,
        created_at: club.createdAt,
        manager: {
          name: manager?.name ?? '',
          phone: manager?.phone ?? '',
          student_id: manager?.studentId ?? '',
        },
      }
    })
  }
}
