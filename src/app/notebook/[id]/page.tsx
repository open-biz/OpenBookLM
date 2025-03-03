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
import { Source } from "@prisma/client";
import { EditableTitle } from "@/components/editable-title";
import { AddNoteDialog } from "@/components/add-note-dialog";
import { NoteModal } from "@/components/note-modal";
import { ShareDialog } from "@/components/share-dialog";
import { SourceViewer } from "@/components/source-viewer";

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

export default function NotebookPage({ params }: { params: { id: string } }) {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
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
    const fetchNotebook = async () => {
      try {
        setLoading(true);
        const [notebookResponse, chatResponse] = await Promise.all([
          fetch(`/api/notebooks/${params.id}`),
          fetch(`/api/chat/history?notebookId=${params.id}`)
        ]);

        const [notebookData, chatData] = await Promise.all([
          notebookResponse.json(),
          chatResponse.json()
        ]);

        if (!notebookResponse.ok) {
          throw new Error(notebookData.error || "Failed to load notebook");
        }

        setNotebook(notebookData);
        if (chatResponse.ok && chatData.messages) {
          setMessages(chatData.messages);
        }
        setError(null);
      } catch (error) {
        console.error("Error fetching notebook:", error);
        setError(error instanceof Error ? error.message : "An error occurred while loading the notebook");
        setNotebook(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNotebook();
  }, [params.id]);

  const handleWebsiteSubmit = (url: string) => {
    console.log("Submitted URL:", url);
  };

  const handleSendToCerebras = (url: string) => {
    chatRef.current?.handleUrlSummary(url);
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    setAudioError(null);

    try {
      const response = await fetch(`/api/notebooks/${params.id}/audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation: {
            style: "deep_dive",
            hosts: 2,
            language: "en",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate audio");
      }

      // Success case handling here (without toast)
    } catch (error) {
      console.error("Error generating audio:", error);
      setAudioError(
        error instanceof Error ? error.message : "Failed to generate audio"
      );
    } finally {
      setIsGeneratingAudio(false);
    }
  };
  const [selectedSource, setSelectedSource] = useState<{
    title: string;
    content: string;
  } | null>(null);

  // Update the handler function to just set the source content
  const handleSourceClick = (source: Source) => {
    setSelectedSource({
      title: source.title,
      content: source.content,
    });
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
          isOpen={leftSidebarOpen}
          isMobile={false}
          mobileOpen={false}
          onCloseMobile={() => setLeftSidebarOpen(false)}
          sources={notebook?.sources}
          onWebsiteSubmit={handleWebsiteSubmit}
          onSendToCerebras={handleSendToCerebras}
        />

        <div className="flex-1 bg-[#1C1C1C] overflow-hidden">
          <Chat ref={chatRef} notebookId={params.id} initialMessages={messages} />
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
    </main>
  );
}
