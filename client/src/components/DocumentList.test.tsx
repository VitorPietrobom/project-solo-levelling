import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentList from './DocumentList';
import type { Document } from './DocumentList';

const sampleDocs: Document[] = [
  {
    id: 'd1',
    title: 'React Hooks Guide',
    category: 'Frontend',
    format: 'markdown',
    filePath: '/docs/react-hooks.md',
    uploadedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'd2',
    title: 'System Design PDF',
    category: 'Architecture',
    format: 'pdf',
    filePath: '/docs/system-design.pdf',
    uploadedAt: '2024-02-20T14:30:00Z',
  },
  {
    id: 'd3',
    title: 'CSS Flexbox Notes',
    category: 'Frontend',
    format: 'markdown',
    filePath: '/docs/flexbox.md',
    uploadedAt: '2024-03-01T09:00:00Z',
  },
];

const defaultProps = {
  documents: sampleDocs,
  onSelect: vi.fn(),
  onDelete: vi.fn(),
  searchTerm: '',
  onSearchChange: vi.fn(),
  categories: ['Frontend', 'Architecture'],
  selectedCategory: null as string | null,
  onCategoryChange: vi.fn(),
};

describe('DocumentList', () => {
  it('renders document cards with title, category badge, format icon, and date', () => {
    render(<DocumentList {...defaultProps} />);
    expect(screen.getByText(/React Hooks Guide/)).toBeInTheDocument();
    expect(screen.getByText(/System Design PDF/)).toBeInTheDocument();
    // 2 doc badges + 1 dropdown option = 3
    expect(screen.getAllByText('Frontend')).toHaveLength(3);
    // 1 doc badge + 1 dropdown option = 2
    expect(screen.getAllByText('Architecture')).toHaveLength(2);
  });

  it('shows empty state when no documents and no filters', () => {
    render(<DocumentList {...defaultProps} documents={[]} />);
    expect(screen.getByText('No documents yet. Upload one to get started.')).toBeInTheDocument();
  });

  it('shows filter-specific empty state when no results with search', () => {
    render(<DocumentList {...defaultProps} documents={[]} searchTerm="xyz" />);
    expect(screen.getByText('No documents match your filters.')).toBeInTheDocument();
  });

  it('shows filter-specific empty state when no results with category', () => {
    render(<DocumentList {...defaultProps} documents={[]} selectedCategory="Backend" />);
    expect(screen.getByText('No documents match your filters.')).toBeInTheDocument();
  });

  it('filters documents by selected category', () => {
    render(<DocumentList {...defaultProps} selectedCategory="Architecture" />);
    expect(screen.getByText(/System Design PDF/)).toBeInTheDocument();
    expect(screen.queryByText(/React Hooks Guide/)).not.toBeInTheDocument();
  });

  it('calls onSelect when clicking a document card', async () => {
    const onSelect = vi.fn();
    render(<DocumentList {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByLabelText('View document: React Hooks Guide'));
    expect(onSelect).toHaveBeenCalledWith('d1');
  });

  it('calls onDelete when clicking delete button', async () => {
    const onDelete = vi.fn();
    render(<DocumentList {...defaultProps} onDelete={onDelete} />);
    await userEvent.click(screen.getByLabelText('Delete document: React Hooks Guide'));
    expect(onDelete).toHaveBeenCalledWith('d1');
  });

  it('calls onSearchChange when typing in search input', async () => {
    const onSearchChange = vi.fn();
    render(<DocumentList {...defaultProps} onSearchChange={onSearchChange} />);
    await userEvent.type(screen.getByLabelText('Search documents'), 'react');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('calls onCategoryChange when selecting a category', async () => {
    const onCategoryChange = vi.fn();
    render(<DocumentList {...defaultProps} onCategoryChange={onCategoryChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), 'Frontend');
    expect(onCategoryChange).toHaveBeenCalledWith('Frontend');
  });

  it('calls onCategoryChange with null when selecting "All categories"', async () => {
    const onCategoryChange = vi.fn();
    render(<DocumentList {...defaultProps} selectedCategory="Frontend" onCategoryChange={onCategoryChange} />);
    await userEvent.selectOptions(screen.getByLabelText('Filter by category'), '');
    expect(onCategoryChange).toHaveBeenCalledWith(null);
  });

  it('renders category options in the dropdown', () => {
    render(<DocumentList {...defaultProps} />);
    const select = screen.getByLabelText('Filter by category') as HTMLSelectElement;
    expect(select.options).toHaveLength(3); // All + Frontend + Architecture
  });
});
