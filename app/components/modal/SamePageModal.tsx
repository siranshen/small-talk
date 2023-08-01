'use client'

import { useCallback, useRef, useEffect, MouseEventHandler, useState } from 'react'

export default function SamePageModal({
  children,
  isOpen,
  setOpen,
}: {
  children: React.ReactNode
  isOpen: boolean
  setOpen: Function
}) {
  const overlayRef = useRef(null)
  const wrapperRef = useRef(null)
  const [fadeOut, setFadeOut] = useState<boolean>(false)

  const onClick: MouseEventHandler = useCallback(
    (e) => {
      if (e.target === overlayRef.current || e.target === wrapperRef.current) {
        setFadeOut(true)
      }
    },
    [overlayRef, wrapperRef]
  )

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setFadeOut(true)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  return (
    <div
      ref={overlayRef}
      className={`${isOpen ? 'animate-[fade-in_300ms]' : 'hidden'} ${
        fadeOut ? 'opacity-0' : ''
      } transition duration-300 fixed z-20 inset-0 mx-auto bg-black/30`}
      onTransitionEnd={() => {
        if (fadeOut) {
          setOpen(false)
          setFadeOut(false)
        }
      }}
      onClick={onClick}
    >
      <div
        ref={wrapperRef}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 ${fadeOut ? 'translate-y-0': '-translate-y-1/2'} transition duration-300 w-full sm:w-10/12 md:w-8/12 lg:w-1/2 max-w-[420px] p-6`}
      >
        <div className='rounded-lg border border-solid border-zinc-200 bg-white shadow-[0_0_10px_rgba(0,0,0,.1)] px-8 py-6'>
          {children}
        </div>
      </div>
    </div>
  )
}
