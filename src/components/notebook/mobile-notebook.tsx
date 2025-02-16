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

export function MobileNotebook({ notebookId, notebook, onWebsiteSubmit, onSendToCerebras, initialMessages = [] }: MobileNotebookProps) {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
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
                      onSubmit={(url) => {
                        onWebsiteSubmit?.(url);
                        setShowWebsiteInput(false);
                        setAddSourceOpen(false);
                      }}
                      onSendToCerebras={onSendToCerebras}
                    />
                  ) : (
                    <>
                      <DialogHeader className="space-y-4">
                        <DialogTitle className="text-xl text-white">
                          Add source
                        </DialogTitle>
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
                          <div className="flex-1 text-left">
                            <div className="font-medium">Website</div>
                            <div className="text-sm text-gray-400">
                              Add content from a website URL
                            </div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="flex items-center justify-start space-x-2 h-auto py-4 px-4"
                          disabled
                        >
                          <Upload className="h-5 w-5" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">Upload file</div>
                            <div className="text-sm text-gray-400">
                              Upload a PDF or text document
                            </div>
                          </div>
                        </Button>
                        <Button
                          variant="outline"
                          className="flex items-center justify-start space-x-2 h-auto py-4 px-4"
                          disabled
                        >
                          <Youtube className="h-5 w-5" />
                          <div className="flex-1 text-left">
                            <div className="font-medium">YouTube</div>
                            <div className="text-sm text-gray-400">
                              Add content from a YouTube video
                            </div>
                          </div>
                        </Button>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              {notebook?.sources?.map((source) => (
                <SummaryView
                  key={source.id}
                  summary={{
                    content: source.content,
                    metadata: {
                      sourceTitle: source.title,
                    },
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-full overflow-hidden">
            <Chat
              ref={chatRef}
              notebookId={notebookId}
              initialMessages={initialMessages}
            />
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Notes</h2>
                <AddNoteDialog
                  notebookId={notebookId}
                  onNoteAdded={() => {
                    // Handle note added
                  }}
                />
              </div>

              <Card className="bg-[#2A2A2A] border-[#3A3A3A] p-4">
                <div className="flex items-start space-x-4">
                  <Info className="h-5 w-5 text-blue-400 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Generate audio</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Turn your notebook into an engaging audio conversation
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleGenerateAudio}
                      disabled={isGeneratingAudio}
                      className="w-full"
                    >
                      {isGeneratingAudio ? (
                        <AudioLoading className="mr-2" />
                      ) : null}
                      {isGeneratingAudio ? "Generating..." : "Generate audio"}
                    </Button>
                    {audioError && (
                      <p className="text-sm text-red-500 mt-2">{audioError}</p>
                    )}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">Study guide</Button>
                <Button variant="outline" size="sm">Briefing doc</Button>
                <Button variant="outline" size="sm">FAQ</Button>
                <Button variant="outline" size="sm">Timeline</Button>
              </div>

              {notebook?.notes && notebook.notes.length > 0 ? (
                <div className="space-y-2">
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
                <div className="flex items-center justify-center h-40 border border-dashed border-[#3A3A3A] rounded-lg">
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-400">No notes yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click Add note to create your first note
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
