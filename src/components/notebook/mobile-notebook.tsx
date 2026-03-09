"use client";

import { useState, useRef } from "react";
import { Chat, Message } from "@/components/chat";
import { cn } from "@/lib/utils";
import { Source } from "@prisma/client";
import { EditableTitle } from "@/components/editable-title";
import { Button } from "@/components/ui/button";
import { Share, Settings, LinkIcon, Upload, Youtube, Info } from "lucide-react";
import { ShareDialog } from "@/components/share-dialog";
import { SummaryView } from "@/components/summary-view";
import { AddNoteDialog } from "@/components/add-note-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { WebsiteURLInput } from "@/components/website-url-input";
import { Card } from "@/components/ui/card";
import { AudioLoading } from "@/components/audio-loading";
import { authClient } from "@/lib/auth-client";

interface MobileNotebookProps {
  notebookId: string;
  notebook: {
    id: string;
    title: string;
    content: string | null;
    description: string | null;
    sources: Source[];
    notes: {
      id: string;
      title: string;
      content: string;
      createdAt: string;
    }[];
  } | null;
  onWebsiteSubmit: (url: string) => void;
  onSendToCerebras: (url: string) => void;
  initialMessages?: Message[];
}

type TabType = 'sources' | 'chat' | 'studio';

import { AddSourceDialog } from "@/components/notebook/add-source-dialog";
import { FileText, MessageSquare, Wand2, FileAudio, Presentation, FileVideo, GitMerge, GalleryHorizontal, HelpCircle, BarChart3, Table } from "lucide-react";

const STUDIO_OPTIONS = [
  { icon: FileAudio, label: "Audio Overview" },
  { icon: Presentation, label: "Slide Deck" },
  { icon: FileVideo, label: "Video Overview" },
  { icon: GitMerge, label: "Mind Map" },
  { icon: FileText, label: "Reports" },
  { icon: GalleryHorizontal, label: "Flashcards" },
  { icon: HelpCircle, label: "Quiz" },
  { icon: BarChart3, label: "Infographic" },
  { icon: Table, label: "Data Table" },
];

export function MobileNotebook({ notebookId, notebook, onWebsiteSubmit, onSendToCerebras, initialMessages = [] }: MobileNotebookProps) {
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const chatRef = useRef<{ handleUrlSummary: (url: string) => void }>(null);

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation: {
            style: "deep_dive",
            hosts: 2,
            language: "en",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate audio");
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      setAudioError(
        error instanceof Error ? error.message : "Failed to generate audio"
      );
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#1C1C1C]">
      {/* Header */}
      <div className="h-[65px] border-b border-[#2A2A2A]">
        <div className="flex items-center justify-between h-full px-4">
          <EditableTitle
            initialTitle={notebook?.title || "Untitled notebook"}
            onSave={async (newTitle) => {
              try {
                const response = await fetch(`/api/notebooks/${notebookId}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ title: newTitle }),
                });

                if (!response.ok) {
                  throw new Error("Failed to update title");
                }
              } catch (error) {
                console.error("Error updating notebook title:", error);
              }
            }}
          />
          <div className="flex items-center space-x-2">
            <ShareDialog notebookId={notebookId} />
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-[#2A2A2A] bg-[#1A1A1A] h-12">
        <button
          onClick={() => setActiveTab('sources')}
          className={cn(
            "flex-1 py-3 text-sm font-medium border-b-2",
            activeTab === 'sources' 
              ? "border-blue-500 text-blue-500" 
              : "border-transparent text-gray-400 hover:text-gray-300"
          )}
        >
          Sources
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex-1 py-3 text-sm font-medium border-b-2",
            activeTab === 'chat' 
              ? "border-blue-500 text-blue-500" 
              : "border-transparent text-gray-400 hover:text-gray-300"
          )}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          className={cn(
            "flex-1 py-3 text-sm font-medium border-b-2",
            activeTab === 'studio' 
              ? "border-blue-500 text-blue-500" 
              : "border-transparent text-gray-400 hover:text-gray-300"
          )}
        >
          Studio
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden h-[calc(100vh-189px)]">
        {activeTab === 'sources' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <Button className="w-full mb-4 bg-[#2A2A2A] hover:bg-[#333] text-white border-0" variant="outline" onClick={() => setAddSourceOpen(true)}>
                + Add sources
              </Button>
              
              {(!notebook?.sources || notebook.sources.length === 0) ? (
                <div className="text-sm text-gray-500 text-center py-16">
                  <FileText className="w-10 h-10 mx-auto mb-4 text-gray-600" />
                  <p className="font-medium text-gray-400 mb-1">Saved sources will appear here</p>
                  <p className="text-xs px-6">Click Add source above to add PDFs, websites, text, videos, or audio files. Or import a file directly from Google Drive.</p>
                </div>
              ) : (
                notebook.sources.map((source) => (
                  <SummaryView
                    key={source.id}
                    summary={{
                      content: source.content,
                      metadata: {
                        sourceTitle: source.title,
                      },
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full overflow-hidden">
            <Chat
              ref={chatRef}
              notebookId={notebookId}
              initialMessages={initialMessages}
              hasSources={(notebook?.sources?.length ?? 0) > 0}
              onOpenAddSource={() => setAddSourceOpen(true)}
            />
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col relative">
              <div className="grid grid-cols-2 gap-2 mb-8">
                {STUDIO_OPTIONS.map((option, i) => (
                  <div 
                    key={i} 
                    className="flex flex-col items-start justify-center p-3 rounded-xl border border-[#2A2A2A] bg-[#1C1C1C] hover:bg-[#252525] cursor-pointer transition-colors"
                  >
                    <option.icon className="h-5 w-5 mb-2 text-gray-400" />
                    <span className="text-xs font-medium text-gray-300">{option.label}</span>
                  </div>
                ))}
              </div>

              {notebook?.notes && notebook.notes.length > 0 ? (
                <div className="space-y-2 flex-1">
                  {notebook.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg border border-[#3A3A3A] hover:border-[#4A4A4A] 
                      transition-colors bg-[#2A2A2A] cursor-pointer"
                    >
                      <h3 className="font-medium mb-1 text-sm">{note.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {note.content}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <Wand2 className="h-6 w-6 text-gray-500 mb-4" />
                  <p className="text-sm text-gray-300 font-medium mb-1">Studio output will be saved here.</p>
                  <p className="text-xs text-gray-500">
                    After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
                  </p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-[#2A2A2A] flex justify-center bg-[#1A1A1A]">
              <AddNoteDialog
                notebookId={notebookId}
                onNoteAdded={() => {
                  // Handle note added
                }}
              />
            </div>
          </div>
        )}
      </div>

      <AddSourceDialog
        open={addSourceOpen}
        onOpenChange={setAddSourceOpen}
        notebookId={notebookId}
        onWebsiteSubmit={onWebsiteSubmit}
        onSendToCerebras={onSendToCerebras}
      />
    </div>
  );
}
