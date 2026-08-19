import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './ToastContext';

function Trigger() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Something went wrong')}>Trigger</button>;
}

describe('ToastContext', () => {
  it('shows a toast and dismisses it on click', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    await userEvent.click(screen.getByText('Trigger'));

    const toast = await screen.findByText('Something went wrong');
    expect(toast).toBeInTheDocument();

    await userEvent.click(toast);
    await waitFor(() => expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument());
  });

  it('throws when useToast is called outside a provider', () => {
    const Bare = () => { useToast(); return null; };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow('useToast must be used within a ToastProvider');
    spy.mockRestore();
  });
});
