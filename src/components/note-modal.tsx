import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Save, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface NoteModalProps {
  note: {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  notebookId: string;
}

export function NoteModal({
  note,
  isOpen,
  onClose,
  notebookId,
}: NoteModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note?.title || "");
  const [editedContent, setEditedContent] = useState(note?.content || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.content);
    }
  }, [note]);

  const copyToClipboard = async () => {
    if (note) {
      try {
        await navigator.clipboard.writeText(note.content);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleSave = async () => {
    if (!note) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/notebooks/${notebookId}/notes/${note.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: editedTitle,
            content: editedContent,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      setIsEditing(false);
      // Force a refresh of the parent component
      window.location.reload();
    } catch (error) {
      console.error("Error updating note:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] w-[90vw] bg-[#1C1C1C] border-[#2A2A2A] max-h-[85vh] overflow-hidden flex flex-col p-4">
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-center justify-between">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="bg-[#2A2A2A] border-[#3A3A3A] flex-1 mr-2"
              />
            ) : (
              <DialogTitle className="break-words pr-2">
                {note?.title}
              </DialogTitle>
            )}
            <div className="flex gap-2 flex-shrink-0">
              {isEditing ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="text-green-500 hover:text-green-400"
                >
                  <Save className="h-4 w-4" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyToClipboard}
                    className="text-gray-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {note && new Date(note.createdAt).toLocaleDateString()}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          {isEditing ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="h-full min-h-[200px] max-h-[calc(85vh-150px)] bg-[#2A2A2A] border-[#3A3A3A] w-full resize-none overflow-y-auto custom-scrollbar"
            />
          ) : (
            <div className="text-sm text-gray-200 whitespace-pre-wrap break-words overflow-y-auto h-full max-h-[calc(85vh-150px)] pr-4 custom-scrollbar">
              <pre className="whitespace-pre-wrap break-words font-mono bg-[#2A2A2A] p-4 rounded-lg overflow-x-auto">
                {note?.content}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
