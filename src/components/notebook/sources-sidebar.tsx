import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, LinkIcon, Upload, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebsiteURLInput } from "@/components/website-url-input";
import { SummaryView } from "@/components/summary-view";
import type { Source } from "@prisma/client";

interface SourcesSidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  sources?: Source[];
  onWebsiteSubmit?: (url: string) => void;
  onSendToCerebras?: (url: string) => void;
}

export function SourcesSidebar({
  isOpen,
  isMobile,
  mobileOpen,
  onCloseMobile,
  sources = [],
  onWebsiteSubmit,
  onSendToCerebras
}: SourcesSidebarProps) {
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const [addSourceOpen, setAddSourceOpen] = useState(false);

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
          </div>
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
      </div>
    </div>
  );
}
