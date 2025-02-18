"use client";

import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { ChatInput } from "@/components/chat-input";
import { getChatHistory, setChatHistory } from "@/lib/redis-utils";
import { useAuth } from "@clerk/nextjs";

type MessageRole = "user" | "assistant" | "system";

interface Message {
  role: MessageRole;
  content: string;
}

const MarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mb-3">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-bold mb-2">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children }) => (
    <code
      className={`${
        className?.includes("inline")
          ? "bg-gray-800 px-1 py-0.5 rounded"
          : "block bg-gray-800 p-2 rounded-md my-2 overflow-x-auto"
      } font-mono text-sm`}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => <pre className="my-2">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-gray-500 pl-4 my-2 italic">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-blue-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

export interface ChatRef {
  handleUrlSummary: (url: string) => void;
}

interface ChatProps {
  notebookId: string;
  initialMessages?: Message[];
}

// Add to existing imports
import { Copy, ChevronDown, ChevronUp } from "lucide-react";

export const Chat = forwardRef<ChatRef, ChatProps>(
  ({ notebookId, initialMessages = [] }, ref) => {
    // Add new state for source content
    const [sourceContent, setSourceContent] = useState<string | null>(null);

    // Add new state for debug panel
    const [isDebugExpanded, setIsDebugExpanded] = useState(false);

    // Add copy function
    const handleCopyDebug = () => {
      navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    };

    const { userId } = useAuth();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null);

    const loadChatHistory = async () => {
      if (!userId || !notebookId) return;

      try {
        console.log("Loading chat history for:", { userId, notebookId });
        const response = await fetch(
          `/api/chat/history?notebookId=${notebookId}`
        );

        if (!response.ok) throw new Error("Failed to load chat history");

        const history = await response.json();
        setDebugInfo({
          key: `chat:${userId}:${notebookId}`,
          historyLength: history?.length || 0,
          history: history,
        });

        if (history && history.length > 0) {
          setMessages(history);
          console.log("Loaded messages:", history);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
        setError("Failed to load chat history");
      }
    };

    const saveChatHistory = async (messages: Message[]) => {
      if (!userId || !notebookId || messages.length === 0) return;

      try {
        const response = await fetch("/api/chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, notebookId }),
        });

        if (!response.ok) throw new Error("Failed to save chat history");
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    };

    useEffect(() => {
      loadChatHistory();
    }, [userId, notebookId]);

    useEffect(() => {
      saveChatHistory(messages);
    }, [messages, userId, notebookId]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [input, setInput] = useState("");
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Single useEffect for loading chat history
    useEffect(() => {
      async function loadChatHistory() {
        if (!userId || !notebookId) return;

        try {
          setIsLoadingHistory(true);
          const history = await getChatHistory(userId, notebookId);
          if (history && history.length > 0) {
            setMessages(history);
          }
        } catch (error) {
          console.error("Failed to load chat history:", error);
          setError("Failed to load chat history");
        } finally {
          setIsLoadingHistory(false);
        }
      }

      loadChatHistory();
    }, [userId, notebookId]);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
      if (!input.trim() || !userId) return;
      setError(null);

      const userMessage: Message = { role: "user", content: input.trim() };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            notebookId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData || "Failed to get response from AI");
        }

        const data = await response.json();
        if (data.choices && data.choices[0]?.message) {
          const assistantMessage: Message = {
            role: "assistant",
            content: data.choices[0].message.content,
          };
          setMessages((prevMessages) => [...prevMessages, assistantMessage]);
        } else {
          throw new Error("Invalid response format from AI");
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "An error occurred while sending your message"
        );
        console.error("Chat error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleUrlSummary = async (url: string) => {
      const userMessage: Message = { role: "user", content: url };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setIsLoading(true);
      setError(null);
    
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            notebookId,
          }),
        });
    
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error(text || "Failed to parse response from server");
        }
    
        if (!response.ok) {
          throw new Error(data.error || "Failed to get response from AI");
        }
    
        if (data.choices && data.choices[0]?.message) {
          const assistantMessage: Message = {
            role: "assistant",
            content: data.choices[0].message.content,
          };
          setMessages((prevMessages) => [...prevMessages, assistantMessage]);
        } else {
          throw new Error("Invalid response format from AI");
        }
      } catch (error) {
        console.error("Chat error:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      handleUrlSummary,
    }));

    return (
      <div className="flex flex-col h-full">
        {process.env.NODE_ENV === "development" && debugInfo && (
          <div className="p-4 bg-gray-800 text-xs rounded-lg mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Debug Info</span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyDebug}
                  className="h-6 px-2 hover:bg-gray-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDebugExpanded(!isDebugExpanded)}
                  className="h-6 px-2 hover:bg-gray-700"
                >
                  {isDebugExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
            <pre
              className={`whitespace-pre-wrap break-words font-mono text-gray-300 overflow-x-auto transition-all duration-200 ${
                isDebugExpanded ? "max-h-[500px]" : "max-h-20"
              } overflow-y-auto`}
            >
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse">Loading chat history</div>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : message.role === "system"
                        ? "bg-yellow-600 text-white"
                        : "bg-gray-700 text-white"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-invert max-w-none">
                        <ReactMarkdown components={MarkdownComponents}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-700 text-white">
                    <div className="flex items-center space-x-2">
                      <div className="animate-pulse">Thinking</div>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.1s]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <Alert
                  variant="destructive"
                  className="bg-red-900 border-red-800"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-[#2A2A2A] p-4">
              <ChatInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                onSend={sendMessage}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>
    );
  }
);

Chat.displayName = "Chat";
