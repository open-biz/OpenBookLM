"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Grid2X2,
  List,
  MoreVertical,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { Card } from "@/components/ui/card";
import { ShareDialog } from "@/components/share-dialog";
import { Plus, ChevronDown } from "lucide-react";

interface Notebook {
  id: string;
  title: string;
  sources: any[];
  updatedAt: string;
  role: string;
  ownerName: string;
  userId: string;
}

export default function HomePage({
  notebooks: initialNotebooks,
}: {
  notebooks: Notebook[];
}) {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const refreshNotebooks = async () => {
    try {
      const response = await fetch('/api/notebooks');
      if (response.ok) {
        const data = await response.json();
        setNotebooks(data);
      }
    } catch (error) {
      console.error('Error fetching notebooks:', error);
    }
  };

  const getNotebookEmoji = (notebook: Notebook) => {
    if (notebook.title.includes("Introduction")) return "👋";
    return "📔";
  };

  const getGradientClass = (index: number) => {
    const gradients = [
      "bg-gradient-to-br from-yellow-900/40 via-gray-900 to-gray-900",
      "bg-gradient-to-br from-blue-900/40 via-gray-900 to-gray-900",
      "bg-gradient-to-br from-red-900/40 via-gray-900 to-gray-900",
      "bg-gradient-to-br from-green-900/40 via-gray-900 to-gray-900"
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-8">
      <h1 className="text-4xl font-medium mb-8 text-blue-400">Welcome to NotebookLM</h1>
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium">My Notebooks</h2>
          <div className="flex items-center gap-2">
            <CreateNotebookDialog onNotebookCreated={refreshNotebooks}>
              <Button size="sm" variant="secondary" className="flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Create new
              </Button>
            </CreateNotebookDialog>
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
              <Button
                size="sm"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("grid")}
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === "list" ? "secondary" : "ghost"}
                className="h-8 w-8 p-0"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button size="sm" variant="ghost">
              Most recent
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {notebooks.map((notebook, index) => (
            <Link
              key={notebook.id}
              href={`/notebook/${notebook.id}`}
              className={`block group relative rounded-xl overflow-hidden aspect-[4/3] p-6 ${getGradientClass(index)} hover:ring-2 hover:ring-white/10 transition-all`}
            >
              <div className="absolute top-4 right-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="text-2xl mb-2">{getNotebookEmoji(notebook)}</div>
                  <h3 className="text-lg font-medium mb-1 line-clamp-2">{notebook.title}</h3>
                </div>
                <div className="flex items-center text-sm text-gray-400 mt-4">
                  <span>{new Date(notebook.updatedAt).toLocaleDateString()}</span>
                  <span className="mx-2">•</span>
                  <span>{notebook.sources.length} source{notebook.sources.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
