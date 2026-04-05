import { useState } from 'react';
import type { Document } from './DocumentList';

interface DocumentUploadProps {
  onCreated: (
    optimistic: Document,
    body: { title: string; category: string; format: string; content: string; fileName: string },
  ) => void;
}

export default function DocumentUpload({ onCreated }: DocumentUploadProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [format, setFormat] = useState<'markdown' | 'pdf'>('markdown');
  const [markdownContent, setMarkdownContent] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported');
      setPdfFile(null);
      return;
    }
    setError(null);
    setPdfFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setError('Title is required'); return; }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) { setError('Category is required'); return; }

    let content = '';
    let fileName = '';

    if (format === 'markdown') {
      if (!markdownContent.trim()) { setError('Content is required'); return; }
      content = markdownContent;
      fileName = `${trimmedTitle.replace(/\s+/g, '_')}.md`;
    } else {
      if (!pdfFile) { setError('Please select a PDF file'); return; }
      fileName = pdfFile.name;
      content = await readFileAsBase64(pdfFile);
    }

    const now = Date.now();
    const optimistic: Document = {
      id: `temp-${now}`,
      title: trimmedTitle,
      category: trimmedCategory,
      format,
      filePath: '',
      uploadedAt: new Date().toISOString(),
    };

    onCreated(optimistic, {
      title: trimmedTitle,
      category: trimmedCategory,
      format,
      content,
      fileName,
    });

    setTitle('');
    setCategory('');
    setMarkdownContent('');
    setPdfFile(null);
    setFormat('markdown');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg p-4 border border-border space-y-3">
      <h3 className="text-text-primary font-semibold">Upload Document</h3>
      {error && <p className="text-accent-warning text-sm">{error}</p>}

      <input
        type="text"
        placeholder="Document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Document title"
      />

      <input
        type="text"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
        aria-label="Document category"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFormat('markdown')}
          className={`px-3 py-1.5 rounded text-sm border ${
            format === 'markdown'
              ? 'bg-accent-primary text-primary border-accent-primary'
              : 'bg-secondary text-text-primary border-border'
          }`}
          aria-label="Select markdown format"
        >
          📝 Markdown
        </button>
        <button
          type="button"
          onClick={() => setFormat('pdf')}
          className={`px-3 py-1.5 rounded text-sm border ${
            format === 'pdf'
              ? 'bg-accent-primary text-primary border-accent-primary'
              : 'bg-secondary text-text-primary border-border'
          }`}
          aria-label="Select PDF format"
        >
          📄 PDF
        </button>
      </div>

      {format === 'markdown' ? (
        <textarea
          placeholder="Write or paste markdown content..."
          value={markdownContent}
          onChange={(e) => setMarkdownContent(e.target.value)}
          rows={6}
          className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary resize-y"
          aria-label="Markdown content"
        />
      ) : (
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="w-full bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm file:mr-3 file:bg-accent-info file:text-white file:border-0 file:rounded file:px-3 file:py-1 file:text-sm file:cursor-pointer"
          aria-label="PDF file"
        />
      )}

      <button
        type="submit"
        className="w-full bg-accent-primary text-primary font-semibold py-2 rounded hover:opacity-90 transition-opacity"
      >
        Upload Document
      </button>
    </form>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
