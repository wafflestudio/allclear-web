export const CLUB_RECRUITMENT_TERMS = ['1', '2', '여름', '겨울'] as const

export type ClubRecruitmentTerm = (typeof CLUB_RECRUITMENT_TERMS)[number]

export const CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES = ['동방', '동방 외', '미정'] as const

export type ClubRecruitmentActivityLocationType =
  (typeof CLUB_RECRUITMENT_ACTIVITY_LOCATION_TYPES)[number]
