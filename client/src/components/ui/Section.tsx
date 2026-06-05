import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface SectionProps {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}

export default function Section({ title, action, onAction, children, className = '' }: SectionProps) {
  return (
    <section className={`card arise-in ${className}`} style={{ padding: 'var(--pad)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 17 }}>{title}</h3>
        {action && (
          <button className="btn btn-ghost" onClick={onAction}>
            <Plus size={15} strokeWidth={2.4} />
            {action.replace('+ ', '')}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
