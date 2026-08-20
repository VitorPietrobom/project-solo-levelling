import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BarcodeScanner from './BarcodeScanner';

// jsdom has no camera; getUserMedia is undefined, so @zxing/browser's
// decodeFromVideoDevice rejects — the component should fall back to an
// error message instead of crashing.
describe('BarcodeScanner', () => {
  it('shows an error when the camera cannot be accessed', async () => {
    render(<BarcodeScanner onDetected={vi.fn()} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Could not access the camera/)).toBeInTheDocument());
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<BarcodeScanner onDetected={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText('Close scanner'));
    expect(onClose).toHaveBeenCalled();
  });
});
