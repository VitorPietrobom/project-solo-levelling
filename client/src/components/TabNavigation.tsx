import { NavLink } from 'react-router-dom';

const tabs = [
  { label: 'Gamification', to: '/' },
  { label: 'Body', to: '/body' },
  { label: 'Diet', to: '/diet' },
  { label: 'Learning', to: '/learning' },
  { label: 'Weekly Summary', to: '/summary' },
] as const;

export default function TabNavigation() {
  return (
    <nav className="bg-secondary border-b border-border">
      <ul className="flex" role="tablist">
        {tabs.map((tab) => (
          <li key={tab.to} role="presentation">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              role="tab"
              className={({ isActive }) =>
                `inline-block px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-accent-primary border-b-2 border-accent-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
