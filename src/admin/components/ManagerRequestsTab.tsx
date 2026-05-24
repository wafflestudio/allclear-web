import React, { useState } from 'react'
import { useClubDetail } from 'src/admin/hooks'
import { formatDate, statusLabels } from 'src/admin/constants'
import type { ClubStatus, ManagerRequest } from 'src/admin/types'
import { DetailItem, EmptyState, ErrorState, LoadingRows, StatusBadge } from './ui'

type DecidePayload = {
  id: number
  status: ClubStatus
  reject_reason?: string
}

export const ManagerRequestsTab = ({
  requests,
  isLoading,
  error,
  isMutating,
  onDecide,
}: {
  requests: ManagerRequest[]
  isLoading: boolean
  error: unknown
  isMutating: boolean
  onDecide: (payload: DecidePayload) => void
}) => {
  if (isLoading) return <LoadingRows />
  if (error) return <ErrorState error={error} />
  if (!requests.length) return <EmptyState title="조건에 맞는 관리자 매핑 신청이 없습니다." />

  return (
    <div className="grid gap-3">
      {requests.map((item) => (
        <ManagerRequestCard key={item.id} item={item} isMutating={isMutating} onDecide={onDecide} />
      ))}
    </div>
  )
}

const ManagerRequestCard = ({
  item,
  isMutating,
  onDecide,
}: {
  item: ManagerRequest
  isMutating: boolean
  onDecide: (payload: DecidePayload) => void
}) => {
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    payload: DecidePayload
    message: string
  } | null>(null)
  const [showClubDetail, setShowClubDetail] = useState(false)

  const requestConfirm = (payload: DecidePayload, message: string) => {
    if (payload.status === 'REJECTED' && !rejectReason.trim()) {
      setRejectReasonError(true)
      return
    }
    setRejectReasonError(false)
    setConfirmAction({ payload, message })
  }

  const handleConfirm = () => {
    if (confirmAction) {
      onDecide(confirmAction.payload)
      setConfirmAction(null)
    }
  }

  const isPending = item.status === 'PENDING'
  const hasRejectReason = item.status === 'REJECTED' && !!item.reject_reason

  return (
    <>
      <article className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {/* 왼쪽: 동아리 이름, 신청자, 날짜 */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold">{item.club_name}</h3>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {item.applicant.name} · {item.applicant.phone} · {item.applicant.student_id}
            </p>
            <p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p>
          </div>

          {/* 중간: 반려 사유 */}
          {hasRejectReason && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 md:w-64">
              <p className="text-xs font-semibold text-rose-600">반려 사유</p>
              <p className="mt-1 text-sm text-rose-800">{item.reject_reason}</p>
            </div>
          )}

          {/* 오른쪽: 버튼들 */}
          <div className="flex w-full flex-col gap-2 md:w-72">
            <button
              type="button"
              onClick={() => setShowClubDetail(true)}
              className="w-full min-h-[38px] rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              동아리 상세
            </button>

            {isPending ? (
              <>
                <textarea
                  value={rejectReason}
                  onChange={(event) => {
                    setRejectReason(event.target.value)
                    if (event.target.value.trim()) setRejectReasonError(false)
                  }}
                  className={`min-h-[72px] resize-none rounded-md border bg-white px-3 py-2 text-sm outline-none ${
                    rejectReasonError
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-300 focus:border-primary-600'
                  }`}
                  placeholder="반려 사유"
                />
                {rejectReasonError && (
                  <p className="text-xs font-medium text-rose-600">반려 사유를 입력해 주세요.</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() =>
                      requestConfirm(
                        { id: item.id, status: 'REJECTED', reject_reason: rejectReason },
                        '반려 처리하시겠습니까?',
                      )
                    }
                    className="min-h-[38px] rounded-md border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    반려
                  </button>
                  <button
                    type="button"
                    disabled={isMutating}
                    onClick={() =>
                      requestConfirm({ id: item.id, status: 'APPROVED' }, '승인 처리하시겠습니까?')
                    }
                    className="min-h-[38px] rounded-md bg-slate-950 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    승인
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                disabled={isMutating}
                onClick={() =>
                  requestConfirm(
                    { id: item.id, status: 'PENDING' },
                    '대기 상태로 변경하시겠습니까?',
                  )
                }
                className="min-h-[38px] rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                대기로 변경
              </button>
            )}
          </div>
        </div>
      </article>

      {showClubDetail && (
        <ClubInfoModal clubUuid={item.club_uuid} onClose={() => setShowClubDetail(false)} />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-slate-900">{confirmAction.message}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="min-h-[40px] rounded-md border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isMutating}
                onClick={handleConfirm}
                className="min-h-[40px] rounded-md bg-slate-950 text-sm font-semibold text-white disabled:opacity-50"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const ClubInfoModal = ({ clubUuid, onClose }: { clubUuid: string; onClose: () => void }) => {
  const { data, isLoading, error } = useClubDetail(clubUuid)
  const detail = data?.data

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-md bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">동아리 상세 정보</p>
            <h2 className="text-xl font-bold">{detail?.club_data.name ?? '불러오는 중'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-md border border-slate-200 text-lg font-bold hover:bg-slate-100"
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="p-5">
          {isLoading && <LoadingRows />}
          {Boolean(error) && <ErrorState error={error} />}
          {detail && (
            <>
              <img
                src={detail.club_data.image_uri || '/images/share-logo.png'}
                alt={`${detail.club_data.name} 대표 이미지`}
                className="mb-5 aspect-[16/9] w-full rounded-md border border-slate-200 object-cover"
              />
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="상태" value={statusLabels[detail.club_data.status]} />
                <DetailItem label="유형" value={detail.club_data.type} />
                <DetailItem label="카테고리" value={detail.club_data.category} />
                <DetailItem label="소속" value={detail.club_data.affiliation} />
                <DetailItem label="한줄소개" value={detail.club_data.short_description} wide />
                <DetailItem label="모집 형태" value={detail.club_data.recruit_type ?? '-'} />
                <DetailItem
                  label="최소 활동 기간"
                  value={`${detail.club_data.min_activity_period}학기`}
                />
                <DetailItem
                  label="동방"
                  value={
                    detail.club_data.has_dongbang
                      ? detail.club_data.dongbang_location || '있음'
                      : '없음'
                  }
                />
                <DetailItem label="SNS" value={detail.club_data.sns || '-'} wide />
                <DetailItem label="소개" value={detail.club_data.introduction ?? '-'} wide />
              </dl>
              <p className="mt-3 break-all text-xs text-slate-400">{detail.club_data.uuid}</p>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
