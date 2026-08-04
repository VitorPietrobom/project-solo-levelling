import React from 'react';

// A small, dependency-free markdown renderer that returns React elements
// (never dangerouslySetInnerHTML) — safe against HTML/script injection.
// Supports: #..###### headings, **bold**, *italic*/_italic_, `code`,
// ``` fenced code ```, - / * / 1. lists, > blockquotes, --- rules, [links](url),
// paragraphs, and blank-line separation.

function safeHref(url: string): string | null {
  const u = url.trim();
  if (/^(https?:|mailto:)/i.test(u)) return u;
  if (u.startsWith('/') || u.startsWith('#')) return u;
  return null; // block javascript:, data:, etc.
}

// Inline parsing → React nodes.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Ordered matcher: code, bold, italic, link.
  const pattern = /(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*|_([^_]+)_)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[2] != null) {
      nodes.push(
        <code key={key} style={{ background: 'var(--surface-hi)', borderRadius: 4, padding: '1px 5px', fontFamily: 'var(--font-mono)', fontSize: '0.9em' }}>{m[2]}</code>,
      );
    } else if (m[4] != null) {
      nodes.push(<strong key={key}>{renderInline(m[4], key)}</strong>);
    } else if (m[6] != null || m[7] != null) {
      nodes.push(<em key={key}>{renderInline(m[6] ?? m[7], key)}</em>);
    } else if (m[9] != null && m[10] != null) {
      const href = safeHref(m[10]);
      nodes.push(
        href
          ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{m[9]}</a>
          : m[9],
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ text }: { text: string }) {
  const lines = (text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      i++; // closing fence
      blocks.push(
        <pre key={key++} style={{ background: 'var(--surface-inset)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-sm)', padding: '12px 14px', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.5, margin: '10px 0' }}>
          <code>{buf.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') { i++; continue; }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const size = [22, 19, 17, 15.5, 14, 13][level - 1];
      blocks.push(
        <div key={key++} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size, margin: '16px 0 6px', color: 'var(--text)' }}>
          {renderInline(h[2], `h${key}`)}
        </div>,
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
      blocks.push(<hr key={key++} style={{ border: 'none', borderTop: '1px solid var(--line-soft)', margin: '16px 0' }} />);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push(
        <blockquote key={key++} style={{ borderLeft: '3px solid var(--accent-2)', paddingLeft: 14, margin: '10px 0', color: 'var(--text-2)' }}>
          {renderInline(buf.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
      blocks.push(
        <ol key={key++} style={{ margin: '8px 0', paddingLeft: 22, display: 'grid', gap: 4 }}>
          {items.map((it, j) => <li key={j}>{renderInline(it, `ol${key}-${j}`)}</li>)}
        </ol>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
      blocks.push(
        <ul key={key++} style={{ margin: '8px 0', paddingLeft: 22, display: 'grid', gap: 4 }}>
          {items.map((it, j) => <li key={j}>{renderInline(it, `ul${key}-${j}`)}</li>)}
        </ul>,
      );
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-special lines)
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+|```|---|\*\*\*|___)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    blocks.push(
      <p key={key++} style={{ margin: '8px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {renderInline(buf.join('\n'), `p${key}`)}
      </p>,
    );
  }

  if (blocks.length === 0) {
    return <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>No content.</p>;
  }
  return <div style={{ color: 'var(--text-2)', fontSize: 14 }}>{blocks}</div>;
}
