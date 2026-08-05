import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RadarChart, { niceMax, labelPlacement, fitLabel } from './RadarChart';

const skills = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `Skill ${i}`, axis: i, detail: `Lv ${i}` }));

describe('niceMax', () => {
  it('never lets the top value peg the outer ring', () => {
    expect(niceMax([3])).toBeGreaterThan(3);
  });

  it('holds a floor so a fresh account is not all-maxed', () => {
    expect(niceMax([0, 0, 0])).toBe(5);
  });

  it('rounds up to friendly ticks as values grow', () => {
    expect(niceMax([7])).toBe(10);
    expect(niceMax([12])).toBe(15);
    expect(niceMax([61])).toBe(75);
  });

  it('handles an empty list', () => {
    expect(niceMax([])).toBe(5);
  });
});

describe('labelPlacement', () => {
  it('keeps labels upright for a small number of axes', () => {
    expect(labelPlacement(0, 6).rotate).toBeNull();
  });

  it('rotates them once the axes get dense', () => {
    expect(labelPlacement(1, 20).rotate).not.toBeNull();
  });

  it('anchors by which side of the circle the axis falls on', () => {
    // Index 0 is straight up, so it centres.
    expect(labelPlacement(0, 4).anchor).toBe('middle');
    // Index 1 of 4 is due right.
    expect(labelPlacement(1, 4).anchor).toBe('start');
    // Index 3 of 4 is due left.
    expect(labelPlacement(3, 4).anchor).toBe('end');
  });

  it('never leaves a rotated label upside-down', () => {
    for (let i = 0; i < 20; i++) {
      const { rotate } = labelPlacement(i, 20);
      expect(rotate).not.toBeNull();
      expect(Math.abs(rotate!)).toBeLessThanOrEqual(90.001);
    }
  });
});

describe('fitLabel', () => {
  it('leaves short names alone', () => {
    expect(fitLabel('Guitar', 6)).toBe('Guitar');
  });

  it('truncates harder as the chart gets crowded', () => {
    const roomy = fitLabel('Public Speaking', 6);
    const tight = fitLabel('Public Speaking', 24);
    expect(tight.length).toBeLessThan(roomy.length);
    expect(tight.endsWith('…')).toBe(true);
  });
});

describe('RadarChart', () => {
  it('plots every skill it is given, not just the first six', () => {
    const { container } = render(<RadarChart data={skills(20)} />);
    // One <title> per axis, used as the hover tooltip — so 20 in, 20 out.
    expect(container.querySelectorAll('title')).toHaveLength(20);
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Skill radar across 20 skills');
  });

  it('renders nothing when there is no data', () => {
    const { container } = render(<RadarChart data={[]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('clamps a value above the scale to the outer ring', () => {
    // Should not throw or produce NaN coordinates.
    const { container } = render(<RadarChart data={skills(4)} max={1} />);
    const poly = container.querySelector('polygon:not([fill="none"])');
    expect(poly?.getAttribute('points')).not.toContain('NaN');
  });
});
