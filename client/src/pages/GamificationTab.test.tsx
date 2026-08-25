import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GamificationTab from './GamificationTab';

// jsdom has no PointerEvent constructor, so testing-library's fireEvent
// falls back to a plain Event that silently drops pointerType/clientX/
// clientY/isPrimary — the drag tests below need those to actually reach
// dnd-kit's PointerSensor (which specifically checks event.isPrimary),
// so polyfill a minimal PointerEvent on top of MouseEvent (which jsdom
// does support clientX/clientY on).
if (typeof (window as unknown as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerType: string;
    pointerId: number;
    isPrimary: boolean;
    constructor(type: string, params: MouseEventInit & { pointerType?: string; pointerId?: number; isPrimary?: boolean } = {}) {
      super(type, params);
      this.pointerType = params.pointerType ?? '';
      this.pointerId = params.pointerId ?? 1;
      this.isPrimary = params.isPrimary ?? true;
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
}

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
vi.mock('../lib/apiClient', () => ({
  apiClient: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    patch: (...args: any[]) => mockPatch(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
  errorMessage: (_err: any, fallback: string) => fallback,
}));

const mockShowToast = vi.fn();
vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const addXP = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useOutletContext: () => ({
      status: { level: 4, totalXP: 900, streak: 5, hunterName: 'Shadow', progress: { current: 100, required: 500, percentage: 20 } },
      addXP,
    }),
  };
});

const quest = {
  id: 'q1', title: 'Learn Guitar', description: 'Practice daily', xpReward: 100,
  priority: 'medium', dueDate: null, linkedSkillId: null, recurrence: null, completed: false,
  steps: [
    { id: 's1', description: 'Buy a guitar', sortOrder: 0, completed: false },
    { id: 's2', description: 'Learn chords', sortOrder: 1, completed: false },
  ],
};
const habit = {
  id: 'h1', title: 'Morning run', description: null, xpReward: 25,
  priority: 'medium', dueDate: null, linkedSkillId: null, recurrence: 'daily', completed: false, steps: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockImplementation((url: string) => {
    if (url === '/api/quests') return Promise.resolve([quest, habit]);
    if (url === '/api/skills') return Promise.resolve([]);
    if (url === '/api/gamification/status') return Promise.resolve({ level: 4, totalXP: 900, streak: 5, hunterName: 'Shadow', progress: { current: 100, required: 500, percentage: 20 } });
    if (url === '/api/special-quests') return Promise.resolve({ daily: [], weekly: [], monthly: [] });
    return Promise.resolve([]);
  });
  mockPost.mockResolvedValue({});
  mockPatch.mockResolvedValue({});
  mockDelete.mockResolvedValue({});
});

describe('GamificationTab', () => {
  it('shows the personalized hunter name, rank, and real streak on the hero card', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Shadow')).toBeInTheDocument());
    expect(screen.getByText('E-Rank')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // streak stat
  });

  it('renders quest cards collapsed — step text is not visible until expanded', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());
    expect(screen.queryByText('Buy a guitar')).not.toBeInTheDocument();
  });

  it('splits recurring quests into the habit list, one-time ones into the kanban', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());
    expect(screen.getByText('Morning run')).toBeInTheDocument();
    // The habit row's toggle affordance, not the quest kanban's expand button.
    expect(screen.getByTitle('Mark complete')).toBeInTheDocument();
  });

  it('deleting a quest opens a confirmation and calls DELETE on confirm', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete quest "Learn Guitar"'));
    expect(screen.getByText(/Delete "Learn Guitar"/)).toBeInTheDocument();

    await userEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/quests/q1'));
  });

  it('deleting a habit opens a confirmation and calls DELETE on confirm', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Delete habit "Morning run"'));
    await userEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('/api/quests/h1'));
  });

  // dnd-kit's PointerSensor (mouse/pen) and TouchSensor (touch, with a
  // long-press activation delay) both funnel into the same DndContext
  // onDragEnd handler — this exercises that shared wiring via the pointer
  // path, which jsdom can simulate; TouchSensor itself is dnd-kit's own
  // well-tested code, not ours to re-verify here.
  it('dragging a quest card onto "Done" bulk-completes it', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());

    const card = screen.getByTestId('quest-card-q1');
    const doneColumn = screen.getByTestId('kanban-col-Done');
    // jsdom never computes real layout — every element's rect is 0×0 at the
    // origin by default, which would make dnd-kit's collision detection
    // unable to tell "Done" apart from any other column. Give the columns
    // distinct, non-overlapping rects so it resolves the way a real
    // browser's layout would.
    card.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 50, bottom: 50, width: 50, height: 50, toJSON: () => {} }) as DOMRect;
    doneColumn.getBoundingClientRect = () => ({ x: 500, y: 0, top: 0, left: 500, right: 700, bottom: 200, width: 200, height: 200, toJSON: () => {} }) as DOMRect;

    fireEvent.pointerDown(card, { pointerType: 'mouse', clientX: 10, clientY: 10 });
    // dnd-kit's PointerSensor attaches its move/end listeners to the
    // document (not the original target — see its own comment: "Pointer
    // events stop firing if the target is unmounted while dragging"), and
    // only activates past a small movement threshold — which also proves a
    // plain click still just clicks (verified elsewhere in this file). The
    // move that crosses that threshold only starts the drag; it takes a
    // second move to actually update position and run collision detection.
    fireEvent.pointerMove(document, { clientX: 30, clientY: 30 });
    fireEvent.pointerMove(document, { clientX: 550, clientY: 50 });
    fireEvent.pointerUp(document, { clientX: 550, clientY: 50 });

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/quests/q1/complete'));
    expect(addXP).toHaveBeenCalledWith(100, 'Learn Guitar');
    // dnd-kit removes its document-level listeners (a stray one of which
    // captures and stops all click events) 50ms after drag end, not
    // immediately — wait it out so a leftover listener can't break a click
    // in a later test in this file.
    await new Promise((resolve) => setTimeout(resolve, 60));
  });

  it('dropping a quest card outside a valid column does nothing', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());

    const card = screen.getByTestId('quest-card-q1');
    card.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 50, bottom: 50, width: 50, height: 50, toJSON: () => {} }) as DOMRect;

    fireEvent.pointerDown(card, { pointerType: 'mouse', clientX: 10, clientY: 10 });
    fireEvent.pointerMove(document, { clientX: 9000, clientY: 9000 }); // nowhere near any column
    fireEvent.pointerUp(document, { clientX: 9000, clientY: 9000 });

    expect(mockPatch).not.toHaveBeenCalledWith('/api/quests/q1/complete');
    await new Promise((resolve) => setTimeout(resolve, 60)); // see comment on the previous test
  });

  it('opens a habit-only quest form pre-set to Daily from the "New Habit" button', async () => {
    mockPost.mockResolvedValue({
      id: 'h2', title: 'Stretch', description: null, xpReward: 50, priority: 'medium',
      dueDate: null, linkedSkillId: null, recurrence: 'daily', completed: false, steps: [],
    });
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByText('New Habit'));
    expect(screen.getByRole('radio', { name: 'Daily', checked: true })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Quest title'), 'Stretch');
    await userEvent.click(screen.getByText('Create Habit'));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith(
      '/api/quests',
      { body: expect.objectContaining({ title: 'Stretch', recurrence: 'daily' }) },
    ));
  });

  it('shows an empty-state message instead of bare columns when there are no quests', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/quests') return Promise.resolve([habit]);
      if (url === '/api/skills') return Promise.resolve([]);
      if (url === '/api/gamification/status') return Promise.resolve({ level: 1, totalXP: 0, streak: 0, progress: { current: 0, required: 100, percentage: 0 } });
      if (url === '/api/special-quests') return Promise.resolve({ daily: [], weekly: [], monthly: [] });
      return Promise.resolve([]);
    });
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());
    expect(screen.getByText(/No quests yet/)).toBeInTheDocument();
    expect(screen.queryByText('To Do')).not.toBeInTheDocument();
  });

  it('has no Skills section anymore — that moved to its own page', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Learn Guitar')).toBeInTheDocument());
    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  });

  it('toggling a habit calls the complete endpoint and shows the XP toast', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByTitle('Mark complete'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/api/quests/h1/complete'));
    expect(addXP).toHaveBeenCalledWith(25, 'Morning run');
  });

  it('editing a habit saves via PATCH', async () => {
    render(<GamificationTab />);
    await waitFor(() => expect(screen.getByText('Morning run')).toBeInTheDocument());

    await userEvent.click(screen.getByLabelText('Edit habit "Morning run"'));
    const input = await screen.findByLabelText('Habit title');
    await userEvent.clear(input);
    await userEvent.type(input, 'Evening run');
    await userEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith(
      '/api/quests/h1',
      { body: { title: 'Evening run', xpReward: 25, recurrence: 'daily', linkedSkillId: null } },
    ));
  });
});
