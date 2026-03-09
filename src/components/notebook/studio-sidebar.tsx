"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, Wand2, FileAudio, Presentation, FileVideo, GitMerge, FileText, GalleryHorizontal, HelpCircle, BarChart3, Table } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function StudioSidebar({
  isOpen,
  isMobile,
  mobileOpen,
  onCloseMobile,
  notebookId,
  notes = [],
  onNoteSelect
}: StudioSidebarProps) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "md:w-80 h-full border-l border-[#2A2A2A] bg-[#1A1A1A] transition-all duration-300 flex flex-col z-30",
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

        {notes.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar flex-1">
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
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 -mt-8">
            <Wand2 className="h-6 w-6 text-gray-500 mb-4" />
            <p className="text-sm text-gray-300 font-medium mb-1">Studio output will be saved here.</p>
            <p className="text-xs text-gray-500">
              After adding sources, click to add Audio Overview, Study Guide, Mind Map, and more!
            </p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#2A2A2A] flex justify-center sticky bottom-0 bg-[#1A1A1A] z-10">
        <AddNoteDialog
          notebookId={notebookId}
          onNoteAdded={() => router.refresh()}
        />
      </div>
    </div>
  );
}
