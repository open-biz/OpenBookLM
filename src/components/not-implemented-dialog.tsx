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
      <DialogContent className="sm:max-w-[425px] bg-[#1C1C1C] border-[#2A2A2A]">
        <DialogHeader className="text-center sm:text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Hammer className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <DialogTitle className="text-xl text-white">Not Implemented Yet</DialogTitle>
          <DialogDescription className="text-gray-400 pt-2">
            The <span className="text-white font-medium">{featureName}</span> feature is currently under construction. 
            OpenBookLM is entirely open-source, and we rely on community contributions to build out these amazing features!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button asChild className="w-full bg-[#2A3B5C] hover:bg-[#344871] text-blue-400">
            <Link href="https://github.com/open-biz/OpenBookLM/issues" target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-2" />
              Contribute on GitHub
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-white">
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}