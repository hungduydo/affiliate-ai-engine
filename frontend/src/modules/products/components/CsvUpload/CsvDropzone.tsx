import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, Loader2, FileText } from 'lucide-react';
import { importService, type CsvPreviewResponse } from '../../services/import.service';

interface Props {
  onPreview: (preview: CsvPreviewResponse) => void;
}

export function CsvDropzone({ onPreview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const mutation = useMutation({
    mutationFn: importService.uploadCsv,
    onSuccess: onPreview,
  });

  function handleFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      alert('Only CSV files are supported');
      return;
    }
    mutation.mutate(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors ${
        isDragging
          ? 'border-violet-500 bg-violet-950/20'
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/30'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {mutation.isPending ? (
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      ) : (
        <Upload className="h-8 w-8 text-zinc-500" />
      )}

      <div className="text-center">
        <p className="text-sm text-zinc-300">
          {mutation.isPending ? 'Uploading…' : 'Drop a CSV file here or click to browse'}
        </p>
        <p className="text-xs text-zinc-500 mt-1">Supports .csv and .txt · Max 10 MB</p>
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-400">
          {mutation.error instanceof Error ? mutation.error.message : 'Upload failed'}
        </p>
      )}

      {mutation.isSuccess && (
        <div className="flex items-center gap-2 text-emerald-400 text-sm">
          <FileText className="h-4 w-4" />
          File uploaded — map your columns below
        </div>
      )}
    </div>
  );
}
