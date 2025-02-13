"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Grid2X2,
  List,
  MoreVertical,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { Card } from "@/components/ui/card";
import { ShareDialog } from "@/components/share-dialog";

interface Notebook {
  id: string;
  title: string;
  sources: any[];
  updatedAt: string;
  role: string;
  ownerName: string;
  userId: string;
}

export default function HomePage({
  notebooks: initialNotebooks,
}: {
  notebooks: Notebook[];
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const getNotebookEmoji = (notebook: Notebook) => {
    if (notebook.title.includes("Introduction")) return "👋";
    return "📔";
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <div
        className={`p-12 transition-all duration-300 
        ${leftSidebarOpen ? "ml-28" : "ml-0"} 
        ${rightSidebarOpen ? "mr-8" : "mr-0"} 
        mt-28`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="max-w-3xl">
            <h1 className="text-[60px] leading-[1.2] font-[500] font-['Google_Sans','Helvetica_Neue',sans-serif] text-white mb-4">
              OpenBookLM
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Your AI-powered research companion. Transform content into meaningful conversations through open-source flexibility and collaborative learning.
            </p>
            <div className="flex items-center gap-4">
              <CreateNotebookDialog>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                  Start Learning
                </Button>
              </CreateNotebookDialog>
              <Button size="lg" variant="outline" asChild>
                <Link href="https://github.com/open-biz/OpenBookLM" target="_blank">
                  View on GitHub
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-blue-600/10 text-blue-500" : ""}
            >
              <Grid2X2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-blue-600/10 text-blue-500" : ""}
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Notebooks Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Your Notebooks</h2>
          <div
            className={`grid gap-6 ${
              viewMode === "grid"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1"
            }`}
          >
            {viewMode === "list" ? (
              <div className="list-view">
                <table className="w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-gray-400 text-sm">
                      <th className="text-left font-medium py-2 px-4">Title</th>
                      <th className="text-left font-medium w-32 py-2 px-4">
                        Sources
                      </th>
                      <th className="text-left font-medium w-40 py-2 px-4">
                        Created
                      </th>
                      <th className="text-left font-medium w-24 py-2 px-4">
                        Role
                      </th>
                      <th className="w-32 py-2 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialNotebooks.map((notebook) => (
                      <tr
                        key={notebook.id}
                        className="group hover:bg-[#2A2A2A] transition-colors"
                      >
                        <td className="py-2 px-4">
                          <Link
                            href={`/notebook/${notebook.id}`}
                            className="flex items-center gap-3 text-white hover:text-blue-400"
                          >
                            <span>📓</span>
                            {notebook.title}
                          </Link>
                        </td>
                        <td className="py-2 px-4 text-gray-400">
                          {notebook.sources.length}{" "}
                          {notebook.sources.length === 1 ? "Source" : "Sources"}
                        </td>
                        <td className="py-2 px-4 text-gray-400">
                          {new Date(notebook.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-4 text-gray-400">
                          {notebook.role === "Owner" ? (
                            "Owner"
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>Reader</span>
                              <span className="text-xs">·</span>
                              <span className="text-xs">
                                by {notebook.ownerName}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-4 flex justify-end gap-2">
                          {notebook.role === "Owner" && (
                            <ShareDialog notebookId={notebook.id} />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {initialNotebooks.map((notebook) => (
                  <div key={notebook.id} className="relative">
                    <Link href={`/notebook/${notebook.id}`}>
                      <Card className="aspect-[1.4/1] p-6 hover:bg-[#2A2A2A] transition-colors border-[#333333] bg-[#1E1E1E] group">
                        <div className="flex flex-col h-full">
                          <div className="mb-2">
                            <span className="text-2xl">
                              {getNotebookEmoji(notebook)}
                            </span>
                          </div>
                          <h3 className="text-lg font-medium text-white mb-2">
                            {notebook.title}
                          </h3>
                          <div className="mt-auto">
                            <p className="text-sm text-gray-400">
                              {new Date(notebook.updatedAt).toLocaleDateString()}{" "}
                              · {notebook.sources.length} sources
                            </p>
                            {notebook.role !== "Owner" && (
                              <p className="text-xs text-gray-500 mt-1">
                                Shared by {notebook.ownerName}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                    {notebook.role === "Owner" && (
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ShareDialog notebookId={notebook.id} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
