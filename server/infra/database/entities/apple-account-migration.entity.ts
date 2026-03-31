import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { BaseTimeStampMixin } from './TimeStampMixin'
import { AccountEntity } from './account.entity'
import { AppleAccountMigrationStatus } from './apple-account-migration-status.enum'

@Entity('apple_account_migration')
@Index('uq_apple_account_migration_account_id', ['accountId'], { unique: true })
@Index('uq_apple_account_migration_old_sub', ['oldSub'], { unique: true })
@Index('uq_apple_account_migration_transfer_identifier', ['transferIdentifier'], {
  unique: true,
  where: '"transfer_identifier" IS NOT NULL',
})
@Index('uq_apple_account_migration_new_sub', ['newSub'], {
  unique: true,
  where: '"new_sub" IS NOT NULL',
})
@Index('ix_apple_account_migration_status', ['status'])
@Index('ix_apple_account_migration_bundle_status', ['appBundleId', 'status'])
export class AppleAccountMigrationEntity extends BaseTimeStampMixin {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string

  @ManyToOne(() => AccountEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id' })
  account: AccountEntity

  @Column({ type: 'varchar', length: 128, name: 'app_bundle_id' })
  appBundleId: string

  @Column({ type: 'varchar', length: 32, name: 'source_team_id' })
  sourceTeamId: string

  @Column({ type: 'varchar', length: 32, name: 'target_team_id' })
  targetTeamId: string

  @Column({ type: 'varchar', length: 255, name: 'old_sub' })
  oldSub: string

  @Column({ type: 'text', nullable: true, name: 'transfer_identifier' })
  transferIdentifier: string | null

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'new_sub' })
  newSub: string | null

  @Column({
    type: 'enum',
    enum: AppleAccountMigrationStatus,
    default: AppleAccountMigrationStatus.PENDING,
    name: 'status',
  })
  status: AppleAccountMigrationStatus

  @Column({
    type: 'timestamp',
    precision: 6,
    nullable: true,
    name: 'transfer_identifier_collected_at',
  })
  transferIdentifierCollectedAt: string | null

  @Column({ type: 'timestamp', precision: 6, nullable: true, name: 'new_sub_collected_at' })
  newSubCollectedAt: string | null

  @Column({ type: 'timestamp', precision: 6, nullable: true, name: 'migrated_at' })
  migratedAt: string | null

  @Column({ type: 'text', nullable: true, name: 'last_error' })
  lastError: string | null
}
