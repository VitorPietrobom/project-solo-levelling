import { useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

interface WeeklySummaryData {
  markdown: string;
  weekStart: string;
  weekEnd: string;
}

export default function WeeklySummary() {
  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [weekOf, setWeekOf] = useState<string>(() => {
    // Default to today's date
    return new Date().toISOString().slice(0, 10);
  });

  const generateSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const data = (await apiClient.get(
        `/api/weekly-summary?weekOf=${encodeURIComponent(weekOf)}`,
      )) as WeeklySummaryData;
      setSummary(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [weekOf]);

  const handleCopy = useCallback(async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = summary.markdown;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [summary]);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Weekly Summary</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label
            htmlFor="weekOf"
            className="block text-xs text-text-secondary mb-1"
          >
            Week containing date
          </label>
          <input
            id="weekOf"
            type="date"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
            className="bg-secondary border border-border rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
          />
        </div>
        <button
          onClick={generateSummary}
          disabled={loading}
          className="px-4 py-1.5 bg-accent-primary text-white text-sm rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Generating…' : 'Generate Summary'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-accent-danger text-sm mb-3">{error}</p>
      )}

      {/* Summary output */}
      {summary && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-text-secondary">
              {summary.weekStart} → {summary.weekEnd}
            </p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-secondary border border-border rounded hover:border-accent-primary transition-colors text-text-secondary hover:text-text-primary"
              aria-label="Copy summary to clipboard"
            >
              {copied ? (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-accent-success"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>

          {/* Markdown rendered as preformatted text */}
          <pre className="bg-secondary border border-border rounded p-4 text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[60vh]">
            {summary.markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
