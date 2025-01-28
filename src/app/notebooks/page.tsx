import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NotebooksClient } from "./notebooks-client";
import { getAllNotebooks, setAllNotebooks } from "@/lib/redis-utils";
import type { Notebook } from "@prisma/client";

interface SerializedNotebook extends Omit<Notebook, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  sources: any[];
}

export default async function NotebooksPage() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Try to get notebooks from Redis first
  const cachedNotebooks = await getAllNotebooks(user.id);

  if (cachedNotebooks) {
    const notebooksWithDates = (cachedNotebooks as SerializedNotebook[]).map((notebook) => ({
      ...notebook,
      updatedAt: new Date(notebook.updatedAt),
      createdAt: new Date(notebook.createdAt),
    }));
    return <NotebooksClient notebooks={notebooksWithDates} />;
  }

  // If not in Redis, get from database and cache
  const notebooks = await prisma.notebook.findMany({
    where: {
      userId: user.id,
    },
    include: {
      sources: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Serialize and cache notebooks
  const serializedNotebooks = notebooks.map((notebook) => ({
    ...notebook,
    updatedAt: notebook.updatedAt.toISOString(),
    createdAt: notebook.createdAt.toISOString(),
  })) as SerializedNotebook[];

  await setAllNotebooks(user.id, serializedNotebooks);

  // Convert dates back to Date objects for the component
  const notebooksWithDates = serializedNotebooks.map((notebook) => ({
    ...notebook,
    updatedAt: new Date(notebook.updatedAt),
    createdAt: new Date(notebook.createdAt),
  }));

  return <NotebooksClient notebooks={notebooksWithDates} />;
}
