"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Settings,
  Share,
  ChevronRight,
  Upload,
  Link as LinkIcon,
  Youtube,
  Info,
  MoreVertical,
  MessageSquare,
  FileText,
  Clock,
  Plus,
} from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { Chat } from "@/components/chat";
import type { Notebook, Source, Chat as ChatType, Note } from "@prisma/client";

interface NotebookClientProps {
  notebook: Notebook & {
    sources: Source[];
    chats: ChatType[];
    notes: Note[];
  };
}

export function NotebookClient({ notebook }: NotebookClientProps) {
  const chatRef = useRef(null);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [showAudio, setShowAudio] = useState(false);

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Sources Panel */}
      <div className="w-72 border-r border-[#2A2A2A] p-4 bg-[#1C1C1C]">
        <h2 className="text-sm font-medium text-white mb-4">Sources</h2>
        <CreateNotebookDialog>
          <Button className="w-full mb-4" variant="outline">
            + Add source
          </Button>
        </CreateNotebookDialog>

        {notebook.sources.length > 0 && (
          <div className="space-y-2 mt-4">
            {notebook.sources.map((source) => (
              <div
                key={source.id}
                className="p-2 rounded bg-[#2A2A2A] text-white"
              >
                {source.title}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto bg-[#1C1C1C]">
          <Chat ref={chatRef} />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-[#2A2A2A] p-4 bg-[#1C1C1C] overflow-y-auto">
        {/* Audio Overview Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Audio Overview</h2>
            <Button variant="ghost" size="icon">
              <Info className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
          <Card className="bg-[#2A2A2A] border-[#333333] p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#333333] rounded-full flex items-center justify-center mb-4">
                <ChevronRight className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Deep Dive conversation
              </h3>
              <p className="text-gray-400 mb-6">Two hosts (English only)</p>
              {showAudio && (
                <audio controls className="w-full mb-6">
                  <source src="/sample-conversation.wav" type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              )}
              <div className="flex gap-4 w-full">
                <Button
                  variant="outline"
                  className="flex-1 bg-white text-black hover:bg-gray-100"
                >
                  Customize
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setShowAudio(true)}
                >
                  Generate New
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Notes Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Notes</h2>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5 text-gray-400" />
            </Button>
          </div>
          <Button className="w-full bg-white text-black hover:bg-gray-100 mb-4">
            <Plus className="h-4 w-4 mr-2" />
            Add note
          </Button>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-2 justify-start text-left bg-[#2A2A2A] border-[#333333] text-white"
            >
              Study guide
            </Button>
            <Button
              variant="outline"
              className="h-auto py-2 justify-start text-left bg-[#2A2A2A] border-[#333333] text-white"
            >
              Briefing doc
            </Button>
            <Button
              variant="outline"
              className="h-auto py-2 justify-start text-left bg-[#2A2A2A] border-[#333333] text-white"
            >
              FAQ
            </Button>
            <Button
              variant="outline"
              className="h-auto py-2 justify-start text-left bg-[#2A2A2A] border-[#333333] text-white"
            >
              Timeline
            </Button>
          </div>

          {/* Empty State */}
          {notebook.notes.length === 0 && (
            <div className="mt-8 border border-dashed border-[#333333] rounded-lg p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-10 h-10 bg-[#2A2A2A] rounded-lg flex items-center justify-center">
                  <Plus className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-400 mb-2">Saved notes will appear here</p>
              <p className="text-sm text-gray-500">
                Save a chat message to create a new note, or click Add note
                above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
