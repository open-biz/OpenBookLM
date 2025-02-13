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
}

interface UploadProgress {
  [key: string]: {
    progress: number;
    status: "uploading" | "processing" | "complete" | "error";
  };
}

export function CreateNotebookDialog({ children }: CreateNotebookDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [showPasteText, setShowPasteText] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleDriveLoading, setIsGoogleDriveLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const router = useRouter();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
    },
    multiple: true,
  });

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Notebook", // We'll let users rename it later
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create notebook");
      }

      const notebook = await response.json();
      
      // Close the dialog and redirect to the new notebook
      setIsOpen(false);
      router.push(`/notebook/${notebook.id}`);

    } catch (error) {
      console.error("Error creating notebook:", error);
      toast.error("Failed to create notebook");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleDrive = async () => {
    setIsGoogleDriveLoading(true);
    // Close the modal before showing picker

    try {
      await loadGoogleDriveApi();
      const token = await getGoogleToken();
      console.log("token", token);
      setIsOpen(false);

      await createPicker(token, async (file) => {
        try {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const blob = await response.blob();
          const newFile = new File([blob], file.name, {
            type: file.mimeType,
          });
          setFiles((prev) => [...prev, newFile]);
          // Reopen the modal after file is selected
          setIsOpen(true);
        } catch (error) {
          console.error("Error downloading file:", error);
          toast.error("Failed to download file");
          // Reopen the modal on error
          setIsOpen(true);
        }
      });
    } catch (error) {
      console.error("Error with Google Drive:", error);
      toast.error("Failed to connect to Google Drive");
      // Reopen the modal on error
      setIsOpen(true);
    } finally {
      setIsGoogleDriveLoading(false);
    }
  };

  // Link functionality
  const handleLinkSubmit = async (url: string) => {
    try {
      const response = await fetch("/api/fetch-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("Failed to fetch URL content");

      const data = await response.json();
      const blob = new Blob([data.content], { type: "text/plain" });
      const file = new File([blob], `${new URL(url).hostname}.txt`, {
        type: "text/plain",
      });
      setFiles((prev) => [...prev, file]);
      setShowLinkInput(false);
    } catch (error) {
      console.error("Error fetching URL:", error);
    }
  };

  // Paste text functionality
  const handlePasteText = () => {
    setShowPasteText(true);
  };

  const handlePasteSubmit = () => {
    if (pastedText.trim()) {
      // Create a text file from the pasted content
      const blob = new Blob([pastedText], { type: "text/plain" });
      const file = new File([blob], "pasted-text.txt", { type: "text/plain" });
      setFiles((prev) => [...prev, file]);
      setPastedText("");
      setShowPasteText(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only allow closing if picker is not open
        if (!isPickerOpen) {
          setIsOpen(open);
        }
      }}
    >
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children || (
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Notebook
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[425px] bg-[#1A1A1A] border-[#2A2A2A]"
        onPointerDownOutside={(e) => {
          if (isPickerOpen) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (isPickerOpen || document.querySelector(".picker-dialog")) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">Create New Notebook</h2>
            <p className="text-gray-400">
              Start your learning journey with a new notebook
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-200 mb-2">
              Notebook Title
            </label>
            <input
              type="text"
              id="title"
              placeholder="My Research Notes"
              className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Add Sources (Optional)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-[#3A3A3A] hover:bg-[#2A2A2A]"
                onClick={() => setShowPasteText(true)}
              >
                <FileText className="h-4 w-4" />
                Paste Text
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 border-[#3A3A3A] hover:bg-[#2A2A2A]"
                onClick={() => setShowLinkInput(true)}
              >
                <LinkIcon className="h-4 w-4" />
                Add Link
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-[#3A3A3A] hover:bg-[#2A2A2A]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </div>
            ) : (
              "Create"
            )}
          </Button>
        </div>

        {showLinkInput ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Add link</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLinkInput(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <WebsiteURLInput
              onBack={() => setShowLinkInput(false)}
              onSubmit={handleLinkSubmit}
            />
          </div>
        ) : showPasteText ? (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Paste text</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPasteText(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste your text here..."
              className="min-h-[200px] bg-[#2A2A2A] border-[#3A3A3A] text-white"
            />
            <Button
              className="w-full mt-2"
              disabled={!pastedText.trim()}
              onClick={handlePasteSubmit}
            >
              Add text
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="lg"
                onClick={handleGoogleDrive}
                disabled={isGoogleDriveLoading}
              >
                <GanttChartSquare className="h-4 w-4 mr-2" />
                {isGoogleDriveLoading ? "Loading..." : "Google Drive"}
              </Button>
            </div>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="lg"
                onClick={() => setShowLinkInput(true)}
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Link
              </Button>
            </div>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="lg"
                onClick={handlePasteText}
              >
                <FileText className="h-4 w-4 mr-2" />
                Paste text
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || files.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </div>
            ) : (
              "Create notebook"
            )}
          </Button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Source limit</span>
            <span>{files.length} / 50</span>
          </div>
          <div className="w-full h-1 bg-[#2A2A2A] rounded-full mt-2">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${(files.length / 50) * 100}%` }}
            />
          </div>
        </div>

        <GoogleDrivePicker
          isOpen={isGoogleDriveOpen}
          onClose={() => setIsGoogleDriveOpen(false)}
          onFileSelect={handleGoogleDrive}
        />
      </DialogContent>
    </Dialog>
  );
}
