import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentViewer from './DocumentViewer';
import type { Document } from './DocumentList';

const markdownDoc: Document = {
  id: 'd1',
  title: 'React Hooks Guide',
  category: 'Frontend',
  format: 'markdown',
  filePath: '/docs/react-hooks.md',
  content: '# React Hooks\n\nHooks are functions that let you use state.',
  uploadedAt: '2024-01-15T10:00:00Z',
};

const pdfDoc: Document = {
  id: 'd2',
  title: 'System Design PDF',
  category: 'Architecture',
  format: 'pdf',
  filePath: '/docs/system-design.pdf',
  content: btoa('fake pdf content'),
  uploadedAt: '2024-02-20T14:30:00Z',
};

describe('DocumentViewer', () => {
  it('renders markdown content in a pre element', () => {
    render(<DocumentViewer document={markdownDoc} onClose={vi.fn()} />);
    expect(screen.getByText(/Hooks are functions/)).toBeInTheDocument();
  });

  it('shows document title and category badge', () => {
    render(<DocumentViewer document={markdownDoc} onClose={vi.fn()} />);
    expect(screen.getByText(/React Hooks Guide/)).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('renders download button for PDF documents', () => {
    render(<DocumentViewer document={pdfDoc} onClose={vi.fn()} />);
    const btn = screen.getByLabelText('Download System Design PDF');
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('shows "not found" state when document is null', () => {
    render(<DocumentViewer document={null} onClose={vi.fn()} />);
    expect(screen.getByText('Document not found.')).toBeInTheDocument();
  });

  it('shows "no content" for markdown without content', () => {
    const doc: Document = { ...markdownDoc, content: undefined };
    render(<DocumentViewer document={doc} onClose={vi.fn()} />);
    expect(screen.getByText('No content available.')).toBeInTheDocument();
  });

  it('shows "not available" for PDF without content', () => {
    const doc: Document = { ...pdfDoc, content: undefined };
    render(<DocumentViewer document={doc} onClose={vi.fn()} />);
    expect(screen.getByText('PDF content not available.')).toBeInTheDocument();
  });

  it('calls onClose when clicking back button', async () => {
    const onClose = vi.fn();
    render(<DocumentViewer document={markdownDoc} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close document viewer'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose from not-found state', async () => {
    const onClose = vi.fn();
    render(<DocumentViewer document={null} onClose={onClose} />);
    await userEvent.click(screen.getByText('Back to list'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
