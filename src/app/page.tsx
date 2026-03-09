import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { setAllNotebooks } from "@/lib/redis-utils";
import HomePage from "./home-page";

export default async function Page() {
  const user = await getOrCreateUser();

  if (!user) {
    redirect("/sign-in");
  }

  const notebooks = await prisma.notebook.findMany({
    where: {
      OR: [
        { userId: user.id },
        {
          bookmarkedBy: {
            some: { id: user.id },
          },
        },
        {
          sharedWith: {
            some: { id: user.id },
          },
        },
      ],
    },
    include: {
      sources: true,
      user: true,
      sharedWith: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // Cache all notebooks in Redis
  const serializedNotebooks = notebooks.map((notebook) => ({
    ...notebook,
    sources: notebook.sources,
    updatedAt: notebook.updatedAt.toISOString(),
    createdAt: notebook.createdAt.toISOString(),
    role:
      notebook.userId === user.id
        ? "Owner"
        : notebook.sharedWith.some((u) => u.id === user.id)
        ? "Editor"
        : "Reader",
    ownerName: notebook.user.name || "Unknown",
    userId: notebook.userId,
  }));

  await setAllNotebooks(user.id, serializedNotebooks);

  return <HomePage notebooks={serializedNotebooks} />;
}
