import { FindOptionsWhere, ILike, In, IsNull, Repository } from 'typeorm'
import { InjectRepository, Service } from 'server/provider'
import { ClubEntity } from 'server/infra/database/entities'
import { CollegeMajorEntity } from 'server/infra/database/entities/college-major.entity'
import { PUBLIC_CLUB_STATUS } from 'src/common/constants/club-status'
import { SearchFilters } from './search.types'

@Service
export class SearchQueryService {
  @InjectRepository(ClubEntity)
  private readonly clubRepository: Repository<ClubEntity>

  @InjectRepository(CollegeMajorEntity)
  private readonly collegeMajorRepository: Repository<CollegeMajorEntity>

  async search(query: string, _filters: SearchFilters = {}): Promise<ClubEntity[]> {
    const [textMatchedEntities, collegeMajorMatchedEntities] = await Promise.all([
      this.findByText(query),
      this.findByCollegeMajor(query),
    ])

    return this.dedupe([...textMatchedEntities, ...collegeMajorMatchedEntities])
  }

  private findByText(query: string): Promise<ClubEntity[]> {
    return this.clubRepository.find({
      where: [
        {
          name: ILike(`%${query}%`),
          status: PUBLIC_CLUB_STATUS,
          deletedAt: IsNull(),
        },
        {
          shortDescription: ILike(`%${query}%`),
          status: PUBLIC_CLUB_STATUS,
          deletedAt: IsNull(),
        },
      ],
    })
  }

  private async findByCollegeMajor(query: string): Promise<ClubEntity[]> {
    const majorIds = await this.findMatchingCollegeMajorIds(query)
    if (majorIds.length === 0) {
      return []
    }

    return this.clubRepository.find({
      where: {
        collegeMajorId: In(majorIds),
        status: PUBLIC_CLUB_STATUS,
        deletedAt: IsNull(),
      },
    })
  }

  private async findMatchingCollegeMajorIds(query: string): Promise<number[]> {
    const where: FindOptionsWhere<CollegeMajorEntity>[] = [
      {
        college: ILike(`%${query}%`),
        major: IsNull(),
      },
      { major: ILike(`%${query}%`) },
    ]

    const collegeMajors = await this.collegeMajorRepository.find({ where })
    return collegeMajors.map((it) => it.id)
  }

  private dedupe(entities: ClubEntity[]): ClubEntity[] {
    return Array.from(new Map(entities.map((it) => [it.uuid, it])).values())
  }
}
