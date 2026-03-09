"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Globe, Sparkles, ArrowRight, Upload, Link as LinkIcon, HardDrive, Files } from "lucide-react";
import { WebsiteURLInput } from "@/components/website-url-input";
import { authClient } from "@/lib/auth-client";

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookId: string;
  onWebsiteSubmit?: (url: string) => void;
  onSendToCerebras?: (url: string) => void;
}

export function AddSourceDialog({ open, onOpenChange, notebookId, onWebsiteSubmit, onSendToCerebras }: AddSourceDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showWebsiteInput, setShowWebsiteInput] = useState(false);
  const { data: session } = authClient.useSession();

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setShowWebsiteInput(false);
    }}>
      <DialogContent className="sm:max-w-[700px] bg-[#1C1C1C] border-[#2A2A2A] p-10 rounded-3xl shadow-2xl gap-8">
        <DialogTitle className="sr-only">Add source</DialogTitle>
        <DialogDescription className="sr-only">Add a new source to your notebook</DialogDescription>
        
        {showWebsiteInput ? (
          <WebsiteURLInput
            notebookId={notebookId}
            userId={session?.user?.id || ""}
            onBack={() => setShowWebsiteInput(false)}
            onSubmit={(url) => {
              onWebsiteSubmit?.(url);
              setShowWebsiteInput(false);
              onOpenChange(false);
            }}
            onSendToCerebras={onSendToCerebras}
          />
        ) : (
          <>
            <div className="text-center space-y-2 mt-4">
              <h2 className="text-3xl font-medium text-white">
                Create Audio and Video Overviews from
              </h2>
              <div className="text-3xl font-medium text-blue-400">
                your documents
              </div>
            </div>

            <div className="relative border border-[#333] rounded-2xl p-2 bg-[#252525] focus-within:border-blue-500 transition-colors">
              <div className="flex items-center px-3 py-2">
                <Search className="w-5 h-5 text-gray-400 mr-3" />
                <input 
                  type="text" 
                  placeholder="Search the web for new sources" 
                  className="bg-transparent border-none outline-none flex-1 text-white placeholder-gray-500 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between mt-2 px-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-full bg-[#1C1C1C] border-[#333] hover:bg-[#333] text-gray-300 h-9 px-4">
                    <Globe className="w-4 h-4 mr-2" /> Web
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full bg-[#1C1C1C] border-[#333] hover:bg-[#333] text-gray-300 h-9 px-4">
                    <Sparkles className="w-4 h-4 mr-2" /> Fast Research
                  </Button>
                </div>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-[#333] text-gray-400">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="border border-dashed border-[#444] rounded-2xl p-10 flex flex-col items-center justify-center bg-[#1A1A1A]">
              <h3 className="text-xl font-medium text-white mb-2 flex items-center gap-2">
                <Upload className="w-5 h-5" /> or drop your files
              </h3>
              <p className="text-sm text-gray-500 mb-8">pdf, images, docs, audio, <span className="underline decoration-gray-500 underline-offset-4 cursor-pointer hover:text-gray-400">and more</span></p>
              
              <div className="flex flex-wrap justify-center gap-4 w-full max-w-lg">
                <Button variant="outline" className="rounded-full bg-[#252525] border-[#333] hover:bg-[#333] text-white h-10 px-5">
                  <Upload className="w-4 h-4 mr-2" /> Upload files
                </Button>
                <Button 
                  variant="outline" 
                  className="rounded-full bg-[#252525] border-[#333] hover:bg-[#333] text-white h-10 px-5"
                  onClick={() => setShowWebsiteInput(true)}
                >
                  <LinkIcon className="w-4 h-4 mr-2 text-red-500" /> Websites
                </Button>
                <Button variant="outline" className="rounded-full bg-[#252525] border-[#333] hover:bg-[#333] text-white h-10 px-5">
                  <HardDrive className="w-4 h-4 mr-2 text-blue-400" /> Drive
                </Button>
                <Button variant="outline" className="rounded-full bg-[#252525] border-[#333] hover:bg-[#333] text-white h-10 px-5">
                  <Files className="w-4 h-4 mr-2 text-gray-400" /> Copied text
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}