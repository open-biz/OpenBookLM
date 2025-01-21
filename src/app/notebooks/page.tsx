import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NotebooksClient } from "./notebooks-client";
import { getAllNotebooks, setAllNotebooks } from "@/lib/redis-utils";

export default async function NotebooksPage() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Try to get notebooks from Redis first
  const cachedNotebooks = await getAllNotebooks(user.id);

  if (cachedNotebooks) {
    return <NotebooksClient notebooks={cachedNotebooks} />;
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
  }));

  await setAllNotebooks(user.id, serializedNotebooks);

  return <NotebooksClient notebooks={serializedNotebooks} />;
}
