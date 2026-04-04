ALTER TABLE club
  ADD COLUMN short_description character varying NOT NULL DEFAULT '',
  ADD COLUMN dongbang_location character varying DEFAULT '',
  ADD COLUMN min_activity_period integer NOT NULL DEFAULT 0,
  ADD COLUMN active_member_count integer NOT NULL DEFAULT 0,
  ADD COLUMN sns character varying NOT NULL DEFAULT '';


UPDATE club
SET recruit_type = CASE 
    WHEN recruit_type = '' OR recruit_type IS NULL THEN '미정'
    WHEN recruit_type IN ('매 학기', '매 년') THEN '정기'
    ELSE recruit_type -- 그 외 '정기' 등 기존 값은 그대로 유지
END
WHERE recruit_type IN ('', '매 학기', '매 년') OR recruit_type IS NULL;


ALTER TABLE club
  ADD CONSTRAINT chk_affiliation_type 
  CHECK (affiliation_type IN ('중앙동아리', '소속동아리', '연합동아리', '기타'));

ALTER TABLE club
  ADD CONSTRAINT chk_club_status 
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

ALTER TABLE club 
	ADD CONSTRAINT chk_club_recruit_type 
	CHECK (recruit_type IN ('정기', '상시', '미정'));


ALTER TABLE public.club_manager
  ADD COLUMN name character varying NOT NULL DEFAULT '',
  ADD COLUMN phone character varying NOT NULL DEFAULT '',
  ADD COLUMN student_id character varying NOT NULL DEFAULT '';


CREATE TABLE public.club_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  club_id uuid NOT NULL,
  service_user_id uuid NOT NULL,
  before_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_history_club_id ON public.club_history(club_id);
CREATE INDEX idx_club_history_created_at ON public.club_history(created_at DESC);


CREATE TABLE public.club_recruitment (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  club_id uuid NOT NULL,
  description character varying NOT NULL DEFAULT ''::character varying,
  recruit_type character varying NOT NULL DEFAULT '미정'::character varying, -- 정기, 상시, 미정
  recruit_year integer NOT NULL,
  recruit_term character varying NOT NULL, -- 1, 2, 여름, 겨울
  deadline timestamp with time zone NOT NULL,
  recruit_count integer, -- NULL: 미정
  recruit_count_text character varying NOT NULL DEFAULT ''::character varying, 
  is_college_limited boolean NOT NULL DEFAULT false,
  eligibility_text character varying NOT NULL DEFAULT ''::character varying,
  application_url character varying NOT NULL DEFAULT ''::character varying,
  application_process character varying NOT NULL DEFAULT ''::character varying,
  has_membership_fee boolean NOT NULL DEFAULT false,
  membership_fee_text character varying,
  activity_location_type character varying NOT NULL DEFAULT '미정'::character varying, -- 동방, 동방외, 미정
  activity_location_text character varying NOT NULL DEFAULT ''::character varying,
  main_activities character varying NOT NULL DEFAULT ''::character varying,
  extra_info character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT chk_recruitment_recruit_type CHECK (recruit_type IN ('정기', '상시', '미정')),
  CONSTRAINT chk_activity_location_type CHECK (activity_location_type IN ('동방', '동방 외', '미정'))
);
CREATE INDEX idx_recruitment_club_id ON public.club_recruitment(club_id);
CREATE INDEX idx_recruitment_deadline ON public.club_recruitment(deadline);


-- club_recruitment 테이블의 year_month 관련
-- 1. 일단 NULL 허용으로 컬럼 추가
ALTER TABLE public.club_recruitment 
ADD COLUMN year_month character varying;

-- 2. 기존 데이터의 created_at을 기준으로 year_month 채우기
UPDATE public.club_recruitment 
SET year_month = to_char(created_at, 'YYYY-MM')
WHERE year_month IS NULL;

-- 3. 이제 NOT NULL 제약 조건 걸기
ALTER TABLE public.club_recruitment 
ALTER COLUMN year_month SET NOT NULL;

-- 4. 유니크 인덱스 생성
CREATE UNIQUE INDEX idx_unique_club_month_active 
ON public.club_recruitment (club_id, year_month) 
WHERE deleted_at IS NULL;