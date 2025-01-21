'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

type MessageRole = 'user' | 'assistant' | 'system';

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
        className?.includes('inline')
          ? 'bg-gray-800 px-1 py-0.5 rounded'
          : 'block bg-gray-800 p-2 rounded-md my-2 overflow-x-auto'
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
    <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

export interface ChatRef {
  handleUrlSummary: (url: string) => void;
}

export const Chat = forwardRef<ChatRef>((props, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setError(null);

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          stream: true
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response from AI');
      }

      const data = await response.json();
      if (data.choices && data.choices[0]?.message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.choices[0].message.content
        };
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while sending your message');
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSummary = async (url: string) => {
    const prompt = `generate a massive summary of ${url}`;
    const userMessage: Message = { role: 'user', content: prompt };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          stream: true
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response from AI');
      }

      const data = await response.json();
      if (data.choices && data.choices[0]?.message) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.choices[0].message.content
        };
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleUrlSummary
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-white'
              }`}
            >
              {message.role === 'assistant' ? (
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
          <Alert variant="destructive" className="bg-red-900 border-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t border-[#2A2A2A] p-4">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-[#2A2A2A] border-none text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
