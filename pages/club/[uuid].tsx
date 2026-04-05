import React, { useEffect } from 'react'
import { useRouter } from 'next/router'

const appstore =
  'https://apps.apple.com/kr/app/%ED%81%B4%EB%9F%BD%ED%95%98%EC%9A%B0%EC%8A%A4-%EC%9A%B0%EB%A6%AC-%ED%95%99%EA%B5%90-%EB%AA%A8%EB%93%A0-%EB%8F%99%EC%95%84%EB%A6%AC/id6461214029'

const ClubDeepLink = () => {
  const router = useRouter()
  const { uuid } = router.query

  useEffect(() => {
    if (!router.isReady || !uuid) return

    // Universal Links가 작동하지 않을 때 커스텀 스킴으로 재시도
    window.location.href = `allclear://club/${uuid}`

    // 앱이 없는 경우 App Store로 폴백
    setTimeout(() => {
      window.location.href = appstore
    }, 2000)
  }, [router.isReady, uuid])

  return (
    <div className="h-screen bg-white flex items-center justify-center">
      <p className="text-gray-500 text-lg">앱으로 이동 중...</p>
    </div>
  )
}

export default ClubDeepLink
