"use client"

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WebsiteURLInputProps {
  onBack: () => void
  onSubmit: (url: string) => void
  onSendToCerebras?: (url: string) => void
}

export function WebsiteURLInput({ onBack, onSubmit, onSendToCerebras }: WebsiteURLInputProps) {
  const [url, setUrl] = useState('https://morganandwestfield.com/podcast/entrepreneurship-through-acquisition-insights-from-harvard-business-school-experts/')

  const handleSubmit = async () => {
    onSubmit(url);
    if (onSendToCerebras) {
      onSendToCerebras(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="hover:bg-[#2A2A2A]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-semibold">Website URL</h2>
      </div>

      <div className="space-y-4">
        <p className="text-gray-300">
          Paste in a Web URL below to upload as a source in NotebookLM.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="url"
                placeholder="Paste URL*"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#1A1A1A] border-[#3A3A3A] focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Notes</h3>
            <ul className="list-disc text-sm text-gray-400 pl-5 space-y-1">
              <li>Only the visible text on the website will be imported at this moment</li>
              <li>Paid articles are not supported</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          className="bg-blue-500 hover:bg-blue-600 text-white px-8"
        >
          Insert
        </Button>
      </div>
    </div>
  )
}
