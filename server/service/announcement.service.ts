import { Repository } from 'typeorm'
import { Inject, InjectRepository, Service } from '../provider'
import { AnnouncementDismissEntity, AnnouncementEntity } from '../infra/database/entities'
import { UserService } from './user.service'
import { Announcement, toAnnouncementDomain } from '../domain/model/Announcement'

@Service
export class AnnouncementService {
  @InjectRepository(AnnouncementEntity)
  private readonly announcementRepository: Repository<AnnouncementEntity>
  @InjectRepository(AnnouncementDismissEntity)
  private readonly announcementDismissRepository: Repository<AnnouncementDismissEntity>
  @Inject(UserService)
  private readonly userService: UserService

  async listVisibleAnnouncements(accountId?: string | null): Promise<Announcement[]> {
    let dismissedAnnouncementIds: number[] = []

    if (accountId) {
      const user = await this.userService.getUserByAccountId(accountId)
      const dismisses = await this.announcementDismissRepository.findBy({
        userId: user.id,
      })
      dismissedAnnouncementIds = dismisses.map((dismiss) => dismiss.announcementId)
    }

    const query = this.announcementRepository
      .createQueryBuilder('announcement')
      .where('announcement.active = true')
      .andWhere('announcement.start_at <= NOW()')
      .andWhere('(announcement.end_at IS NULL OR announcement.end_at >= NOW())')
      .orderBy('announcement.start_at', 'DESC')
      .addOrderBy('announcement.created_at', 'DESC')

    if (dismissedAnnouncementIds.length > 0) {
      query.andWhere('announcement.id NOT IN (:...dismissedAnnouncementIds)', {
        dismissedAnnouncementIds,
      })
    }

    const entities = await query.getMany()
    return entities.map(toAnnouncementDomain)
  }
}
