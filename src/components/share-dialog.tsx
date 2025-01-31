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
import { Share } from "lucide-react";

interface ShareDialogProps {
  notebookId: string;
}

export function ShareDialog({ notebookId }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/notebooks/${notebookId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("User not found with that email address");
        } else if (response.status === 403) {
          throw new Error("You don't have permission to share this notebook");
        } else if (response.status === 401) {
          throw new Error("Please sign in to share notebooks");
        } else {
          throw new Error(data.error || "Failed to share notebook");
        }
      }

      setEmail("");
      setOpen(false);
    } catch (error) {
      console.error("Error sharing notebook:", error);
      setError(
        error instanceof Error ? error.message : "Failed to share notebook"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-[#1C1C1C] border-[#2A2A2A]">
        <DialogHeader>
          <DialogTitle>Share Notebook (Read Only)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleShare} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Enter the exact email address of the person you want to share
              with. They will have read-only access to this notebook.
            </p>
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#2A2A2A] border-[#3A3A3A]"
            />
            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Sharing..." : "Share"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
