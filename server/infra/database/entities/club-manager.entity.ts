import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { TimeStampMixin } from './TimeStampMixin'

@Entity('club_manager')
export class ClubManagerEntity extends TimeStampMixin {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id: number

  @Column('uuid', { name: 'club_id' })
  clubId: string

  @Column({ type: 'uuid', name: 'service_user_id' })
  serviceUserId: string
}
