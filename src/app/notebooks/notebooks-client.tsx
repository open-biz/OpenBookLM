"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Grid2X2, List, MoreVertical, Plus } from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { Card } from "@/components/ui/card";
import type { Notebook, Source } from "@prisma/client";

interface NotebooksClientProps {
  notebooks: (Notebook & {
    sources: Source[];
  })[];
}

export function NotebooksClient({
  notebooks: initialNotebooks,
}: NotebooksClientProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const getNotebookEmoji = (notebook: Notebook) => {
    if (notebook.title.includes("Introduction")) return "👋";
    return "📔";
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      <div className="p-8">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-[40px] leading-tight text-[#8AB4F8] font-normal">
            My Notebooks
          </h1>
          <CreateNotebookDialog>
            <Button
              size="sm"
              className="bg-[#E8F0FE] hover:bg-[#E8F0FE]/80 text-[#1967D2] font-medium px-4 h-9 rounded-full flex items-center"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create new
            </Button>
          </CreateNotebookDialog>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className={`text-gray-400 hover:text-white ${
                  viewMode === "grid" ? "bg-[#2A2A2A]" : ""
                }`}
                onClick={() => setViewMode("grid")}
              >
                <Grid2X2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`text-gray-400 hover:text-white ${
                  viewMode === "list" ? "bg-[#2A2A2A]" : ""
                }`}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <select className="bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A] rounded px-2 py-1 text-sm">
                <option>Most recent</option>
              </select>
            </div>
          </div>

          {viewMode === "list" ? (
            <div className="list-view">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Sources</th>
                    <th>Last modified</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {initialNotebooks.map((notebook) => (
                    <tr
                      key={notebook.id}
                      className="group border-t border-[#2A2A2A] hover:bg-[#2A2A2A]"
                    >
                      <td className="py-3">
                        <Link href={`/notebooks/${notebook.id}`}>
                          <div className="flex items-center">
                            <span className="mr-2">
                              {getNotebookEmoji(notebook)}
                            </span>
                            <span className="text-white">{notebook.title}</span>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3 text-gray-400">
                        {notebook.sources.length} sources
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(notebook.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {initialNotebooks.map((notebook) => (
                <Link key={notebook.id} href={`/notebooks/${notebook.id}`}>
                  <Card className="aspect-[1.4/1] p-6 hover:bg-[#2A2A2A] transition-colors border-[#333333] bg-[#1E1E1E] group relative">
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
                          {new Date(notebook.updatedAt).toLocaleDateString()} ·{" "}
                          {notebook.sources.length} sources
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
