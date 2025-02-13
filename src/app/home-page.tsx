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
  Trash2,
} from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { Card } from "@/components/ui/card";
import { ShareDialog } from "@/components/share-dialog";
import { Plus, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  const [deletingNotebookId, setDeletingNotebookId] = useState<string | null>(null);

  const refreshNotebooks = async () => {
    // Start fetching in the background
    fetch('/api/notebooks')
      .then(response => response.json())
      .then(data => {
        setNotebooks(data);
      })
      .catch(error => {
        console.error('Error fetching notebooks:', error);
      });
  };

  const handleNotebookCreated = (newNotebook: Notebook) => {
    // Optimistically add the new notebook to the list
    setNotebooks(prev => [newNotebook, ...prev]);
    
    // Refresh in the background to get the latest state
    refreshNotebooks();
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    // Optimistically remove the notebook
    setDeletingNotebookId(notebookId);
    const previousNotebooks = [...notebooks];
    setNotebooks(prev => prev.filter(n => n.id !== notebookId));

    try {
      const response = await fetch(`/api/notebooks/${notebookId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to delete notebook');
      }

      toast.success('Notebook deleted successfully');
    } catch (error) {
      console.error('Error deleting notebook:', error);
      toast.error('Failed to delete notebook');
      
      // Revert the optimistic update with the exact previous state
      setNotebooks(previousNotebooks);
    } finally {
      setDeletingNotebookId(null);
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
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="max-w-[1400px] mx-auto px-16 py-16">
        <h1 className="text-[56px] font-medium leading-tight mb-16">
          <span className="text-[#4285f4]">Welcome to </span>
          <span className="text-[#8ab4f8]">OpenBookLM</span>
        </h1>
        
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-medium text-gray-100">My Notebooks</h2>
            <div className="flex items-center gap-3">
              <CreateNotebookDialog onNotebookCreated={handleNotebookCreated}>
                <Button 
                  size="sm" 
                  className="flex items-center gap-2 bg-[#4285f4] hover:bg-[#4285f4]/90 text-white rounded-full px-4 h-9"
                >
                  <Plus className="h-4 w-4" />
                  Create new
                </Button>
              </CreateNotebookDialog>
              <div className="flex items-center gap-0.5 bg-[#2A2A2A] rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  className={`h-8 w-8 p-0 rounded-md ${
                    viewMode === "grid" ? "bg-[#202020]" : ""
                  }`}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid2X2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  className={`h-8 w-8 p-0 rounded-md ${
                    viewMode === "list" ? "bg-[#202020]" : ""
                  }`}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-gray-400 hover:text-gray-300 h-9 px-3"
              >
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
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] p-6 bg-gradient-to-br from-gray-800/50 via-gray-900 to-gray-900 hover:ring-1 hover:ring-white/10 transition-all"
              >
                <div className="absolute top-3 right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white rounded-full"
                        disabled={deletingNotebookId === notebook.id}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteNotebook(notebook.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-col h-full">
                  <div>
                    <div className="text-2xl mb-3">{getNotebookEmoji(notebook)}</div>
                    <h3 className="text-[17px] font-medium text-gray-100 line-clamp-2 leading-snug">
                      {notebook.title}
                    </h3>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-auto pt-4">
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
    </div>
  );
}
