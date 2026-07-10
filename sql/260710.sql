/*
- 사용자 알림 테이블 생성
- 신규동아리 승인/반려, 운영진 등록 승인/반려에 대한 알림 타입 설정
*/

CREATE TABLE public.user_notification (
	id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	service_user_id uuid NOT NULL,
	type character varying NOT NULL,
	club_id uuid,
	source_type character varying NOT NULL,
	source_id character varying NOT NULL,
	read_at timestamp with time zone,
	created_at timestamp with time zone NOT NULL DEFAULT now(),
	CONSTRAINT chk_user_notification_type
		CHECK (
			type IN (
				'CLUB_REGISTRATION_APPROVED',
				'CLUB_REGISTRATION_REJECTED',
				'MANAGER_REQUEST_APPROVED',
				'MANAGER_REQUEST_REJECTED'
			)
		),
	CONSTRAINT chk_user_notification_source_type
		CHECK (source_type IN ('CLUB', 'CLUB_MANAGER_REQUEST'))
);

CREATE INDEX idx_user_notification_service_user_created
ON public.user_notification (service_user_id, created_at DESC);

CREATE INDEX idx_user_notification_service_user_unread_created
ON public.user_notification (service_user_id, created_at DESC)
WHERE read_at IS NULL;
