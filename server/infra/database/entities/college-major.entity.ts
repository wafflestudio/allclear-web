import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { TimeStampMixin } from './TimeStampMixin'

@Entity('college_major')
export class CollegeMajorEntity extends TimeStampMixin {
  @PrimaryGeneratedColumn('increment', { name: 'id' })
  id: number

  @Column({ type: 'varchar', length: 50, default: '', name: 'college' })
  college: string

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'major' })
  major: string | null
}
