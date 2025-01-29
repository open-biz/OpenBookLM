"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import type { Notebook, Source, Chat, Note } from "@prisma/client";

type NotebookWithRelations = Notebook & {
  sources: Source[];
  chats: Chat[];
  notes: Note[];
};

interface NotebookContextType {
  notebook: NotebookWithRelations | null;
  updateNotebook: (notebook: NotebookWithRelations) => Promise<void>;
}

const NotebookContext = createContext<NotebookContextType | undefined>(
  undefined
);

export function NotebookProvider({
  children,
  initialNotebook,
}: {
  children: React.ReactNode;
  initialNotebook: NotebookWithRelations;
}) {
  const { userId } = useAuth();
  const [notebook, setNotebook] =
    useState<NotebookWithRelations>(initialNotebook);

  // Load notebook from API on mount
  useEffect(() => {
    if (userId) {
      const loadNotebook = async () => {
        try {
          const response = await fetch(`/api/notebooks/${initialNotebook.id}`);
          if (response.ok) {
            const data = await response.json();
            setNotebook(data);
          }
        } catch (error) {
          console.error("Error loading notebook:", error);
        }
      };
      loadNotebook();
    }
  }, [userId, initialNotebook.id]);

  // Save notebook through API whenever it changes
  const updateNotebook = async (updatedNotebook: NotebookWithRelations) => {
    if (userId) {
      try {
        const response = await fetch(`/api/notebooks/${updatedNotebook.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedNotebook),
        });

        if (response.ok) {
          setNotebook(updatedNotebook);
        }
      } catch (error) {
        console.error("Error updating notebook:", error);
      }
    }
  };

  return (
    <NotebookContext.Provider value={{ notebook, updateNotebook }}>
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebook() {
  const context = useContext(NotebookContext);
  if (context === undefined) {
    throw new Error("useNotebook must be used within a NotebookProvider");
  }
  return context;
}
