"use client";

import { useState, useEffect } from "react";
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

import { NotImplementedDialog } from "@/components/not-implemented-dialog";
import { NotebookCard } from "@/components/notebook-card";

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
  const [notImplementedOpen, setNotImplementedOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode("list");
      } else {
        setViewMode("grid");
      }
    };
    
    // Set initial layout
    handleResize();
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-16 py-8 sm:py-16">
        <h1 className="text-4xl sm:text-[56px] font-medium leading-tight mb-8 sm:mb-16 hidden sm:block">
          <span className="text-[#4285f4]">Welcome to </span>
          <span className="text-[#8ab4f8]">OpenBookLM</span>
        </h1>
        
        <div>
          {/* Mobile Header elements are generally handled in root-layout, but we can structure the sub-header here */}
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 mt-2 sm:mt-0">
            <div className="flex items-center gap-4 sm:hidden justify-center mb-2">
              <Button 
                variant="outline" 
                className="bg-transparent border-[#333] text-white rounded-full px-5 h-10 w-40 flex justify-between"
              >
                <span>Most recent</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
              <CreateNotebookDialog onNotebookCreated={handleNotebookCreated}>
                <Button 
                  className="flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 rounded-full px-5 h-10 font-medium w-40"
                >
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </CreateNotebookDialog>
            </div>

            <div className="flex items-center justify-center sm:justify-start space-x-4 sm:space-x-6 overflow-x-auto pb-2 scrollbar-none w-full sm:w-auto">
              <button className="px-4 py-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors whitespace-nowrap">
                All
              </button>
              <button className="px-4 py-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors whitespace-nowrap">
                My notebooks
              </button>
              <button 
                className="px-4 py-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors whitespace-nowrap"
                onClick={() => setNotImplementedOpen(true)}
              >
                Shared with me
              </button>            </div>

            <div className="hidden sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
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
                className="text-gray-300 border border-[#333] rounded-full hover:bg-[#2A2A2A] hover:text-white h-9 px-4"
              >
                Most recent
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              <CreateNotebookDialog onNotebookCreated={handleNotebookCreated}>
                <Button 
                  size="sm" 
                  className="flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 rounded-full px-5 h-9 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Create new
                </Button>
              </CreateNotebookDialog>
            </div>
          </div>

          <h2 className="text-[24px] sm:text-[22px] font-medium text-gray-100 mb-6 px-2 sm:px-0">
            {notImplementedOpen ? "Shared with me" : "Recent notebooks"}
          </h2>

          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2 sm:px-0" 
            : "flex flex-col px-2 sm:px-0"
          }>
            {viewMode === "grid" && (
              <CreateNotebookDialog onNotebookCreated={handleNotebookCreated}>
                <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] p-6 bg-[#202020] hover:bg-[#252525] border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all cursor-pointer flex flex-col items-center justify-center text-center h-full">
                  <div className="w-14 h-14 rounded-full bg-[#2A3B5C] flex items-center justify-center mb-4 group-hover:bg-[#344871] transition-colors">
                    <Plus className="h-7 w-7 text-blue-400" />
                  </div>
                  <h3 className="text-[17px] font-medium text-gray-300 group-hover:text-white transition-colors">
                    Create new notebook
                  </h3>
                </div>
              </CreateNotebookDialog>
            )}
            
            {viewMode === "list" && (
              <div className="flex items-center text-sm font-medium text-gray-400 border-b border-[#333] pb-4 mb-2">
                <span className="flex-1">Title</span>
              </div>
            )}

            {notebooks.map((notebook, index) => (
              <NotebookCard 
                key={notebook.id}
                notebook={notebook}
                viewMode={viewMode}
                isDeleting={deletingNotebookId === notebook.id}
                onDelete={handleDeleteNotebook}
              />
            ))}
          </div>
        </div>
      </div>
      <NotImplementedDialog 
        open={notImplementedOpen} 
        onOpenChange={setNotImplementedOpen} 
        featureName="Notebook Sharing" 
      />
    </div>
  );
}
