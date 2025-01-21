import { getOrCreateUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { NotebooksClient } from "./notebooks-client";

export default async function NotebooksPage() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect("/sign-in");
  }

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

  return <NotebooksClient notebooks={notebooks} />;
}
