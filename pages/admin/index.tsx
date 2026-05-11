import Head from 'next/head'
import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import type {
  AdminClubDetailResponse,
  AdminClubHistoriesResponse,
  AdminClubManagerRequestsResponse,
  AdminClubVerificationRequestsResponse,
  AdminClubsResponse,
} from 'src/lib/schemas/admin'

type ClubStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type StatusFilter = ClubStatus | 'ALL'
type DecisionStatus = 'APPROVED' | 'REJECTED'
type AdminTab = 'clubs' | 'managerRequests' | 'verificationRequests' | 'histories'

type AdminClub = AdminClubsResponse['data']['clubs'][number]
type AdminClubDetail = AdminClubDetailResponse['data']
type ManagerRequest = AdminClubManagerRequestsResponse['data']['requests'][number]
type VerificationRequest = AdminClubVerificationRequestsResponse['data']['requests'][number]
type ClubHistory = AdminClubHistoriesResponse['data']['histories'][number]

const ADMIN_AUTH_TOKEN_KEY = 'allclear:admin-auth-token'

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: '전체', value: 'ALL' },
  { label: '대기', value: 'PENDING' },
  { label: '승인', value: 'APPROVED' },
  { label: '반려', value: 'REJECTED' },
]

const TABS: { label: string; value: AdminTab }[] = [
  { label: '동아리 신청', value: 'clubs' },
  { label: '관리자 매핑', value: 'managerRequests' },
  { label: '공식 인증', value: 'verificationRequests' },
  { label: '수정 이력', value: 'histories' },
]

const statusLabels: Record<ClubStatus, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
}

const statusClassNames: Record<ClubStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-700',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') searchParams.set(key, String(value))
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

type FetchOptions = NonNullable<Parameters<typeof fetch>[1]>

const request = async <T,>(url: string, init?: FetchOptions): Promise<T> => {
  const token =
    typeof window === 'undefined' ? null : window.localStorage.getItem(ADMIN_AUTH_TOKEN_KEY)
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

const fetchClubs = (status: StatusFilter) =>
  request<AdminClubsResponse>(
    `/api/v1/admin/clubs${buildQuery({ status: status === 'ALL' ? undefined : status })}`,
  )

const fetchClubDetail = (uuid: string) =>
  request<AdminClubDetailResponse>(`/api/v1/admin/clubs/${uuid}`)

const fetchManagerRequests = (status: StatusFilter) =>
  request<AdminClubManagerRequestsResponse>(
    `/api/v1/admin/clubs/manager-requests${buildQuery({
      status: status === 'ALL' ? undefined : status,
    })}`,
  )

const fetchVerificationRequests = (status: StatusFilter) =>
  request<AdminClubVerificationRequestsResponse>(
    `/api/v1/admin/clubs/verifications${buildQuery({
      status: status === 'ALL' ? undefined : status,
    })}`,
  )

const fetchHistories = (query: string) =>
  request<AdminClubHistoriesResponse>(
    `/api/v1/admin/clubs/histories${buildQuery({ query, limit: 30 })}`,
  )

const updateClubStatus = (payload: {
  uuid: string
  status: DecisionStatus
  reject_reason?: string
  is_official_verified: boolean
}) =>
  request(`/api/v1/admin/clubs/${payload.uuid}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: payload.status,
      reject_reason: payload.reject_reason,
      is_official_verified: payload.is_official_verified,
    }),
  })

const updateManagerRequestStatus = (payload: {
  id: number
  status: DecisionStatus
  reject_reason?: string
}) =>
  request(`/api/v1/admin/clubs/manager-requests/${payload.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: payload.status,
      reject_reason: payload.reject_reason,
    }),
  })

const updateVerificationStatus = (payload: {
  id: number
  status: DecisionStatus
  reject_reason?: string
}) =>
  request(`/api/v1/admin/clubs/verifications/${payload.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: payload.status,
      reject_reason: payload.reject_reason,
    }),
  })

const AdminDashboardPage = () => {
  const queryClient = useQueryClient()
  const [authReady, setAuthReady] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AdminTab>('clubs')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING')
  const [selectedClubUuid, setSelectedClubUuid] = useState<string | null>(null)
  const [historyQuery, setHistoryQuery] = useState('')
  const [submittedHistoryQuery, setSubmittedHistoryQuery] = useState('')

  useEffect(() => {
    setAuthToken(window.localStorage.getItem(ADMIN_AUTH_TOKEN_KEY))
    setAuthReady(true)
  }, [])

  const clubsQuery = useQuery(['admin-clubs', statusFilter], () => fetchClubs(statusFilter), {
    enabled: activeTab === 'clubs' && !!authToken,
  })
  const managerRequestsQuery = useQuery(
    ['admin-manager-requests', statusFilter],
    () => fetchManagerRequests(statusFilter),
    { enabled: activeTab === 'managerRequests' && !!authToken },
  )
  const verificationRequestsQuery = useQuery(
    ['admin-verification-requests', statusFilter],
    () => fetchVerificationRequests(statusFilter),
    { enabled: activeTab === 'verificationRequests' && !!authToken },
  )
  const historiesQuery = useQuery(
    ['admin-club-histories', submittedHistoryQuery],
    () => fetchHistories(submittedHistoryQuery),
    { enabled: activeTab === 'histories' && !!authToken },
  )
  const clubDetailQuery = useQuery(
    ['admin-club-detail', selectedClubUuid],
    () => fetchClubDetail(selectedClubUuid ?? ''),
    { enabled: !!selectedClubUuid && !!authToken },
  )

  const clubStatusMutation = useMutation(updateClubStatus, {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-clubs')
      queryClient.invalidateQueries('admin-club-detail')
    },
  })
  const managerRequestMutation = useMutation(updateManagerRequestStatus, {
    onSuccess: () => queryClient.invalidateQueries('admin-manager-requests'),
  })
  const verificationMutation = useMutation(updateVerificationStatus, {
    onSuccess: () => queryClient.invalidateQueries('admin-verification-requests'),
  })

  const totalCount = useMemo(() => {
    if (activeTab === 'clubs') return clubsQuery.data?.data.total_count ?? 0
    if (activeTab === 'managerRequests') return managerRequestsQuery.data?.data.total_count ?? 0
    if (activeTab === 'verificationRequests')
      return verificationRequestsQuery.data?.data.total_count ?? 0
    return historiesQuery.data?.data.total_count ?? 0
  }, [
    activeTab,
    clubsQuery.data,
    historiesQuery.data,
    managerRequestsQuery.data,
    verificationRequestsQuery.data,
  ])

  const handleLogin = (token: string) => {
    window.localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, token)
    setAuthToken(token)
    queryClient.invalidateQueries()
  }

  const handleLogout = () => {
    window.localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY)
    setAuthToken(null)
    queryClient.clear()
  }

  if (!authReady) {
    return (
      <>
        <Head>
          <title>올클 운영진 로그인</title>
        </Head>
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="h-28 w-full max-w-md animate-pulse rounded-md border border-slate-200 bg-white" />
        </main>
      </>
    )
  }

  if (!authToken) {
    return <AdminLoginPage onLogin={handleLogin} />
  }

  return (
    <>
      <Head>
        <title>올클 운영진 대시보드</title>
      </Head>
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-5 lg:px-6">
          <aside className="sticky top-5 hidden h-[calc(100vh-40px)] w-60 shrink-0 flex-col justify-between border-r border-slate-200 pr-5 lg:flex">
            <div>
              <div className="mb-8">
                <p className="text-sm font-semibold text-primary-700">Allclear Admin</p>
                <h1 className="mt-2 text-2xl font-bold tracking-normal">운영진 대시보드</h1>
              </div>
              <nav className="space-y-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                      activeTab === tab.value
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-600 hover:bg-white hover:text-slate-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              API 응답 권한은 서버의 운영진 인증 정책을 그대로 따릅니다.
            </p>
          </aside>

          <section className="min-w-0 flex-1">
            <div className="mb-5 lg:hidden">
              <p className="text-sm font-semibold text-primary-700">Allclear Admin</p>
              <h1 className="mt-2 text-2xl font-bold">운영진 대시보드</h1>
            </div>

            <div className="mb-5 overflow-x-auto rounded-md border border-slate-200 bg-white p-1 lg:hidden">
              <div className="flex min-w-max gap-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={`rounded px-3 py-2 text-sm font-semibold ${
                      activeTab === tab.value
                        ? 'bg-slate-950 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <header className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">현재 탭</p>
                <h2 className="mt-1 text-3xl font-bold">
                  {TABS.find((tab) => tab.value === activeTab)?.label}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={statusFilter === 'ALL' ? undefined : statusFilter} />
                <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
                  총 {totalCount.toLocaleString()}건
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  로그아웃
                </button>
              </div>
            </header>

            {activeTab !== 'histories' ? (
              <StatusFilterBar value={statusFilter} onChange={setStatusFilter} />
            ) : (
              <form
                className="mb-5 flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  setSubmittedHistoryQuery(historyQuery.trim())
                }}
              >
                <input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  className="min-h-[42px] flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-primary-600"
                  placeholder="동아리명 또는 관리자 이름 검색"
                />
                <button
                  type="submit"
                  className="min-h-[42px] rounded-md bg-slate-950 px-4 text-sm font-semibold text-white"
                >
                  검색
                </button>
              </form>
            )}

            {activeTab === 'clubs' && (
              <ClubList
                clubs={clubsQuery.data?.data.clubs ?? []}
                isLoading={clubsQuery.isLoading}
                error={clubsQuery.error}
                onOpenDetail={setSelectedClubUuid}
              />
            )}
            {activeTab === 'managerRequests' && (
              <ManagerRequestList
                requests={managerRequestsQuery.data?.data.requests ?? []}
                isLoading={managerRequestsQuery.isLoading}
                error={managerRequestsQuery.error}
                isMutating={managerRequestMutation.isLoading}
                onDecide={(payload) => managerRequestMutation.mutate(payload)}
              />
            )}
            {activeTab === 'verificationRequests' && (
              <VerificationRequestList
                requests={verificationRequestsQuery.data?.data.requests ?? []}
                isLoading={verificationRequestsQuery.isLoading}
                error={verificationRequestsQuery.error}
                isMutating={verificationMutation.isLoading}
                onDecide={(payload) => verificationMutation.mutate(payload)}
              />
            )}
            {activeTab === 'histories' && (
              <HistoryList
                histories={historiesQuery.data?.data.histories ?? []}
                isLoading={historiesQuery.isLoading}
                error={historiesQuery.error}
              />
            )}
          </section>
        </div>
      </main>

      {selectedClubUuid && (
        <ClubDetailDialog
          detail={clubDetailQuery.data?.data}
          isLoading={clubDetailQuery.isLoading}
          error={clubDetailQuery.error}
          isMutating={clubStatusMutation.isLoading}
          onClose={() => setSelectedClubUuid(null)}
          onDecide={(payload) => clubStatusMutation.mutate(payload)}
        />
      )}
    </>
  )
}

const extractTokenFromPopupText = (rawText: string): string | null => {
  try {
    const data = JSON.parse(rawText) as { token?: unknown }
    if (typeof data.token === 'string') return data.token
  } catch (err) {
    // Firefox renders JSON responses through its JSON viewer, so the visible text is not raw JSON.
  }

  const quotedToken = rawText.match(/"token"\s*:\s*"([^"]+)"/)
  if (quotedToken?.[1]) return quotedToken[1]

  const jwtToken = rawText.match(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/)
  return jwtToken?.[0] ?? null
}

const AdminLoginPage = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleKakaoLogin = () => {
    setErrorMessage('')
    setIsLoggingIn(true)

    const popup = window.open(
      '/api/v1/auth/kakao',
      'allclear-kakao-login',
      'width=460,height=680,menubar=no,toolbar=no,location=no,status=no',
    )

    if (!popup) {
      setIsLoggingIn(false)
      setErrorMessage('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요.')
      return
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer)
        setIsLoggingIn(false)
        setErrorMessage('로그인 창이 닫혔습니다.')
        return
      }

      if (Date.now() - startedAt > 1000 * 60 * 2) {
        window.clearInterval(timer)
        popup.close()
        setIsLoggingIn(false)
        setErrorMessage('로그인 시간이 초과되었습니다. 다시 시도해주세요.')
        return
      }

      try {
        const rawText = [
          popup.document.body?.innerText,
          popup.document.body?.textContent,
          popup.document.documentElement?.textContent,
        ]
          .filter(Boolean)
          .join('\n')
          .trim()
        if (!rawText) return

        const token = extractTokenFromPopupText(rawText)
        if (!token) return

        window.clearInterval(timer)
        popup.close()
        setIsLoggingIn(false)
        onLogin(token)
      } catch (err) {
        // Kakao 도메인에 머무르는 동안에는 same-origin 접근이 막힌다.
      }
    }, 500)
  }

  return (
    <>
      <Head>
        <title>올클 운영진 로그인</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950">
        <section className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-primary-700">Allclear Admin</p>
          <h1 className="mt-2 text-2xl font-bold">운영진 로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            카카오 계정으로 로그인한 뒤 운영진 권한이 확인되면 대시보드를 사용할 수 있습니다.
          </p>

          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={isLoggingIn}
            className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-md bg-[#FEE500] px-4 text-sm font-bold text-[#191919] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoggingIn ? '카카오 로그인 진행 중' : '카카오로 로그인'}
          </button>

          {errorMessage && (
            <p className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {errorMessage}
            </p>
          )}

          <p className="mt-5 text-xs leading-5 text-slate-500">
            기존 인증 API를 그대로 사용하며, 로그인 토큰은 이 브라우저의 로컬 저장소에 보관됩니다.
          </p>
        </section>
      </main>
    </>
  )
}

const StatusFilterBar = ({
  value,
  onChange,
}: {
  value: StatusFilter
  onChange: (status: StatusFilter) => void
}) => (
  <div className="mb-5 overflow-x-auto">
    <div className="flex min-w-max gap-2">
      {STATUS_FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
            value === filter.value
              ? 'border-slate-950 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  </div>
)

const StatusBadge = ({ status }: { status?: ClubStatus }) => {
  if (!status) {
    return (
      <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
        전체
      </span>
    )
  }
  return (
    <span
      className={`rounded-md border px-3 py-2 text-sm font-semibold ${statusClassNames[status]}`}
    >
      {statusLabels[status]}
    </span>
  )
}

const ClubList = ({
  clubs,
  isLoading,
  error,
  onOpenDetail,
}: {
  clubs: AdminClub[]
  isLoading: boolean
  error: unknown
  onOpenDetail: (uuid: string) => void
}) => {
  if (isLoading) return <LoadingRows />
  if (error) return <ErrorState error={error} />
  if (!clubs.length) return <EmptyState title="조건에 맞는 동아리 신청이 없습니다." />

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_1fr_96px] gap-4 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-500 max-md:hidden">
        <span>동아리</span>
        <span>상태</span>
        <span>카테고리</span>
        <span>신청자</span>
        <span>검토</span>
      </div>
      {clubs.map((club) => (
        <article
          key={club.uuid}
          className="grid gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_96px] md:items-center"
        >
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">{club.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
              {club.affiliation} · {club.short_description}
            </p>
            <p className="mt-2 text-xs text-slate-400">{formatDate(club.created_at)}</p>
          </div>
          <StatusBadge status={club.status} />
          <p className="text-sm font-medium text-slate-700">{club.category}</p>
          <div className="text-sm text-slate-600">
            <p className="font-semibold text-slate-900">{club.manager.name}</p>
            <p>{club.manager.phone}</p>
            <p>{club.manager.student_id}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenDetail(club.uuid)}
            className="min-h-[38px] rounded-md border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-100"
          >
            상세
          </button>
        </article>
      ))}
    </div>
  )
}

const ManagerRequestList = ({
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
  onDecide: (payload: { id: number; status: DecisionStatus; reject_reason?: string }) => void
}) => {
  if (isLoading) return <LoadingRows />
  if (error) return <ErrorState error={error} />
  if (!requests.length) return <EmptyState title="조건에 맞는 관리자 매핑 신청이 없습니다." />

  return (
    <div className="grid gap-3">
      {requests.map((requestItem) => (
        <RequestCard
          key={requestItem.id}
          title={requestItem.club_name}
          subtitle={`${requestItem.applicant.name} · ${requestItem.applicant.phone} · ${requestItem.applicant.student_id}`}
          meta={formatDate(requestItem.created_at)}
          status={requestItem.status}
        >
          <DecisionControls
            disabled={requestItem.status !== 'PENDING' || isMutating}
            onDecide={(status, rejectReason) =>
              onDecide({ id: requestItem.id, status, reject_reason: rejectReason })
            }
          />
        </RequestCard>
      ))}
    </div>
  )
}

const VerificationRequestList = ({
  requests,
  isLoading,
  error,
  isMutating,
  onDecide,
}: {
  requests: VerificationRequest[]
  isLoading: boolean
  error: unknown
  isMutating: boolean
  onDecide: (payload: { id: number; status: DecisionStatus; reject_reason?: string }) => void
}) => {
  if (isLoading) return <LoadingRows />
  if (error) return <ErrorState error={error} />
  if (!requests.length) return <EmptyState title="조건에 맞는 공식 인증 요청이 없습니다." />

  return (
    <div className="grid gap-3">
      {requests.map((requestItem) => (
        <RequestCard
          key={requestItem.id}
          title={requestItem.club_name}
          subtitle={requestItem.category}
          meta={formatDate(requestItem.created_at)}
          status={requestItem.status}
        >
          <DecisionControls
            disabled={requestItem.status !== 'PENDING' || isMutating}
            onDecide={(status, rejectReason) =>
              onDecide({ id: requestItem.id, status, reject_reason: rejectReason })
            }
          />
        </RequestCard>
      ))}
    </div>
  )
}

const RequestCard = ({
  title,
  subtitle,
  meta,
  status,
  children,
}: {
  title: string
  subtitle: string
  meta: string
  status: ClubStatus
  children: React.ReactNode
}) => (
  <article className="rounded-md border border-slate-200 bg-white p-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold">{title}</h3>
          <StatusBadge status={status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        <p className="mt-2 text-xs text-slate-400">{meta}</p>
      </div>
      {children}
    </div>
  </article>
)

const DecisionControls = ({
  disabled,
  onDecide,
}: {
  disabled: boolean
  onDecide: (status: DecisionStatus, rejectReason?: string) => void
}) => {
  const [rejectReason, setRejectReason] = useState('')

  return (
    <div className="flex w-full flex-col gap-2 md:w-80">
      <textarea
        value={rejectReason}
        onChange={(event) => setRejectReason(event.target.value)}
        disabled={disabled}
        className="min-h-[72px] resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-600 disabled:bg-slate-100"
        placeholder="반려 사유"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDecide('REJECTED', rejectReason)}
          className="min-h-[38px] rounded-md border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          반려
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onDecide('APPROVED')}
          className="min-h-[38px] rounded-md bg-slate-950 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          승인
        </button>
      </div>
    </div>
  )
}

const ClubDetailDialog = ({
  detail,
  isLoading,
  error,
  isMutating,
  onClose,
  onDecide,
}: {
  detail?: AdminClubDetail
  isLoading: boolean
  error: unknown
  isMutating: boolean
  onClose: () => void
  onDecide: (payload: {
    uuid: string
    status: DecisionStatus
    reject_reason?: string
    is_official_verified: boolean
  }) => void
}) => {
  const [officialVerified, setOfficialVerified] = useState(true)
  const [rejectReason, setRejectReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
      <section className="max-h-full w-full max-w-4xl overflow-y-auto rounded-md bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-sm font-medium text-slate-500">동아리 상세 검토</p>
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
            <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
              <div>
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
              </div>

              <aside className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-base font-bold">신청자</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-950">이름</span>{' '}
                    {detail.manager_data.name}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-950">연락처</span>{' '}
                    {detail.manager_data.phone}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-950">학번</span>{' '}
                    {detail.manager_data.student_id}
                  </p>
                  <p className="break-all text-xs text-slate-500">
                    {detail.manager_data.service_user_id}
                  </p>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={officialVerified}
                      onChange={(event) => setOfficialVerified(event.target.checked)}
                      className="h-4 w-4"
                    />
                    승인 시 공식 인증 부여
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    className="mt-3 min-h-[92px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary-600"
                    placeholder="반려 사유"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() =>
                        onDecide({
                          uuid: detail.club_data.uuid,
                          status: 'REJECTED',
                          reject_reason: rejectReason,
                          is_official_verified: false,
                        })
                      }
                      className="min-h-[40px] rounded-md border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 disabled:opacity-50"
                    >
                      반려
                    </button>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() =>
                        onDecide({
                          uuid: detail.club_data.uuid,
                          status: 'APPROVED',
                          is_official_verified: officialVerified,
                        })
                      }
                      className="min-h-[40px] rounded-md bg-slate-950 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

const DetailItem = ({
  label,
  value,
  wide = false,
}: {
  label: string
  value: React.ReactNode
  wide?: boolean
}) => (
  <div className={`rounded-md border border-slate-200 bg-white p-3 ${wide ? 'sm:col-span-2' : ''}`}>
    <dt className="text-xs font-bold text-slate-500">{label}</dt>
    <dd className="mt-1 break-words text-sm leading-6 text-slate-900">{value}</dd>
  </div>
)

const HistoryList = ({
  histories,
  isLoading,
  error,
}: {
  histories: ClubHistory[]
  isLoading: boolean
  error: unknown
}) => {
  if (isLoading) return <LoadingRows />
  if (error) return <ErrorState error={error} />
  if (!histories.length) return <EmptyState title="표시할 수정 이력이 없습니다." />

  return (
    <div className="grid gap-3">
      {histories.map((history) => (
        <article key={history.id} className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-base font-bold">{history.club_name}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {history.updated_by.name || history.updated_by.service_user_id} ·{' '}
                {formatDate(history.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.changed_fields.map((field) => (
                <span
                  key={field}
                  className="rounded-md border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <Snapshot title="변경 전" data={history.before_data} fields={history.changed_fields} />
            <Snapshot title="변경 후" data={history.after_data} fields={history.changed_fields} />
          </div>
        </article>
      ))}
    </div>
  )
}

const Snapshot = ({
  title,
  data,
  fields,
}: {
  title: string
  data: Record<string, unknown>
  fields: string[]
}) => (
  <div className="rounded-md bg-slate-100 p-3">
    <h4 className="mb-2 text-sm font-bold">{title}</h4>
    <dl className="space-y-2">
      {fields.map((field) => (
        <div key={field}>
          <dt className="text-xs font-semibold text-slate-500">{field}</dt>
          <dd className="mt-1 break-words rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800">
            {String(data[field] ?? '-')}
          </dd>
        </div>
      ))}
    </dl>
  </div>
)

const LoadingRows = () => (
  <div className="grid gap-3">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="h-28 animate-pulse rounded-md border border-slate-200 bg-white" />
    ))}
  </div>
)

const ErrorState = ({ error }: { error: unknown }) => (
  <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
    데이터를 불러오지 못했습니다. {error instanceof Error ? error.message : ''}
  </div>
)

const EmptyState = ({ title }: { title: string }) => (
  <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
    <p className="text-base font-semibold text-slate-700">{title}</p>
  </div>
)

export default AdminDashboardPage
