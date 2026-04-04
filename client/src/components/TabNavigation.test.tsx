import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TabNavigation from './TabNavigation';

function renderTabs(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <TabNavigation />
    </MemoryRouter>,
  );
}

describe('TabNavigation', () => {
  it('renders all four tabs', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'Gamification' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Body' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Diet' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Learning' })).toBeInTheDocument();
  });

  it('highlights the active tab with accent color', () => {
    renderTabs(['/']);

    const gamificationTab = screen.getByRole('tab', { name: 'Gamification' });
    expect(gamificationTab.className).toContain('text-accent-primary');
    expect(gamificationTab.className).toContain('border-accent-primary');
  });

  it('marks inactive tabs with secondary text color', () => {
    renderTabs(['/']);

    const bodyTab = screen.getByRole('tab', { name: 'Body' });
    expect(bodyTab.className).toContain('text-text-secondary');
  });

  it('highlights Body tab when on /body route', () => {
    renderTabs(['/body']);

    const bodyTab = screen.getByRole('tab', { name: 'Body' });
    expect(bodyTab.className).toContain('text-accent-primary');

    const gamificationTab = screen.getByRole('tab', { name: 'Gamification' });
    expect(gamificationTab.className).toContain('text-text-secondary');
  });

  it('links tabs to correct routes', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: 'Gamification' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('tab', { name: 'Body' })).toHaveAttribute('href', '/body');
    expect(screen.getByRole('tab', { name: 'Diet' })).toHaveAttribute('href', '/diet');
    expect(screen.getByRole('tab', { name: 'Learning' })).toHaveAttribute('href', '/learning');
  });
});
