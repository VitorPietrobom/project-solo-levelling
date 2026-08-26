import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FeedbackButton from './FeedbackButton';

const mockPost = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: { post: (...args: any[]) => mockPost(...args) },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FeedbackButton', () => {
  it('is closed by default and opens the form on click', async () => {
    render(<MemoryRouter><FeedbackButton /></MemoryRouter>);
    expect(screen.queryByLabelText('Feedback message')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Send feedback'));
    expect(screen.getByLabelText('Feedback message')).toBeInTheDocument();
  });

  it('submits feedback with the current page path and shows a success toast', async () => {
    mockPost.mockResolvedValue({});
    render(<MemoryRouter initialEntries={['/diet']}><FeedbackButton /></MemoryRouter>);

    await userEvent.click(screen.getByLabelText('Send feedback'));
    await userEvent.type(screen.getByLabelText('Feedback message'), 'Great app!');
    await userEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/feedback', { body: { message: 'Great app!', page: '/diet' } }));
    expect(mockShowToast).toHaveBeenCalledWith('Thanks — feedback sent!');
  });

  it('shows a toast on failure and keeps the draft', async () => {
    mockPost.mockRejectedValue(new Error('nope'));
    render(<MemoryRouter><FeedbackButton /></MemoryRouter>);

    await userEvent.click(screen.getByLabelText('Send feedback'));
    await userEvent.type(screen.getByLabelText('Feedback message'), 'Bug report');
    await userEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Failed to send feedback'));
    expect(screen.getByLabelText('Feedback message')).toHaveValue('Bug report');
  });

  it('disables submit for an empty message', async () => {
    render(<MemoryRouter><FeedbackButton /></MemoryRouter>);
    await userEvent.click(screen.getByLabelText('Send feedback'));
    expect(screen.getByText('Send')).toBeDisabled();
  });
});
