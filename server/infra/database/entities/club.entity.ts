import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('club')
@Index('ux_club_uuid', ['uuid'])
@Index('ux_club_authkey', ['authkey'])
@Index('ix_club_category', ['category'])
@Index('ix_club_ispopular', ['isPopular'])
export class ClubEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid: string

  @Column({ type: 'varchar', name: 'name' })
  name: string

  @Column({ type: 'varchar', default: '', name: 'full_name' })
  fullName: string

  @Column({ type: 'varchar', default: '', name: 'description' })
  description: string

  @Column({ type: 'varchar', default: '', name: 'type' })
  type: string

  @Column({ type: 'varchar', default: '', name: 'category' })
  category: string

  @Column({ type: 'varchar', default: '', nullable: true, name: 'college' })
  college: string | null

  @Column({ type: 'varchar', default: '', length: 300, name: 'image_uri' })
  imageUri: string

  @Column({ type: 'varchar', default: '', nullable: true, name: 'thumbnail_uri' })
  thumbnailUri: string | null

  @Column({ type: 'character varying', array: true, default: '', nullable: true, name: 'tags' })
  tags: string[]

  @Column({ type: 'varchar', default: '', name: 'article', nullable: true })
  article: string | null

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'article_uploaded_at' })
  articleUploadedAt: string | null

  @Column({ type: 'boolean', default: false, name: 'is_popular' })
  isPopular: boolean

  @Column({ type: 'boolean', default: false, name: 'has_dongbang' })
  hasDongbang: boolean

  @Column({ type: 'varchar', default: '', nullable: true, name: 'activity_cycle' })
  activityCycle: string | null

  @Column({ type: 'varchar', default: '', nullable: true, name: 'membership_fee' })
  membershipFee: string | null

  @Column({ type: 'varchar', default: '', nullable: true, name: 'recruit_type' })
  recruitType: string | null

  @Column({ type: 'varchar', default: '', nullable: true, name: 'introduction' })
  introduction: string | null

  @Column({ type: 'text', nullable: true, name: 'blur_image' })
  blurImage: string | null

  @Column({ type: 'varchar', nullable: true, name: 'blur_hash' })
  blurHash: string | null

  @Column({ type: 'uuid', select: false, unique: true, name: 'authkey' })
  authkey: string

  @Column({ type: 'timestamp with time zone', default: () => 'NOW()', name: 'created_at' })
  createdAt: string

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'deleted_at' })
  deletedAt: string | null
}
