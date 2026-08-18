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
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

vi.mock('../components/DataExport', () => ({ default: () => <div /> }));

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue({ hunterName: 'Shadow Monarch' });
});

describe('SettingsTab hunter name', () => {
  it('loads the current hunter name', async () => {
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Hunter name')).toHaveValue('Shadow Monarch'));
  });

  it('Save is disabled until the value changes', async () => {
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Hunter name')).toHaveValue('Shadow Monarch'));
    expect(screen.getByText('Save')).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Hunter name'), '!');
    expect(screen.getByText('Save')).not.toBeDisabled();
  });

  it('saves the new name via PUT /api/gamification/profile', async () => {
    mockPut.mockResolvedValue({ hunterName: 'New Name' });
    render(<SettingsTab />);
    await waitFor(() => expect(screen.getByLabelText('Hunter name')).toHaveValue('Shadow Monarch'));

    const input = screen.getByLabelText('Hunter name');
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockPut).toHaveBeenCalledWith('/api/gamification/profile', { body: { hunterName: 'New Name' } }));
  });
});
