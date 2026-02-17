// components/Icon/UploadCSV.tsx
"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";

interface UploadCSVButtonProps {
  username: string;
  onRefresh?: () => void; // ← new optional prop to trigger dashboard refetch
}

export default function UploadCSVButton({
  username,
  onRefresh,
}: UploadCSVButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please select a valid CSV file.");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("username", username);

    try {
      const response = await fetch("/api/file", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("CSV uploaded and imported successfully!");
        onRefresh?.(); // ← trigger dashboard data refetch
      } else {
        const errorText = await response.text();
        alert(`Upload failed: ${errorText || response.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={uploading}
        className="relative p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Upload CSV"
        title="Upload CSV"
      >
        <Upload className="w-6 h-6 text-gray-700" />
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
            …
          </span>
        )}
      </button>

      <input
        type="file"
        accept=".csv,text/csv"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
