"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WebsiteURLInputProps {
  onBack: () => void;
  onSubmit: (url: string) => void;
  onSendToCerebras?: (url: string) => void;
  notebookId: string;
  userId: string;
}

export function WebsiteURLInput({
  onBack,
  onSubmit,
  onSendToCerebras,
  notebookId,
  userId,
}: WebsiteURLInputProps) {
  const [url, setUrl] = useState(
    "https://morganandwestfield.com/podcast/entrepreneurship-through-acquisition-insights-from-harvard-business-school-experts/"
  );

  const handleSubmit = async () => {
    try {
      const response = await fetch("http://170.187.161.93:8000/website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          notebookId,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process website");
      }

      const data = await response.json();

      // Create source in database
      const sourceResponse = await fetch(
        `/api/notebooks/${notebookId}/sources`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "WEBSITE",
            title: url,
            content: data.summary || data.extractedText,
          }),
        }
      );

      if (!sourceResponse.ok) {
        throw new Error("Failed to save source");
      }

      onSubmit(url);
      if (onSendToCerebras) {
        onSendToCerebras(url);
      }
    } catch (error) {
      console.error("Error processing website:", error);
      alert(
        error instanceof Error ? error.message : "Failed to process website"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="hover:bg-[#2A2A2A]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-semibold">Website URL</h2>
      </div>

      <div className="space-y-4">
        <p className="text-gray-300">
          Paste in a Web URL below to upload as a source in OpenBookLM.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="url"
                placeholder="Paste URL*"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#1A1A1A] border-[#3A3A3A] focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-300">Notes</h3>
            <ul className="list-disc text-sm text-gray-400 pl-5 space-y-1">
              <li>
                Only the visible text on the website will be imported at this
                moment
              </li>
              <li>Paid articles are not supported</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          className="bg-blue-500 hover:bg-blue-600 text-white px-8"
        >
          Insert
        </Button>
      </div>
    </div>
  );
}
