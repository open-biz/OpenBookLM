"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notebook {
  id: string;
  title: string;
  sources: any[];
  updatedAt: string;
  role: string;
  ownerName: string;
  userId: string;
}

interface NotebookCardProps {
  notebook: Notebook;
  viewMode: "grid" | "list";
  isDeleting: boolean;
  onDelete: (id: string) => void;
}

function getNotebookEmoji(notebook: Notebook) {
  const title = notebook.title.toLowerCase();
  if (title.includes("physics") || title.includes("science")) return "⚛️";
  if (title.includes("math") || title.includes("calculus")) return "➗";
  if (title.includes("history")) return "🏛️";
  if (title.includes("literature") || title.includes("book")) return "📚";
  if (title.includes("biology") || title.includes("bio")) return "🧬";
  if (title.includes("chemistry") || title.includes("chem")) return "🧪";
  if (title.includes("art")) return "🎨";
  if (title.includes("music")) return "🎵";
  if (title.includes("geography")) return "🌍";
  if (title.includes("computer") || title.includes("code")) return "💻";
  if (title.includes("language") || title.includes("spanish") || title.includes("french")) return "🗣️";
  if (title.includes("economy") || title.includes("business") || title.includes("finance")) return "📈";
  if (title.includes("psychology") || title.includes("mind")) return "🧠";
  if (title.includes("law") || title.includes("legal")) return "⚖️";
  if (title.includes("medical") || title.includes("health") || title.includes("medicine")) return "🏥";
  if (title.includes("engineering")) return "⚙️";
  if (title.includes("architecture")) return "🏗️";
  if (title.includes("philosophy")) return "🤔";
  if (title.includes("ai") || title.includes("artificial intelligence") || title.includes("machine learning")) return "🤖";
  if (title.includes("space") || title.includes("astronomy") || title.includes("universe")) return "🚀";
  if (title.includes("environmental") || title.includes("ecology") || title.includes("climate")) return "🌱";
  if (title.includes("political") || title.includes("government")) return "🗳️";
  if (title.includes("sociology") || title.includes("society")) return "👥";
  if (title.includes("marketing") || title.includes("advertising")) return "📊";
  if (title.includes("crypto") || title.includes("blockchain") || title.includes("solana") || title.includes("bitcoin")) return "🪙";
  return "📔";
}

export function NotebookCard({ notebook, viewMode, isDeleting, onDelete }: NotebookCardProps) {
  return (
    <Link
      href={`/notebook/${notebook.id}`}
      className={viewMode === "grid"
        ? "group relative rounded-2xl overflow-hidden aspect-[4/3] p-6 bg-[#1C1C1C] border border-[#2A2A2A] hover:bg-[#252525] hover:border-[#3A3A3A] transition-all flex flex-col h-full"
        : "group relative flex items-center justify-between py-4 border-b border-[#2A2A2A] hover:bg-[#1C1C1C] transition-colors px-2"
      }
    >
      <div className={viewMode === "grid" ? "flex flex-col h-full" : "flex items-center gap-4 flex-1"}>
        <div className={viewMode === "grid" ? "text-2xl mb-3" : "text-xl"}>
          {getNotebookEmoji(notebook)}
        </div>
        <div className={viewMode === "grid" ? "" : "flex-1"}>
          <h3 className="text-[17px] font-medium text-gray-100 line-clamp-2 leading-snug">
            {notebook.title}
          </h3>
        </div>
        
        {viewMode === "grid" && (
          <div className="flex items-center text-sm text-gray-500 mt-auto pt-4">
            <span>{new Date(notebook.updatedAt).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>{notebook.sources.length} source{notebook.sources.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className={viewMode === "grid" ? "absolute top-3 right-3" : ""}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={viewMode === "grid" 
                ? "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white rounded-full"
                : "h-8 w-8 p-0 text-blue-400 hover:text-blue-300 hover:bg-[#2A2A2A] rounded-full"
              }
              disabled={isDeleting}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-[#1C1C1C] border-[#2A2A2A] text-white">
            <DropdownMenuItem
              className="text-red-500 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                onDelete(notebook.id);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
}