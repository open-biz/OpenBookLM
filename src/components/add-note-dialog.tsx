import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface AddNoteDialogProps {
  notebookId: string;
  onNoteAdded?: () => void;
}

export function AddNoteDialog({ notebookId, onNoteAdded }: AddNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      setTitle("");
      setContent("");
      setOpen(false);
      onNoteAdded?.();
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add note
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#1C1C1C] border-[#2A2A2A]">
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#2A2A2A] border-[#3A3A3A]"
            />
          </div>
          <div className="space-y-2">
            <Textarea
              placeholder="Note content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] bg-[#2A2A2A] border-[#3A3A3A]"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Adding..." : "Add note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
