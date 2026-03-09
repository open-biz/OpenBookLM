import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, LinkIcon, Upload, Youtube, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebsiteURLInput } from "@/components/website-url-input";
import { SummaryView } from "@/components/summary-view";
import type { Source } from "@prisma/client";
import { authClient } from "@/lib/auth-client";

interface SourcesSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  sources?: Source[];
  onWebsiteSubmit?: (url: string) => void;
  onSendToCerebras?: (url: string) => void;
  notebookId: string;
  onOpenAddSource: () => void;
}

export function SourcesSidebar({
  isOpen,
  isMobile,
  mobileOpen,
  onCloseMobile,
  sources = [],
  onWebsiteSubmit,
  onSendToCerebras,
  notebookId,
  onOpenAddSource
}: SourcesSidebarProps) {
  const { data: session } = authClient.useSession();

  return (
    <div
      className={cn(
        "md:w-72 h-full border-r border-[#2A2A2A] bg-[#1A1A1A] transition-all duration-300 flex flex-col z-30",
        "fixed md:relative w-full", // Mobile positioning
        "md:translate-x-0", // Always show on desktop
        mobileOpen 
          ? "translate-x-0" 
          : "-translate-x-full md:translate-x-0",
        !isOpen && "md:hidden" // Hide on desktop when toggled
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] sticky top-0 bg-[#1A1A1A] z-10">
        <h2 className="text-lg font-medium">Sources</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 md:hidden"
          onClick={onCloseMobile}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h2 className="text-sm font-medium text-white mb-4">Sources</h2>
          <div className="mb-4">
            {sources.map((source) => (
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
            {sources.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-8">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p>Saved sources will appear here</p>
                <p className="mt-2 text-xs">Click Add source above to add PDFs, websites, text, videos, or audio files.</p>
              </div>
            )}
          </div>
          <Button className="w-full mb-4 bg-[#2A2A2A] hover:bg-[#333] text-white border-0 rounded-full" variant="outline" onClick={onOpenAddSource}>
            + Add sources
          </Button>
        </div>
      </div>
    </div>
  );
}
