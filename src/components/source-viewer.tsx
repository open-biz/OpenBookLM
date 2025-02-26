"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface SourceViewerProps {
  source: {
    title: string;
    content: string;
  } | null;
  onClose: () => void;
}

export function SourceViewer({ source, onClose }: SourceViewerProps) {
  if (!source) return null;

  return (
    <div className="h-full flex flex-col bg-[#1C1C1C]">
      <div className="flex justify-between items-center p-4 border-b border-[#2A2A2A]">
        <h3 className="text-lg font-medium">{source.title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{source.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
