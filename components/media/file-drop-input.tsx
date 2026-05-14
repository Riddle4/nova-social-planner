"use client";

import { useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileDropInput({ name = "file", required = false }: { name?: string; required?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  function syncFileName() {
    const file = inputRef.current?.files?.[0];
    setFileName(file?.name || "");
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file || !inputRef.current) return;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    inputRef.current.files = dataTransfer.files;
    setFileName(file.name);
  }

  return (
    <label
      className={cn(
        "flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950/60 p-5 text-center transition hover:border-cyan-300/70 hover:bg-slate-900/70",
        isDragging && "border-cyan-300 bg-cyan-300/10"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} name={name} type="file" accept="image/*" required={required} className="sr-only" onChange={syncFileName} />
      <div className="mb-3 rounded-full border border-slate-700 bg-slate-900 p-3 text-cyan-200">
        {fileName ? <ImagePlus className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
      </div>
      <span className="text-sm font-medium text-white">{fileName || "Déposer une image ici"}</span>
      <span className="mt-1 text-xs text-slate-400">ou cliquer pour choisir un fichier</span>
    </label>
  );
}
