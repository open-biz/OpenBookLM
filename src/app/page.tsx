import { redirect } from "next/navigation";
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
      user: true,
      bookmarkedBy: true,
      sharedWith: true,
      sources: true,
      chats: true,
      notes: true,
      tags: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  // Cache notebooks in Redis
  await setAllNotebooks(user.id, notebooks);

  return (
    <HomePage notebooks={notebooks} />
  );
}
