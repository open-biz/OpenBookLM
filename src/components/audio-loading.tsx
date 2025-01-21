"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'

export function AudioLoading() {
  const [showAudio, setShowAudio] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAudio(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  if (showAudio) {
    return (
      <audio controls className="w-full">
        <source src="/merged.wav" type="audio/wav" />
        Your browser does not support the audio element.
      </audio>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 space-y-4">
      <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center">
        <div className="w-10 h-1 bg-blue-500 rounded-full animate-bounce" />
      </div>
      <div className="space-y-1 text-center">
        <h3 className="text-sm font-medium text-white">Loading conversation...</h3>
        <p className="text-xs text-gray-400">This may take a few moments...</p>
      </div>
      <div className="w-full">
        <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 w-1/2 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
