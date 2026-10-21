import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KnowledgeGraph from './KnowledgeGraph';
import type { GraphNode } from '../lib/knowledge';

const node = (id: string): GraphNode => ({
  id, kind: 'note', title: id, tags: [], updatedAt: '2026-01-01T00:00:00Z',
});

describe('KnowledgeGraph wheel zoom', () => {
  it('attaches a non-passive wheel listener that prevents page scroll', () => {
    const addSpy = vi.spyOn(SVGElement.prototype, 'addEventListener');
    const removeSpy = vi.spyOn(SVGElement.prototype, 'removeEventListener');
    const { unmount } = render(
      <KnowledgeGraph nodes={[node('a')]} edges={[]} selectedId={null} matchIds={null} onSelect={() => {}} />,
    );
    const call = addSpy.mock.calls.find((c) => c[0] === 'wheel');
    expect(call?.[2]).toEqual({ passive: false });

    const svg = screen.getByRole('img', { name: 'Knowledge graph' });
    const ev = new WheelEvent('wheel', { deltaY: -100, cancelable: true, bubbles: true });
    svg.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);

    unmount();
    expect(removeSpy.mock.calls.some((c) => c[0] === 'wheel')).toBe(true);
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
