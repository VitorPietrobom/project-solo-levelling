import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentUpload from './DocumentUpload';

describe('DocumentUpload', () => {
  it('submits a valid markdown document with optimistic object', async () => {
    const onCreated = vi.fn();
    render(<DocumentUpload onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText('Document title'), 'My Notes');
    await userEvent.type(screen.getByLabelText('Document category'), 'Study');
    await userEvent.type(screen.getByLabelText('Markdown content'), '# Hello World');

    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));

    expect(onCreated).toHaveBeenCalledOnce();
    const [optimistic, body] = onCreated.mock.calls[0];

    expect(optimistic.id).toMatch(/^temp-/);
    expect(optimistic.title).toBe('My Notes');
    expect(optimistic.category).toBe('Study');
    expect(optimistic.format).toBe('markdown');

    expect(body.title).toBe('My Notes');
    expect(body.category).toBe('Study');
    expect(body.format).toBe('markdown');
    expect(body.content).toBe('# Hello World');
    expect(body.fileName).toBe('My_Notes.md');
  });

  it('shows error when title is empty', async () => {
    render(<DocumentUpload onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Document category'), 'Test');
    await userEvent.type(screen.getByLabelText('Markdown content'), 'content');
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));
    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('shows error when category is empty', async () => {
    render(<DocumentUpload onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Document title'), 'Test');
    await userEvent.type(screen.getByLabelText('Markdown content'), 'content');
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));
    expect(screen.getByText('Category is required')).toBeInTheDocument();
  });

  it('shows error when markdown content is empty', async () => {
    render(<DocumentUpload onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Document title'), 'Test');
    await userEvent.type(screen.getByLabelText('Document category'), 'Cat');
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));
    expect(screen.getByText('Content is required')).toBeInTheDocument();
  });

  it('switches to PDF format and shows file input', async () => {
    render(<DocumentUpload onCreated={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Select PDF format'));
    expect(screen.getByLabelText('PDF file')).toBeInTheDocument();
    expect(screen.queryByLabelText('Markdown content')).not.toBeInTheDocument();
  });

  it('shows error when PDF format selected but no file chosen', async () => {
    render(<DocumentUpload onCreated={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('Select PDF format'));
    await userEvent.type(screen.getByLabelText('Document title'), 'Test');
    await userEvent.type(screen.getByLabelText('Document category'), 'Cat');
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));
    expect(screen.getByText('Please select a PDF file')).toBeInTheDocument();
  });

  it('resets form after successful markdown submit', async () => {
    render(<DocumentUpload onCreated={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Document title'), 'Test');
    await userEvent.type(screen.getByLabelText('Document category'), 'Cat');
    await userEvent.type(screen.getByLabelText('Markdown content'), 'content');
    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));

    expect(screen.getByLabelText('Document title')).toHaveValue('');
    expect(screen.getByLabelText('Document category')).toHaveValue('');
    expect(screen.getByLabelText('Markdown content')).toHaveValue('');
  });

  it('defaults to markdown format', () => {
    render(<DocumentUpload onCreated={vi.fn()} />);
    expect(screen.getByLabelText('Markdown content')).toBeInTheDocument();
  });
});
