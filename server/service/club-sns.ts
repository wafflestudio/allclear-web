type ClubSnsInput = {
  sns?: string
  sns_urls?: string[]
}

type ClubSnsPatch = {
  sns?: string
  snsUrls?: string[]
}

export const getClubSnsPatch = ({ sns, sns_urls }: ClubSnsInput): ClubSnsPatch => {
  if (sns_urls !== undefined) {
    return {
      sns: sns_urls[0],
      snsUrls: sns_urls,
    }
  }

  if (sns !== undefined) {
    return {
      sns,
      snsUrls: [sns],
    }
  }

  return {}
}
