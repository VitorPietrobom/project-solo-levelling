import type { Document } from './DocumentList';

interface DocumentViewerProps {
  document: Document | null;
  onClose: () => void;
}

export default function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  if (!document) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border text-center">
        <p className="text-text-secondary text-sm">Document not found.</p>
        <button onClick={onClose} className="text-accent-info text-sm mt-2 hover:opacity-80">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-semibold text-lg">
          {document.format === 'pdf' ? '📄' : '📝'} {document.title}
        </h3>
        <button
          onClick={onClose}
          className="text-accent-info text-sm hover:opacity-80"
          aria-label="Close document viewer"
        >
          ← Back
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs bg-accent-secondary/20 text-accent-secondary px-2 py-0.5 rounded">
          {document.category}
        </span>
        <span className="text-text-secondary text-xs">
          Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
        </span>
      </div>

      {document.format === 'markdown' ? (
        <div className="bg-secondary rounded p-4 border border-border">
          <pre className="text-text-primary text-sm whitespace-pre-wrap font-sans">
            {document.content ?? 'No content available.'}
          </pre>
        </div>
      ) : (
        <PdfDownload title={document.title} content={document.content} />
      )}
    </div>
  );
}

function PdfDownload({ title, content }: { title: string; content?: string }) {
  if (!content) {
    return (
      <div className="bg-secondary rounded p-4 border border-border text-center">
        <p className="text-text-secondary text-sm">PDF content not available.</p>
      </div>
    );
  }

  function handleDownload() {
    const byteCharacters = atob(content!);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-secondary rounded p-4 border border-border text-center">
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-2 bg-accent-info text-white px-4 py-2 rounded hover:opacity-90 transition-opacity text-sm"
        aria-label={`Download ${title}`}
      >
        📄 Download PDF
      </button>
    </div>
  );
}
