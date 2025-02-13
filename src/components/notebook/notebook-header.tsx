"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Settings, Share } from "lucide-react";
import { EditableTitle } from "@/components/editable-title";
import { ShareDialog } from "@/components/share-dialog";

interface NotebookHeaderProps {
  notebookId: string;
  title: string;
  onTitleUpdate: (title: string) => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  leftSidebarOpen?: boolean;
  rightSidebarOpen?: boolean;
}

export function NotebookHeader({
  notebookId,
  title,
  onTitleUpdate,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  leftSidebarOpen = true,
  rightSidebarOpen = true,
}: NotebookHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A] bg-[#1A1A1A] h-[65px] z-10">
      <div className="flex items-center gap-4">
        {!leftSidebarOpen && onToggleLeftSidebar && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hidden md:flex"
            onClick={onToggleLeftSidebar}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        <EditableTitle
          initialTitle={title}
          onSave={onTitleUpdate}
          className="text-lg md:text-xl font-medium"
        />
      </div>
      <div className="flex items-center gap-2">
        <ShareDialog notebookId={notebookId}>
          <Button variant="ghost" size="sm" className="gap-2 hidden md:flex">
            <Share className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </ShareDialog>
        <Button variant="ghost" size="sm" className="gap-2 hidden md:flex">
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Button>
        {!rightSidebarOpen && onToggleRightSidebar && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hidden md:flex"
            onClick={onToggleRightSidebar}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
