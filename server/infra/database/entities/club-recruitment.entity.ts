import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { formatYearMonth } from 'src/common/utils/formatYearMonth'

@Entity('club_recruitment')
@Index('idx_recruitment_club_id', ['clubId'])
@Index('idx_recruitment_deadline', ['deadline'])
@Index('idx_unique_club_month_active', ['clubId', 'yearMonth'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class ClubRecruitmentEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'id' })
  id: string

  @Column({ type: 'uuid', name: 'club_id' })
  clubId: string

  @Column({ type: 'varchar', default: '', name: 'description' })
  description: string

  @Column({ type: 'varchar', default: '미정', name: 'recruit_type' })
  recruitType: string

  @Column({ type: 'int', name: 'recruit_year' })
  recruitYear: number

  @Column({ type: 'varchar', name: 'recruit_term' })
  recruitTerm: string

  @Column({ type: 'timestamp with time zone', name: 'deadline' })
  deadline: string

  @Column({ type: 'int', nullable: true, name: 'recruit_count' })
  recruitCount: number | null

  @Column({ type: 'varchar', default: '', name: 'recruit_count_text' })
  recruitCountText: string

  @Column({ type: 'boolean', default: false, name: 'is_college_limited' })
  isCollegeLimited: boolean

  @Column({ type: 'varchar', default: '', name: 'eligibility_text' })
  eligibilityText: string

  @Column({ type: 'varchar', default: '', name: 'application_url' })
  applicationUrl: string

  @Column({ type: 'varchar', default: '', name: 'application_process' })
  applicationProcess: string

  @Column({ type: 'boolean', default: false, name: 'has_membership_fee' })
  hasMembershipFee: boolean

  @Column({ type: 'varchar', nullable: true, name: 'membership_fee_text' })
  membershipFeeText: string | null

  @Column({ type: 'varchar', default: '미정', name: 'activity_location_type' })
  activityLocationType: string

  @Column({ type: 'varchar', default: '', name: 'activity_location_text' })
  activityLocationText: string

  @Column({ type: 'varchar', default: '', name: 'main_activities' })
  mainActivities: string

  @Column({ type: 'varchar', nullable: true, name: 'extra_info' })
  extraInfo: string | null

  @Column({ type: 'varchar', name: 'year_month' })
  yearMonth: string

  @CreateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'NOW()',
    name: 'created_at',
  })
  createdAt: string

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    default: () => 'NOW()',
    onUpdate: 'NOW()',
    name: 'updated_at',
  })
  updatedAt: string

  @DeleteDateColumn({
    type: 'timestamp with time zone',
    nullable: true,
    select: false,
    name: 'deleted_at',
  })
  deletedAt: string | null

  // year_month는 created_at 기준 파생 컬럼이라 저장 직전에 함께 맞춘다.
  @BeforeInsert()
  @BeforeUpdate()
  syncYearMonth() {
    const createdAt = this.createdAt ?? new Date().toISOString()
    this.createdAt = createdAt
    this.yearMonth = formatYearMonth(createdAt)
  }
}
