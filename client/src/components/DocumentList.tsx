export interface Document {
  id: string;
  title: string;
  category: string;
  format: 'pdf' | 'markdown';
  filePath: string;
  content?: string;
  uploadedAt: string;
}

interface DocumentListProps {
  documents: Document[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

export default function DocumentList({
  documents,
  onSelect,
  onDelete,
  searchTerm,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: DocumentListProps) {
  const filtered = selectedCategory
    ? documents.filter((d) => d.category === selectedCategory)
    : documents;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Search documents"
        />
        <select
          value={selectedCategory ?? ''}
          onChange={(e) => onCategoryChange(e.target.value || null)}
          className="bg-secondary text-text-primary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent-primary"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-6">
          {searchTerm || selectedCategory
            ? 'No documents match your filters.'
            : 'No documents yet. Upload one to get started.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-card rounded-lg p-4 border border-border hover:border-accent-primary transition-colors cursor-pointer"
              onClick={() => onSelect(doc.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(doc.id); }}
              aria-label={`View document: ${doc.title}`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="text-text-primary font-semibold text-sm truncate">
                    {doc.format === 'pdf' ? '📄' : '📝'} {doc.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-accent-secondary/20 text-accent-secondary px-2 py-0.5 rounded">
                      {doc.category}
                    </span>
                    <span className="text-text-secondary text-xs">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                  className="text-accent-warning text-xs hover:opacity-80 ml-2 shrink-0"
                  aria-label={`Delete document: ${doc.title}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
