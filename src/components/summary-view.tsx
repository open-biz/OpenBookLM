import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Copy, Share } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface SummaryViewProps {
  summary: {
    content: string;
    metadata?: {
      title?: string;
      author?: string;
      date?: string;
      sourceTitle?: string;
      [key: string]: any;
    };
  };
}

export function SummaryView({ summary }: SummaryViewProps) {
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summary.content);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Card className="bg-[#2A2A2A] border-[#3A3A3A] p-4 mb-4">
      {/* Source Title */}
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white">
          {summary.metadata?.sourceTitle || "Untitled Source"}
        </h3>
      </div>

      {/* Content Section - Only show when expanded */}
      {expanded && (
        <>
          {/* Additional Metadata if available */}
          {summary.metadata && (
            <div className="mb-4 text-sm text-gray-400">
              <div className="space-y-1">
                {summary.metadata.author && (
                  <p>Author: {summary.metadata.author}</p>
                )}
                {summary.metadata.date && <p>Date: {summary.metadata.date}</p>}
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown>{summary.content}</ReactMarkdown>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Show more
            </>
          )}
        </Button>

        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={copyToClipboard}
            className="text-gray-400 hover:text-white"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
