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

export interface Message {
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

export const Chat = forwardRef<ChatRef, ChatProps>(
  ({ notebookId, initialMessages = [] }, ref) => {
    const { userId } = useAuth();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
            scrollToBottom();
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

    // Scroll to bottom when initial messages are loaded
    useEffect(() => {
      if (initialMessages.length > 0) {
        scrollToBottom();
      }
    }, [initialMessages]);

    // Scroll to bottom when messages change
    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

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
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error || 
            `Server error: ${response.status} ${response.statusText}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get response stream");

        let assistantMessage = { role: "assistant" as const, content: "" };
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);
          try {
            const data = JSON.parse(chunk);
            console.log('Received chunk:', data); // Debug log
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            // Handle different response formats
            const content = 
              data.choices?.[0]?.delta?.content || // OpenAI/Cerebras format
              data.choices?.[0]?.message?.content || // Alternative format
              data.content; // Simple format
              
            if (content) {
              assistantMessage.content += content;
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1] = { ...assistantMessage };
                return newMessages;
              });
            }
          } catch (e) {
            console.error("Error parsing chunk:", e, "Raw chunk:", chunk);
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              throw e;
            }
          }
        }
      } catch (error) {
        // Remove the assistant's message if there was an error
        setMessages((prevMessages) => 
          prevMessages.filter(msg => msg.content !== "")
        );
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
      const prompt = `generate a massive summary of ${url}`;
      const userMessage: Message = { role: "user", content: prompt };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
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
            stream: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get response from AI");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to get response stream");

        let assistantMessage = { role: "assistant" as const, content: "" };
        setMessages((prevMessages) => [...prevMessages, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Convert the chunk to text
          const chunk = new TextDecoder().decode(value);
          try {
            const data = JSON.parse(chunk);
            console.log('Received chunk:', data); // Debug log
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            // Handle different response formats
            const content = 
              data.choices?.[0]?.delta?.content || // OpenAI/Cerebras format
              data.choices?.[0]?.message?.content || // Alternative format
              data.content; // Simple format
              
            if (content) {
              assistantMessage.content += content;
              setMessages((prevMessages) => {
                const newMessages = [...prevMessages];
                newMessages[newMessages.length - 1] = { ...assistantMessage };
                return newMessages;
              });
            }
          } catch (e) {
            console.error("Error parsing chunk:", e, "Raw chunk:", chunk);
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              throw e;
            }
          }
        }
      } catch (error) {
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
