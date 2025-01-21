import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import HomePage from "./home-page";
import { setAllNotebooks } from "@/lib/redis-utils";

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div className="flex-1 p-8">
          <h1 className="text-[40px] leading-tight text-[#8AB4F8] font-normal mb-6">
            Welcome to OpenBookLM
          </h1>
          <div className="max-w-2xl">
            <p className="text-[15px] text-gray-400">
              Your AI-powered research companion. Transform content into
              meaningful conversations.
            </p>
          </div>
        </div>
      </div>
    );
  }

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

  // Cache all notebooks in Redis
  const serializedNotebooks = notebooks.map((notebook) => ({
    ...notebook,
    updatedAt: notebook.updatedAt.toISOString(),
    createdAt: notebook.createdAt.toISOString(),
  }));

  await setAllNotebooks(user.id, serializedNotebooks);

  return <HomePage notebooks={serializedNotebooks} />;
}
