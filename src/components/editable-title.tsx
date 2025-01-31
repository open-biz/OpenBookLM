import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface EditableTitleProps {
  initialTitle: string;
  onSave: (newTitle: string) => Promise<void>;
}

export function EditableTitle({ initialTitle, onSave }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      if (title.trim() !== initialTitle) {
        await onSave(title);
      }
    } catch (error) {
      console.error("Error saving title:", error);
      // No toast, just log the error
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="flex-1">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setTitle(initialTitle);
              setIsEditing(false);
            }
          }}
          className="h-9 px-2 text-xl font-semibold bg-transparent border border-blue-500 focus:border-blue-600 
          focus:ring-1 focus:ring-blue-500 rounded-md transition-colors"
        />
      </form>
    );
  }

  return (
    <h1
      onClick={() => setIsEditing(true)}
      className="text-xl font-semibold cursor-pointer hover:text-blue-500 transition-colors px-2 py-1 
      rounded hover:bg-blue-500/10"
    >
      {title}
    </h1>
  );
}
