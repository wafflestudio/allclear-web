/*
- 동아리 상세 개편에 필요한 설립일, 활동 사진 목록 추가
*/

ALTER TABLE public.club
ADD COLUMN IF NOT EXISTS founded_at date,
ADD COLUMN IF NOT EXISTS activity_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
