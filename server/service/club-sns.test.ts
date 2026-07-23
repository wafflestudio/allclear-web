import { describe, expect, it } from 'vitest'
import { getClubSnsPatch } from './club-sns'

describe('getClubSnsPatch', () => {
  it('copies a legacy SNS URL into the SNS URL list', () => {
    expect(getClubSnsPatch({ sns: 'https://instagram.com/wafflestudio' })).toEqual({
      sns: 'https://instagram.com/wafflestudio',
      snsUrls: ['https://instagram.com/wafflestudio'],
    })
  })

  it('uses the SNS URL list as the source of truth', () => {
    expect(
      getClubSnsPatch({
        sns: 'https://old.example.com',
        sns_urls: [
          'https://instagram.com/wafflestudio',
          'https://youtube.com/@wafflestudio',
        ],
      }),
    ).toEqual({
      sns: 'https://instagram.com/wafflestudio',
      snsUrls: [
        'https://instagram.com/wafflestudio',
        'https://youtube.com/@wafflestudio',
      ],
    })
  })

  it('does not update SNS fields when neither field is provided', () => {
    expect(getClubSnsPatch({})).toEqual({})
  })
})
