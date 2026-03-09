"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Github, Hammer } from "lucide-react";
import Link from "next/link";

interface NotImplentedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

export function NotImplementedDialog({
  open,
  onOpenChange,
  featureName,
}: NotImplentedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-full max-w-[100vw] h-auto max-h-[100vh] sm:rounded-2xl rounded-b-none rounded-t-[32px] bottom-0 sm:bottom-auto translate-y-0 sm:-translate-y-1/2 top-auto sm:top-[50%] p-8 bg-[#1C1C1C] border-[#2A2A2A] border-b-0 sm:border-b flex flex-col gap-6 slide-in-from-bottom-1/2 sm:slide-in-from-bottom-0 sm:zoom-in-95 data-[state=closed]:slide-out-to-bottom-1/2 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=closed]:zoom-out-95">
        <DialogHeader className="text-center sm:text-center mt-2">
          <div className="flex justify-center mb-6">
            <div className="h-14 w-14 rounded-full bg-[#2A3B5C] flex items-center justify-center">
              <Hammer className="h-7 w-7 text-blue-400" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-medium text-white mb-2">Not Implemented Yet</DialogTitle>
          <DialogDescription className="text-gray-400 text-base leading-relaxed">
            The <span className="text-white font-medium">{featureName}</span> feature is currently under construction. 
            OpenBookLM is entirely open-source, and we rely on community contributions to build out these amazing features!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-2 mb-4">
          <Button asChild className="w-full h-12 rounded-full bg-white hover:bg-gray-200 text-black font-medium text-base transition-colors">
            <Link href="https://github.com/open-biz/OpenBookLM/issues" target="_blank" rel="noopener noreferrer">
              <Github className="h-5 w-5 mr-3" />
              Contribute on GitHub
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full h-12 rounded-full text-gray-400 hover:text-white font-medium text-base hover:bg-[#2A2A2A]">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}