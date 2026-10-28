"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chat, Message } from "@/components/chat";
import { NotebookHeader } from "@/components/notebook/notebook-header";
import { SourcesSidebar } from "@/components/notebook/sources-sidebar";
import { StudioSidebar } from "@/components/notebook/studio-sidebar";
import { MobileNotebook } from "@/components/notebook/mobile-notebook";
import { cn } from "@/lib/utils";
import type { Source } from "@prisma/client";
import { normalizeHistory } from "./contracts.mjs";

interface Notebook {
  id: string;
  title: string;
  content: string | null;
  description: string | null;
  sources: Source[];
  notes: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }[];
}

import { AddSourceDialog } from "@/components/notebook/add-source-dialog";

export default function NotebookPage({ notebookId }: { notebookId: string }) {
  const params = { id: notebookId };
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const chatRef = useRef<{ handleUrlSummary: (url: string) => void }>(null);
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    const fetchNotebook = async () => {
      try {
        setLoading(true);
        const [notebookResponse, chatResponse] = await Promise.all([
          fetch(`/api/notebooks/${params.id}`, { signal: abort.signal, cache: 'no-store', credentials: 'same-origin' }),
          fetch(`/api/chat/history?notebookId=${params.id}`, { signal: abort.signal, cache: 'no-store', credentials: 'same-origin' })
        ]);

        const [notebookData, chatData] = await Promise.all([
          notebookResponse.json(),
          chatResponse.json()
        ]);

        if (abort.signal.aborted) return;

        if (!notebookResponse.ok) {
          throw new Error(notebookData.error || "Failed to load notebook");
        }

        setNotebook(notebookData);
        if (notebookData.sources && notebookData.sources.length === 0) {
          setIsAddSourceOpen(true);
        }
        
        if (chatResponse.ok) {
          setMessages(normalizeHistory(chatData));
        }
        setError(null);
      } catch (error) {
        if (abort.signal.aborted) return;
        console.error("Error fetching notebook:", error);
        setError(error instanceof Error ? error.message : "An error occurred while loading the notebook");
        setNotebook(null);
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    };

    fetchNotebook();
    return () => abort.abort();
  }, [params.id]);

  const handleWebsiteSubmit = (url: string) => {
    console.log("Submitted URL:", url);
  };

  const handleSendToCerebras = (url: string) => {
    chatRef.current?.handleUrlSummary(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1C1C1C]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1C1C1C]">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <MobileNotebook
        notebookId={params.id}
        notebook={notebook}
        onWebsiteSubmit={handleWebsiteSubmit}
        onSendToCerebras={handleSendToCerebras}
        initialMessages={messages}
      />
    );
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[#1C1C1C]">
      <NotebookHeader 
        notebookId={params.id}
        title={notebook?.title || "Untitled notebook"}
        onTitleUpdate={async (newTitle) => {
          try {
            const response = await fetch(`/api/notebooks/${params.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ title: newTitle }),
            });

            if (!response.ok) {
              throw new Error("Failed to update title");
            }

            if (notebook) {
              setNotebook({ ...notebook, title: newTitle });
            }
          } catch (error) {
            console.error("Failed to update notebook title:", error);
          }
        }}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
      />

      <div className="flex h-[calc(100vh-121px)] overflow-hidden">
        <SourcesSidebar
          notebookId={params.id}
          isOpen={leftSidebarOpen}
          isMobile={false}
          mobileOpen={false}
          onCloseMobile={() => setLeftSidebarOpen(false)}
          sources={notebook?.sources}
          onWebsiteSubmit={handleWebsiteSubmit}
          onSendToCerebras={handleSendToCerebras}
          onOpenAddSource={() => setIsAddSourceOpen(true)}
        />

        <div className="flex-1 bg-[#1A1A1A] overflow-hidden rounded-tl-2xl rounded-tr-2xl border border-[#2A2A2A] shadow-lg mt-4 mx-4 mb-4">
          <Chat 
            ref={chatRef} 
            notebookId={params.id} 
            initialMessages={messages} 
            hasSources={(notebook?.sources?.length ?? 0) > 0}
            onOpenAddSource={() => setIsAddSourceOpen(true)}
          />
        </div>

        <StudioSidebar
          notebookId={params.id}
          isOpen={rightSidebarOpen}
          isMobile={false}
          mobileOpen={false}
          onCloseMobile={() => {}}
          notes={notebook?.notes}
        />
      </div>

      <AddSourceDialog
        open={isAddSourceOpen}
        onOpenChange={setIsAddSourceOpen}
        notebookId={params.id}
        onWebsiteSubmit={handleWebsiteSubmit}
        onSendToCerebras={handleSendToCerebras}
      />
    </main>
  );
}
