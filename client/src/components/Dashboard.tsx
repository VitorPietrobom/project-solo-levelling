import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap,
  LayoutDashboard,
  Activity,
  Salad,
  ChefHat,
  BookOpen,
  BarChart2,
  Settings,
  Flame,
  Plus,
} from 'lucide-react';
import { apiClient } from '../lib/apiClient';

interface GamificationStatus {
  level: number;
  totalXP: number;
  streak?: number;
  progress: { current: number; required: number; percentage: number };
}

interface Toast {
  id: number;
  amount: number;
  label: string;
}

const NAV = [
  { path: '/', label: 'Status', icon: LayoutDashboard, sub: 'Level & quests' },
  { path: '/body', label: 'Body', icon: Activity, sub: 'Training & health' },
  { path: '/diet', label: 'Diet', icon: Salad, sub: 'Calories & meals' },
  { path: '/recipes', label: 'Recipes', icon: ChefHat, sub: 'Cook & meal prep' },
  { path: '/learning', label: 'Learning', icon: BookOpen, sub: 'Books & journal' },
  { path: '/summary', label: 'Weekly Summary', icon: BarChart2, sub: 'Your week in review' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState(false);
  const toastId = useRef(0);

  useEffect(() => {
    apiClient
      .get('/api/gamification/status')
      .then((data) => setStatus(data as GamificationStatus))
      .catch(() => {
        // Use sensible defaults if API not available
        setStatus({
          level: 1,
          totalXP: 0,
          streak: 0,
          progress: { current: 0, required: 1000, percentage: 0 },
        });
      });
  }, []);

  // Trigger entrance animation on route change
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-arise-ready', '');
    const id = setTimeout(() => root.removeAttribute('data-arise-ready'), 650);
    return () => clearTimeout(id);
  }, [location.pathname]);

  const addXP = (amount: number, label: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, amount, label }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2600);

    if (status) {
      let current = status.progress.current + amount;
      let level = status.level;
      let required = status.progress.required;
      let leveled = false;

      while (current >= required) {
        current -= required;
        level += 1;
        required = Math.round(required * 1.12);
        leveled = true;
      }

      if (leveled) {
        setLevelUp(true);
        setTimeout(() => setLevelUp(false), 2400);
      }

      setStatus({
        ...status,
        level,
        totalXP: status.totalXP + amount,
        progress: {
          current,
          required,
          percentage: Math.round((current / required) * 100),
        },
      });
    }
  };

  // Expose addXP globally for child tabs to use
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__ariseAddXP = addXP;
  });

  const currentNav = NAV.find((n) =>
    n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path),
  ) ?? NAV[0];

  const hunterName = 'Hunter';
  const hunterRank = 'E';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          background: 'var(--bg-1)',
          borderRight: '1px solid var(--line-soft)',
          display: 'flex',
          flexDirection: 'column',
          padding: '22px 16px',
          overflow: 'hidden',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px 22px' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--bg-0)',
              boxShadow: 'var(--glow)',
              flexShrink: 0,
            }}
          >
            <Zap size={19} strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
              Project Arise
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-faint)', letterSpacing: '0.1em' }}>
              LEVEL UP YOUR LIFE
            </div>
          </div>
        </div>

        {/* Mini hunter card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line-soft)',
            borderRadius: 'var(--r)',
            padding: 14,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Simple level circle */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 99,
              border: '3px solid var(--accent-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-inset)',
              flexShrink: 0,
            }}
          >
            <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-2)' }}>
              {status?.level ?? 1}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{hunterName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--accent-2)' }}>
              {hunterRank}-Rank Hunter
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'grid', gap: 4, flex: 1, overflowY: 'auto' }}>
          {NAV.map((n) => {
            const active =
              n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path);
            const IconComp = n.icon;
            return (
              <button
                key={n.path}
                onClick={() => navigate(n.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 12px',
                  borderRadius: 'var(--r-sm)',
                  border: `1px solid ${active ? 'var(--line-soft)' : 'transparent'}`,
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-3)',
                  textAlign: 'left',
                  transition: 'all .15s',
                  position: 'relative',
                  cursor: 'pointer',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--surface-inset)';
                    e.currentTarget.style.color = 'var(--text-2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-3)';
                  }
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: -16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 22,
                      borderRadius: 99,
                      background: 'var(--accent)',
                    }}
                  />
                )}
                <span style={{ color: active ? 'var(--accent)' : 'inherit', display: 'flex' }}>
                  <IconComp size={19} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{n.label}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-faint)' }}>{n.sub}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Settings button */}
        <button
          className="btn"
          style={{ justifyContent: 'flex-start', background: 'transparent', border: 'none', color: 'var(--text-3)' }}
        >
          <Settings size={18} />
          Settings
        </button>
      </aside>

      {/* Main column */}
      <div style={{ overflowY: 'auto', height: '100vh' }}>
        {/* Sticky header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            background: 'color-mix(in oklch, var(--bg-0) 82%, transparent)',
            backdropFilter: 'blur(14px)',
            borderBottom: '1px solid var(--line-soft)',
            padding: '18px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>{currentNav.sub}</div>
            <h1 style={{ fontSize: 22 }}>{currentNav.label}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="chip" style={{ padding: '8px 14px', gap: 8 }}>
              <span style={{ color: 'var(--warn)', display: 'flex' }}>
                <Flame size={15} />
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>{status?.streak ?? 0}</span>
              <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>day streak</span>
            </div>
            <div className="chip" style={{ padding: '8px 14px', gap: 8, borderColor: 'var(--accent-soft)' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}>
                <Zap size={15} />
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>
                {(status?.totalXP ?? 0).toLocaleString()}
              </span>
              <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}>XP</span>
            </div>
          </div>
        </header>

        <main
          key={location.pathname}
          className="arise-in"
          style={{ padding: '28px 32px 60px', maxWidth: 1280, margin: '0 auto' }}
        >
          <Outlet context={{ status, addXP }} />
        </main>
      </div>

      {/* XP toasts */}
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: 8,
          zIndex: 50,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((x) => (
          <div
            key={x.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 18px',
              borderRadius: 99,
              background: 'var(--surface-hi)',
              border: '1px solid var(--accent-soft)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <span style={{ color: 'var(--accent)', display: 'flex' }}>
              <Zap size={16} />
            </span>
            <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>
              +{x.amount} XP
            </span>
            <span
              style={{
                fontSize: 13,
                color: 'var(--text-2)',
                maxWidth: 240,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {x.label}
            </span>
          </div>
        ))}
      </div>

      {/* Level-up overlay */}
      {levelUp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            pointerEvents: 'none',
            background: 'radial-gradient(circle at center, var(--accent-2-soft), transparent 60%)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="eyebrow" style={{ color: 'var(--accent-2)', marginBottom: 8, fontSize: 13 }}>
              LEVEL UP
            </div>
            <div
              className="mono"
              style={{
                fontSize: 88,
                fontWeight: 700,
                lineHeight: 1,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px var(--accent-2-soft))',
              }}
            >
              Lv {status?.level ?? 1}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export addXP helper for child tabs
export function useAriseAddXP(): (amount: number, label: string) => void {
  return (amount: number, label: string) => {
    const fn = (window as unknown as Record<string, unknown>).__ariseAddXP as
      | ((amount: number, label: string) => void)
      | undefined;
    if (fn) fn(amount, label);
  };
}
