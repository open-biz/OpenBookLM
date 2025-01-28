"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  listFiles,
  downloadFile,
  GoogleFile,
  loadGoogleDriveApi,
  getGoogleToken,
} from "@/lib/google-drive";
import { toast } from "sonner";
import { FileIcon, Loader2 } from "lucide-react";

interface GoogleDrivePickerProps {
  onFileSelect: (file: File) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleDrivePicker({
  onFileSelect,
  isOpen,
  onClose,
}: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<GoogleFile[]>([]);

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      await loadGoogleDriveApi();
      const token = await getGoogleToken();
      const driveFiles = await listFiles(token);
      setFiles(driveFiles);
    } catch (error) {
      console.error("Google Drive error:", error);
      toast.error("Failed to connect to Google Drive");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (fileId: string, fileName: string) => {
    setIsLoading(true);
    try {
      const token = await getGoogleToken();
      const blob = await downloadFile(fileId, token);
      const file = new File([blob], fileName);
      onFileSelect(file);
      onClose();
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select from Google Drive</DialogTitle>
        </DialogHeader>
        {files.length === 0 ? (
          <div className="flex justify-center">
            <Button
              onClick={handleGoogleAuth}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-start"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileIcon className="h-4 w-4" />
              )}
              Connect to Google Drive
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {files.map((file) => (
              <Button
                key={file.id}
                variant="outline"
                className="justify-start"
                onClick={() => handleFileSelect(file.id, file.name)}
                disabled={isLoading}
              >
                <img src={file.iconLink} alt="" className="h-4 w-4 mr-2" />
                {file.name}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
