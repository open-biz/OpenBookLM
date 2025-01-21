import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NotebookClient } from "./notebook-client";

export default async function NotebookPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getOrCreateUser();

  if (!user) {
    redirect("/sign-in");
  }

  const notebook = await prisma.notebook.findFirst({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: {
      sources: true,
      chats: true,
      notes: true,
    },
  });

  if (!notebook) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-400">Notebook not found</p>
      </div>
    );
  }

  return <NotebookClient notebook={notebook} />;
}
