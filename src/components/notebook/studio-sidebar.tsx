"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioLoading } from "@/components/audio-loading";
import { AddNoteDialog } from "@/components/add-note-dialog";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface StudioSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  notebookId: string;
  notes?: Note[];
  onNoteSelect?: (note: Note) => void;
}

export function StudioSidebar({
  isOpen,
  isMobile,
  mobileOpen,
  onCloseMobile,
  notebookId,
  notes = [],
  onNoteSelect
}: StudioSidebarProps) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const router = useRouter();

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
    <div
      className={cn(
        "md:w-72 h-full border-l border-[#2A2A2A] bg-[#1A1A1A] transition-all duration-300 flex flex-col z-30",
        "fixed md:relative w-full right-0", // Mobile positioning
        "md:translate-x-0", // Always show on desktop
        mobileOpen 
          ? "translate-x-0" 
          : "translate-x-full md:translate-x-0",
        !isOpen && "md:hidden" // Hide on desktop when toggled
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] sticky top-0 bg-[#1A1A1A] z-10">
        <h2 className="text-lg font-medium">Studio</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 md:hidden"
          onClick={onCloseMobile}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
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
              notebookId={notebookId}
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
          {notes.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border border-[#3A3A3A] hover:border-[#4A4A4A] 
                    transition-colors bg-[#2A2A2A] cursor-pointer"
                  onClick={() => onNoteSelect?.(note)}
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
                  <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none">
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
    </div>
  );
}
