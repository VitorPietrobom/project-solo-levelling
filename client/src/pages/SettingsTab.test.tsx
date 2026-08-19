import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsTab from './SettingsTab';

const mockGet = vi.fn();
const mockPut = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    put: (...args: any[]) => mockPut(...args),
  },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock('../components/DataExport', () => ({ default: () => <div /> }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ hunterName: 'Shadow Monarch', practiceReminderDays: 14 });
});

describe('SettingsTab hunter name', () => {
  it('loads the current hunter name', async () => {
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Hunter name')).toHaveValue('Shadow Monarch'));
  });

  it('Save is disabled until the value changes', async () => {
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Hunter name')).toHaveValue('Shadow Monarch'));
    expect(screen.getAllByText('Save')[0]).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Hunter name'), '!');
    expect(screen.getAllByText('Save')[0]).not.toBeDisabled();
  });

  it('saves the new name via PUT /api/gamification/profile', async () => {
    mockPut.mockResolvedValue({ hunterName: 'New Name' });
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Hunter name')).toHaveValue('Shadow Monarch'));

    const input = screen.getByLabelText('Hunter name');
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name');
    await userEvent.click(screen.getAllByText('Save')[0]);

    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/api/gamification/profile', { body: { hunterName: 'New Name' } }));
  });
});

describe('SettingsTab practice reminder', () => {
  it('loads the current reminder window', async () => {
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Skill practice reminder days')).toHaveValue(14));
  });

  it('saves the new window via PUT /api/gamification/profile', async () => {
    mockPut.mockResolvedValue({ practiceReminderDays: 7 });
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Skill practice reminder days')).toHaveValue(14));

    const input = screen.getByLabelText('Skill practice reminder days');
    await userEvent.clear(input);
    await userEvent.type(input, '7');
    await userEvent.click(screen.getAllByText('Save')[1]);

    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/api/gamification/profile', { body: { practiceReminderDays: 7 } }));
  });
});
