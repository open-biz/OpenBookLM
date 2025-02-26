"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Settings,
  Share,
  ChevronRight,
  ChevronLeft,
  X,
  Upload,
  Link as LinkIcon,
  Youtube,
  Info,
  MoreVertical,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ModelSelector } from "@/components/model-selector";
import { AudioLoading } from "@/components/audio-loading";
import { WebsiteURLInput } from "@/components/website-url-input";
import { Chat } from "@/components/chat";
import { SummaryView } from "@/components/summary-view";
import { cn } from "@/lib/utils";
import { Source } from "@prisma/client";
import { EditableTitle } from "@/components/editable-title";
import { AddNoteDialog } from "@/components/add-note-dialog";
import { NoteModal } from "@/components/note-modal";
import { ShareDialog } from "@/components/share-dialog";
import { SourceViewer } from "@/components/source-viewer";

interface Notebook {
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
}

export default function NotebookPage({ params }: { params: { id: string } }) {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const chatRef = useRef<{ handleUrlSummary: (url: string) => void }>(null);
  const [selectedNote, setSelectedNote] = useState<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchNotebook = async () => {
      try {
        const response = await fetch(`/api/notebooks/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load notebook");
        }

        setNotebook(data);
        setError(null);
      } catch (error) {
        console.error("Error fetching notebook:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load notebook"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchNotebook();
  }, [params.id]);

  const handleWebsiteSubmit = (url: string) => {
    console.log("Submitted URL:", url);
    setShowWebsiteInput(false);
    setAddSourceOpen(false);
  };

  const handleSendToCerebras = (url: string) => {
    chatRef.current?.handleUrlSummary(url);
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);

    try {
      const response = await fetch(`/api/notebooks/${params.id}/audio`, {
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

      // Success case handling here (without toast)
    } catch (error) {
      console.error("Error generating audio:", error);
      setAudioError(
        error instanceof Error ? error.message : "Failed to generate audio"
      );
    } finally {
      setIsGeneratingAudio(false);
    }
  };
  const [selectedSource, setSelectedSource] = useState<{
    title: string;
    content: string;
  } | null>(null);

  // Update the handler function to just set the source content
  const handleSourceClick = (source: Source) => {
    setSelectedSource({
      title: source.title,
      content: source.content,
    });
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] bg-[#1C1C1C]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] bg-[#1C1C1C]">
        <div className="max-w-md text-center space-y-4">
          <div className="text-red-500 bg-red-500/10 px-6 py-4 rounded-lg">
            <h3 className="font-medium mb-2">Access Denied</h3>
            <p className="text-sm">{error}</p>
          </div>
          <Link href="/" className="text-sm text-blue-400 hover:underline">
            Return to Notebooks
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#1C1C1C]">
      <nav className="border-b border-[#2A2A2A]">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <EditableTitle
              initialTitle={notebook?.title || "Untitled notebook"}
              onSave={async (newTitle) => {
                try {
                  const response = await fetch(`/api/notebooks/${params.id}`, {
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
          </div>
          <div className="flex items-center space-x-4">
            <ShareDialog notebookId={params.id} />
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sources Panel */}
        <div
          className={cn(
            "border-r border-[#2A2A2A] bg-[#1C1C1C] transition-all duration-300 relative",
            leftSidebarOpen ? "w-72" : "w-0"
          )}
        >
          <div
            className={cn("p-4 overflow-hidden", !leftSidebarOpen && "hidden")}
          >
            <h2 className="text-sm font-medium text-white mb-4">Sources</h2>
            {/* Sources content */}
            <div className="mb-4">
              {notebook?.sources?.map((source) => (
                <div
                  key={source.id}
                  onClick={() => handleSourceClick(source)}
                  className="cursor-pointer"
                >
                  <SummaryView
                    summary={{
                      content: source.content,
                      metadata: {
                        sourceTitle: source.title,
                      },
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Add source button and dialog */}
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
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Website URL</span>
                          <span className="text-sm text-gray-400">
                            Add content from any website
                          </span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center justify-start space-x-2 h-auto py-4 px-4"
                      >
                        <Youtube className="h-5 w-5" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">YouTube video</span>
                          <span className="text-sm text-gray-400">
                            Add content from a YouTube video
                          </span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex items-center justify-start space-x-2 h-auto py-4 px-4"
                      >
                        <Upload className="h-5 w-5" />
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Upload file</span>
                          <span className="text-sm text-gray-400">
                            Upload a PDF, DOCX, or TXT file
                          </span>
                        </div>
                      </Button>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className="absolute -right-4 top-4 bg-[#1C1C1C] border border-[#2A2A2A] rounded-full p-1"
          >
            {leftSidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 bg-[#1C1C1C]">
          {selectedSource ? (
            <SourceViewer
              source={selectedSource}
              onClose={() => setSelectedSource(null)}
            />
          ) : (
            <Chat ref={chatRef} notebookId={params.id} />
          )}
        </div>

        {/* Studio Panel */}
        <div
          className={cn(
            "border-l border-[#2A2A2A] bg-[#1C1C1C] transition-all duration-300 relative",
            rightSidebarOpen ? "w-80" : "w-0"
          )}
        >
          <div
            className={cn("p-4 overflow-hidden", !rightSidebarOpen && "hidden")}
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-white">
                  Audio Overview
                </h2>
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
                        <svg
                          className="w-6 h-6"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 4V2"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M12 22V20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M20 12H22"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M2 12H4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Deep Dive conversation
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Two hosts (English only)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="w-full">
                        Customize
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleGenerateAudio}
                        disabled={isGeneratingAudio}
                      >
                        {isGeneratingAudio ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Generating...
                          </div>
                        ) : (
                          "Generate"
                        )}
                      </Button>
                    </div>
                    {audioError && (
                      <p className="text-sm text-red-500 mt-2">{audioError}</p>
                    )}
                  </div>
                )}
              </Card>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Notes</h2>
                <AddNoteDialog
                  notebookId={params.id}
                  onNoteAdded={() => {
                    router.refresh();
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button variant="outline" size="sm">
                  Study guide
                </Button>
                <Button variant="outline" size="sm">
                  Briefing doc
                </Button>
                <Button variant="outline" size="sm">
                  FAQ
                </Button>
                <Button variant="outline" size="sm">
                  Timeline
                </Button>
              </div>
              {notebook?.notes && notebook.notes.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {notebook.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 rounded-lg border border-[#3A3A3A] hover:border-[#4A4A4A] 
                      transition-colors bg-[#2A2A2A] cursor-pointer"
                      onClick={() => setSelectedNote(note)}
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
                    <div className="flex justify-center mb-2">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 8V16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8 12H16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-400">No notes yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Click Add note to create your first note
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className="absolute -left-4 top-4 bg-[#1C1C1C] border border-[#2A2A2A] rounded-full p-1"
          >
            {rightSidebarOpen ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <NoteModal
        note={selectedNote}
        isOpen={selectedNote !== null}
        onClose={() => setSelectedNote(null)}
        notebookId={params.id}
      />
    </main>
  );
}
