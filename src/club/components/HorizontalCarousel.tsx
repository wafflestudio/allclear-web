import { ReactNode, useEffect, useRef } from 'react'

const AUTO_SCROLL_STEP = 0.5 // 프레임당 px (앱과 동일)
const RESUME_DELAY_MS = 450

type Props = {
  children: ReactNode
}

/**
 * 앱 HorizontalCarousel과 동일: 프레임당 0.5px씩 우측으로 자동 스크롤,
 * 끝에 닿으면 정지, 사용자가 만지면 일시정지 후 재개.
 */
export function HorizontalCarousel({ children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let rafId = 0
    let paused = false
    let resumeTimer: ReturnType<typeof setTimeout> | undefined

    const tick = () => {
      if (!paused) {
        const maxScroll = el.scrollWidth - el.clientWidth
        if (el.scrollLeft < maxScroll) {
          el.scrollLeft += AUTO_SCROLL_STEP
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    const pause = () => {
      paused = true
      clearTimeout(resumeTimer)
    }
    const scheduleResume = () => {
      clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => {
        paused = false
      }, RESUME_DELAY_MS)
    }

    el.addEventListener('pointerdown', pause)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('pointerup', scheduleResume)
    el.addEventListener('touchend', scheduleResume)
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', scheduleResume)
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      clearTimeout(resumeTimer)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('pointerup', scheduleResume)
      el.removeEventListener('touchend', scheduleResume)
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', scheduleResume)
    }
  }, [])

  return (
    <div ref={scrollRef} className="scrollbar-hide flex w-full gap-2.5 overflow-x-auto px-5 pb-0.5">
      {children}
    </div>
  )
}
