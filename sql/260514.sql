/*
- 사용자별 최근 검색어 저장 테이블 추가
- 사용자별 최신순 조회를 위한 (service_user_id, created_at DESC) 인덱스
- 같은 사용자의 같은 검색어 중복을 막기 위한 (service_user_id, query) unique 인덱스
*/

CREATE TABLE IF NOT EXISTS public.user_recent_search (
  id BIGSERIAL PRIMARY KEY,
  service_user_id UUID NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
);

CREATE INDEX IF NOT EXISTS ix_user_recent_search_service_user_created_at
  ON public.user_recent_search (service_user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_recent_search_service_user_query
  ON public.user_recent_search (service_user_id, query);
