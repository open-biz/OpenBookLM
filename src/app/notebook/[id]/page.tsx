"use client"

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Settings, Share, ChevronRight, X, Upload, Link as LinkIcon, Youtube, Info, MoreVertical } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { ModelSelector } from "@/components/model-selector"
import { AudioLoading } from "@/components/audio-loading"
import { WebsiteURLInput } from "@/components/website-url-input"
import { Chat } from "@/components/chat"

export default function NotebookPage({ params }: { params: { id: string } }) {
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [showWebsiteInput, setShowWebsiteInput] = useState(false)
  const [addSourceOpen, setAddSourceOpen] = useState(false)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)
  const chatRef = useRef<{ handleUrlSummary: (url: string) => void }>(null)

  const handleWebsiteSubmit = (url: string) => {
    console.log('Submitted URL:', url)
    setShowWebsiteInput(false)
    setAddSourceOpen(false)
  }

  const handleSendToCerebras = (url: string) => {
    chatRef.current?.handleUrlSummary(url);
  }

  const handleGenerateAudio = () => {
    setIsGeneratingAudio(true)
  }

  return (
    <main className="min-h-screen bg-[#1C1C1C]">
      <nav className="border-b border-[#2A2A2A]">
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-semibold text-white">Untitled notebook</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Share className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sources Panel */}
        <div className="w-72 border-r border-[#2A2A2A] p-4 bg-[#1C1C1C]">
          <h2 className="text-sm font-medium text-white mb-4">Sources</h2>
          <Dialog open={addSourceOpen} onOpenChange={setAddSourceOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mb-4" variant="outline">
                + Add source
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-[#1A1A1A] border-[#2A2A2A]">
              {showWebsiteInput ? (
                <WebsiteURLInput 
                  onBack={() => setShowWebsiteInput(false)}
                  onSubmit={handleWebsiteSubmit}
                  onSendToCerebras={handleSendToCerebras}
                />
              ) : (
                <>
                  <DialogHeader className="space-y-4">
                    <DialogTitle className="text-xl text-white">Add source</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Choose a source to add to your notebook
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button
                      variant="outline"
                      className="flex items-center justify-start space-x-2 h-auto py-4 px-4"
                      onClick={() => setShowWebsiteInput(true)}
                    >
                      <LinkIcon className="h-5 w-5" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Website URL</span>
                        <span className="text-sm text-gray-400">Add content from any website</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center justify-start space-x-2 h-auto py-4 px-4"
                    >
                      <Youtube className="h-5 w-5" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">YouTube video</span>
                        <span className="text-sm text-gray-400">Add content from a YouTube video</span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center justify-start space-x-2 h-auto py-4 px-4"
                    >
                      <Upload className="h-5 w-5" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Upload file</span>
                        <span className="text-sm text-gray-400">Upload a PDF, DOCX, or TXT file</span>
                      </div>
                    </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 bg-[#1C1C1C]">
          <Chat ref={chatRef} />
        </div>

        {/* Studio Panel */}
        <div className="w-80 border-l border-[#2A2A2A] p-4 bg-[#1C1C1C]">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white">Audio Overview</h2>
              <Button variant="ghost" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </div>
            <Card className="p-4 bg-[#2A2A2A] border-[#3A3A3A]">
              {isGeneratingAudio ? (
                <AudioLoading />
              ) : (
                <div className="text-center">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#3A3A3A]">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 4V2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 22V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Deep Dive conversation</h3>
                  <p className="text-sm text-gray-400 mb-4">Two hosts (English only)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="w-full">
                      Customize
                    </Button>
                    <Button variant="outline" className="w-full" onClick={handleGenerateAudio}>
                      Generate
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-white">Notes</h2>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
            <Button className="w-full mb-4" variant="outline">
              + Add note
            </Button>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button variant="outline" size="sm">Study guide</Button>
              <Button variant="outline" size="sm">Briefing doc</Button>
              <Button variant="outline" size="sm">FAQ</Button>
              <Button variant="outline" size="sm">Timeline</Button>
            </div>
            <div className="flex items-center justify-center h-40 border border-dashed border-[#3A3A3A] rounded-lg">
              <div className="text-center p-4">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none">
                    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-400">Saved notes will appear here</p>
                <p className="text-xs text-gray-500 mt-1">Save a chat message to create a new note, or click Add note above.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
