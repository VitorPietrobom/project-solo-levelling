import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const showToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast }) }));
vi.mock('./KnowledgeGraph', () => ({ default: () => null }));
vi.mock('./KnowledgeNodePanel', () => ({ default: () => null }));

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('../lib/apiClient', () => ({
  apiClient: api,
  errorMessage: (_e: unknown, fallback: string) => fallback,
}));

import KnowledgeSection from './KnowledgeSection';

describe('KnowledgeSection save failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ nodes: [], edges: [] });
  });

  it('keeps the editor and draft open when creating a node fails', async () => {
    api.post.mockRejectedValue(new Error('offline'));
    const onChanged = vi.fn();
    const addXP = vi.fn();
    render(<KnowledgeSection query="" activeTags={[]} addXP={addXP} onChanged={onChanged} />);

    fireEvent.click(await screen.findByText('+ New Node'));
    fireEvent.change(screen.getByLabelText('Node title'), { target: { value: 'My long note' } });
    fireEvent.change(screen.getByLabelText('Node content'), { target: { value: 'Lots of text' } });
    fireEvent.click(screen.getByText('Create node'));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Failed to create node'));
    expect((screen.getByLabelText('Node title') as HTMLInputElement).value).toBe('My long note');
    expect((screen.getByLabelText('Node content') as HTMLTextAreaElement).value).toBe('Lots of text');
    expect(addXP).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('closes the editor after a successful create', async () => {
    api.post.mockResolvedValue({ id: 'n1', kind: 'note', title: 'T', tags: [], updatedAt: '' });
    render(<KnowledgeSection query="" activeTags={[]} addXP={vi.fn()} />);
    fireEvent.click(await screen.findByText('+ New Node'));
    fireEvent.change(screen.getByLabelText('Node title'), { target: { value: 'T' } });
    fireEvent.click(screen.getByText('Create node'));
    await waitFor(() => expect(screen.queryByLabelText('Node title')).toBeNull());
  });
});
