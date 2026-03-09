"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Upload,
  GanttChartSquare,
  FileText,
  Link as LinkIcon,
  Files,
} from "lucide-react";
import { Textarea } from "./ui/textarea";
import { GoogleDrivePicker } from "./google-drive-picker";
import { WebsiteURLInput } from "@/components/website-url-input";
import { toast } from "sonner";
import {
  loadGoogleDriveApi,
  getGoogleToken,
  createPicker,
} from "@/lib/google-drive";

interface CreateNotebookDialogProps {
  children?: React.ReactNode;
  onNotebookCreated?: (notebook: any) => void;
}

interface UploadProgress {
  [key: string]: {
    progress: number;
    status: "uploading" | "processing" | "complete" | "error";
  };
}

export function CreateNotebookDialog({ children, onNotebookCreated }: CreateNotebookDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleCreateNotebook = async () => {
    // Create an optimistic notebook
    const optimisticNotebook = {
      id: `temp-${Date.now()}`,
      title: "Untitled notebook",
      sources: [],
      updatedAt: new Date().toISOString(),
      role: "owner",
      ownerName: "", // Will be filled by server
      userId: "", // Will be filled by server
    };

    // Call the callback immediately with optimistic data
    if (onNotebookCreated) {
      onNotebookCreated(optimisticNotebook);
    }

    try {
      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Untitled notebook", // Match UI spec
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create notebook");
      }

      const notebook = await response.json();
      
      // Navigate to the new notebook
      router.push(`/notebook/${notebook.id}`);
      
      // Refresh the router cache in the background
      router.refresh();
    } catch (error) {
      console.error("Error creating notebook:", error);
      toast.error("Failed to create notebook");
    }
  };

  // Instead of showing dialog, directly handle notebook creation
  return children ? (
    <div onClick={handleCreateNotebook}>
      {children}
    </div>
  ) : (
    <Button
      variant="secondary"
      className="rounded-full px-4 h-10 flex items-center gap-2 bg-white text-black hover:bg-gray-200"
      onClick={handleCreateNotebook}
    >
      <Plus className="h-4 w-4" />
      Create notebook
    </Button>
  );
}
