import * as React from "react";
import { Button } from "@/components/ui/button";
import { Send, Mic, GripHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps extends React.ComponentProps<"textarea"> {
  onSend: () => void;
  isLoading?: boolean;
}

const ChatInput = React.forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ className, onSend, isLoading, ...props }, ref) => {
    const [height, setHeight] = React.useState(80);
    const isDragging = React.useRef(false);
    const startY = React.useRef(0);
    const startHeight = React.useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
      isDragging.current = true;
      startY.current = e.clientY;
      startHeight.current = height;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const newHeight = Math.min(
        300,
        Math.max(80, startHeight.current + delta)
      );
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div
        className="flex flex-col bg-transparent max-w-3xl mx-auto"
        style={{ height: `${height}px` }}
      >
        <div
          className="h-1 cursor-ns-resize flex items-center justify-center hover:bg-[#333333] rounded-t-lg"
          onMouseDown={handleMouseDown}
        >
          <GripHorizontal className="h-3 w-3 text-gray-500" />
        </div>
        <div className="flex items-end space-x-2 p-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white h-8 w-8 mb-2 focus-visible:ring-white focus-visible:ring-offset-0"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <div className="flex-1 bg-[#2A2A2A] rounded-xl border border-[#333333] h-full focus-within:ring-1 focus-within:ring-white focus-within:border-white transition-colors">
            <textarea
              ref={ref}
              className={cn(
                "flex w-full h-full bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:outline-none text-sm text-white placeholder:text-gray-400 resize-none py-3 px-4",
                className
              )}
              onKeyDown={handleKeyDown}
              {...props}
            />
          </div>
          <Button
            onClick={onSend}
            disabled={isLoading || !props.value}
            className="bg-white text-black hover:bg-gray-100 rounded-full px-3 py-1.5 flex items-center gap-1.5 h-8 text-xs mb-2 focus-visible:ring-white focus-visible:ring-offset-0"
          >
            <span className="font-medium">Send Message</span>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = "ChatInput";

export { ChatInput };
