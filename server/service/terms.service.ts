import { Repository } from 'typeorm'
import { InjectRepository, Service } from '../provider'
import { TermsAgreementEntity, TermsEntity } from '../infra/database/entities'
import { Terms, toTermsDomain } from '../domain/model/Terms'

@Service
export class TermsService {
  @InjectRepository(TermsEntity)
  private readonly termsRepository: Repository<TermsEntity>
  @InjectRepository(TermsAgreementEntity)
  private readonly termsAgreementRepository: Repository<TermsAgreementEntity>

  async listUnagreedTerms(userId: string): Promise<Terms[]> {
    const agreements = await this.termsAgreementRepository.findBy({
      userId,
    })
    const agreedTermsIds = agreements.map((agreement) => agreement.termsId)

    const query = this.termsRepository
      .createQueryBuilder('terms')
      .where('terms.active = true')
      .orderBy('terms.created_at', 'DESC')

    if (agreedTermsIds.length > 0) {
      query.andWhere('terms.id NOT IN (:...agreedTermsIds)', {
        agreedTermsIds,
      })
    }

    const entities = await query.getMany()
    return entities.map(toTermsDomain)
  }
}
