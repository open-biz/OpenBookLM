"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getUserNotebook, setUserNotebook } from "@/lib/redis-utils";
import { useAuth } from "@clerk/nextjs";
import type {
  Notebook,
  Source,
  Chat,
  Note,
  Tag,
  User,
} from "@prisma/client";

type NotebookWithRelations = Notebook & {
  sources: Source[];
  chats: Chat[];
  notes: Note[];
  tags: Tag[];
  user: User;
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
  const [notebook, setNotebook] = useState<NotebookWithRelations>(initialNotebook);

  // Load notebook from Redis on mount
  useEffect(() => {
    if (userId) {
      const loadNotebook = async () => {
        const cached = await getUserNotebook(userId, initialNotebook.id);
        if (cached) {
          setNotebook(cached as NotebookWithRelations);
        }
      };
      loadNotebook();
    }
  }, [userId, initialNotebook.id]);

  // Save notebook to Redis whenever it changes
  const updateNotebook = async (updatedNotebook: NotebookWithRelations) => {
    if (userId) {
      setNotebook(updatedNotebook);
      await setUserNotebook(userId, updatedNotebook.id, updatedNotebook);
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
