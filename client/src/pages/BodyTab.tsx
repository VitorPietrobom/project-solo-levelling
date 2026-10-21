import { useState, useEffect, useCallback } from 'react';
import { Plus, Dumbbell, Clock } from 'lucide-react';
import WeightChart from '../components/WeightChart';
import type { WeightEntry } from '../components/WeightChart';
import WeightForm from '../components/WeightForm';
import WeightEntryList from '../components/WeightEntryList';
import BodyMeasurementDiagram from '../components/BodyMeasurementDiagram';
import type { Measurement } from '../components/MeasurementList';
import MeasurementForm from '../components/MeasurementForm';
import MeasurementEntryList from '../components/MeasurementEntryList';
import GymSessionLog from '../components/GymSessionLog';
import type { GymSession } from '../components/GymSessionLog';
import GymSessionImport from '../components/GymSessionImport';
import GymSessionForm from '../components/GymSessionForm';
import SorenessBodyDiagram from '../components/SorenessBodyDiagram';
import TrainingProgramView from '../components/TrainingProgramView';
import type { TrainingProgram } from '../components/TrainingProgramView';
import TrainingProgramForm from '../components/TrainingProgramForm';
import WhoopCard from '../components/WhoopCard';
import { apiClient, errorMessage } from '../lib/apiClient';
import { useToast } from '../contexts/ToastContext';

// "Aug 3" from an ISO date/datetime string — the API returns full timestamps
// (e.g. "2026-06-06T00:00:00.000Z"), which must never be shown to the user raw.
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function BodyTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [gymSessions, setGymSessions] = useState<GymSession[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showManualSession, setShowManualSession] = useState(false);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [showProgramForm, setShowProgramForm] = useState(false);
  // OE-045: forms close optimistically on submit, so when a save fails we keep
  // the submitted body here and reopen the form pre-filled with it instead of
  // dropping the user's input. `draftKey` remounts an already-open form so it
  // picks up the restored values.
  type GymBody = Parameters<typeof handleGymSessionImported>[1];
  const [weightDraft, setWeightDraft] = useState<{ weight: number; date: string } | undefined>();
  const [measurementDraft, setMeasurementDraft] = useState<{ type: string; value: number; date: string } | undefined>();
  const [gymDraft, setGymDraft] = useState<{ source: 'manual' | 'import'; body: GymBody } | undefined>();
  const [programDraft, setProgramDraft] = useState<Parameters<typeof handleProgramCreated>[1] | undefined>();
  const [draftKey, setDraftKey] = useState(0);

  const fetchWeight = useCallback(async () => {
    try { setWeightEntries((await apiClient.get('/api/weight')) as WeightEntry[]); } catch { /* silently fail */ }
  }, []);

  const fetchMeasurements = useCallback(async () => {
    try { setMeasurements((await apiClient.get('/api/measurements')) as Measurement[]); } catch { /* silently fail */ }
  }, []);

  const fetchGymSessions = useCallback(async () => {
    try { setGymSessions((await apiClient.get('/api/gym-sessions')) as GymSession[]); } catch { /* silently fail */ }
  }, []);

  const fetchHeatmap = useCallback(async () => {
    try { setHeatmap((await apiClient.get('/api/gym-sessions/heatmap')) as Record<string, number>); } catch { /* silently fail */ }
  }, []);

  const fetchPrograms = useCallback(async () => {
    try { setPrograms((await apiClient.get('/api/training-programs')) as TrainingProgram[]); } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchWeight(), fetchMeasurements(), fetchGymSessions(), fetchHeatmap(), fetchPrograms()])
      .finally(() => setLoading(false));
  }, [fetchWeight, fetchMeasurements, fetchGymSessions, fetchHeatmap, fetchPrograms]);

  function handleWeightCreated(optimistic: WeightEntry, body: { weight: number; date: string }) {
    setWeightEntries((prev) => [...prev, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    setShowWeightForm(false);
    setWeightDraft(undefined);
    apiClient.post('/api/weight', { body })
      .then((data) => {
        const saved = data as WeightEntry;
        // The server may update an existing (e.g. WHOOP) row for that day and
        // return its id, so drop any stale copy before swapping the temp row.
        setWeightEntries((prev) => prev
          .filter((e) => e.id !== saved.id)
          .map((e) => (e.id === optimistic.id ? saved : e)));
      })
      .catch((err) => {
        setWeightEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to save weight entry'));
        setWeightDraft(body);
        setDraftKey((k) => k + 1);
        setShowWeightForm(true);
      });
  }

  function handleWeightUpdated(id: string, weight: number) {
    const prev = weightEntries;
    setWeightEntries((entries) => entries.map((e) => (e.id === id ? { ...e, weight } : e)));
    apiClient.patch(`/api/weight/${id}`, { body: { weight } }).catch((err) => {
      setWeightEntries(prev);
      showToast(errorMessage(err, 'Failed to update weight entry'));
    });
  }

  function handleWeightDeleted(id: string) {
    const prev = weightEntries;
    setWeightEntries((entries) => entries.filter((e) => e.id !== id));
    apiClient.delete(`/api/weight/${id}`).catch((err) => {
      setWeightEntries(prev);
      showToast(errorMessage(err, 'Failed to delete weight entry'));
    });
  }

  function handleMeasurementUpdated(id: string, value: number) {
    const prev = measurements;
    setMeasurements((entries) => entries.map((m) => (m.id === id ? { ...m, value } : m)));
    apiClient.patch(`/api/measurements/${id}`, { body: { value } }).catch((err) => {
      setMeasurements(prev);
      showToast(errorMessage(err, 'Failed to update measurement'));
    });
  }

  function handleMeasurementDeleted(id: string) {
    const prev = measurements;
    setMeasurements((entries) => entries.filter((m) => m.id !== id));
    apiClient.delete(`/api/measurements/${id}`).catch((err) => {
      setMeasurements(prev);
      showToast(errorMessage(err, 'Failed to delete measurement'));
    });
  }

  function handleMeasurementCreated(optimistic: Measurement, body: { type: string; value: number; date: string }) {
    setMeasurements((prev) => [...prev, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    setShowMeasurementForm(false);
    setMeasurementDraft(undefined);
    apiClient.post('/api/measurements', { body })
      .then((data) => setMeasurements((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Measurement) : m))))
      .catch((err) => {
        setMeasurements((prev) => prev.filter((m) => m.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to save measurement'));
        setMeasurementDraft(body);
        setDraftKey((k) => k + 1);
        setShowMeasurementForm(true);
      });
  }

  function handleGymSessionImported(
    optimistic: GymSession,
    body: { date: string; notes: string; exercises: { name: string; sets: number; reps: number; weight: number; muscleGroups: string[] }[] },
    source: 'manual' | 'import' = 'import',
  ) {
    setGymSessions((prev) => [optimistic, ...prev]);
    setShowImport(false);
    setShowManualSession(false);
    setGymDraft(undefined);
    apiClient.post('/api/gym-sessions', { body })
      .then((data) => { setGymSessions((prev) => prev.map((s) => (s.id === optimistic.id ? (data as GymSession) : s))); fetchHeatmap(); })
      .catch((err) => {
        setGymSessions((prev) => prev.filter((s) => s.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to import gym session'));
        setGymDraft({ source, body });
        setDraftKey((k) => k + 1);
        setShowManualSession(source === 'manual');
        setShowImport(source === 'import');
      });
  }

  function handleGymSessionDeleted(sessionId: string) {
    setGymSessions((prev) => prev.filter((s) => s.id !== sessionId));
    apiClient.delete(`/api/gym-sessions/${sessionId}`).then(() => fetchHeatmap()).catch((err) => {
      fetchGymSessions();
      showToast(errorMessage(err, 'Failed to delete gym session'));
    });
  }

  function handleProgramCreated(
    optimistic: TrainingProgram,
    body: { name: string; days: { dayOfWeek: string; exercises: { name: string; sets: number; reps: number; targetWeight: number }[] }[] },
  ) {
    setPrograms((prev) => [optimistic, ...prev]);
    setShowProgramForm(false);
    setProgramDraft(undefined);
    apiClient.post('/api/training-programs', { body })
      .then((data) => setPrograms((prev) => prev.map((p) => (p.id === optimistic.id ? (data as TrainingProgram) : p))))
      .catch((err) => {
        setPrograms((prev) => prev.filter((p) => p.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to create training program'));
        setProgramDraft(body);
        setDraftKey((k) => k + 1);
        setShowProgramForm(true);
      });
  }

  function handleProgramActivate(programId: string) {
    setPrograms((prev) => prev.map((p) => ({ ...p, active: p.id === programId })));
    apiClient.patch(`/api/training-programs/${programId}/activate`).catch((err) => {
      fetchPrograms();
      showToast(errorMessage(err, 'Failed to activate training program'));
    });
  }

  function handleProgramDelete(programId: string) {
    setPrograms((prev) => prev.filter((p) => p.id !== programId));
    apiClient.delete(`/api/training-programs/${programId}`).catch((err) => {
      fetchPrograms();
      showToast(errorMessage(err, 'Failed to delete training program'));
    });
  }

  const latest = weightEntries.length ? weightEntries[weightEntries.length - 1] : null;
  const first = weightEntries.length ? weightEntries[0] : null;
  const weightChange = latest && first ? (latest.weight - first.weight).toFixed(1) : null;

  if (loading) {
    return <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Loading…</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--gap)' }}>
      {/* Whoop */}
      <WhoopCard onSynced={fetchWeight} />

      {/* Weight chart */}
      <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ fontSize: 17, marginBottom: 6 }}>Weight</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              {latest && (
                <>
                  <span className="mono" style={{ fontSize: 34, fontWeight: 700 }}>
                    {latest.weight}<span style={{ fontSize: 16, color: 'var(--text-3)' }}>kg</span>
                  </span>
                  {weightChange !== null && (
                    <span className="chip" style={{ color: parseFloat(weightChange) < 0 ? 'var(--good)' : 'var(--warn)', borderColor: 'transparent', background: 'var(--surface-inset)' }}>
                      {parseFloat(weightChange) > 0 ? '▲' : '▼'} {Math.abs(parseFloat(weightChange))} kg
                    </span>
                  )}
                  {first && <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>since {shortDate(first.date)}</span>}
                </>
              )}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={() => { setShowWeightForm(!showWeightForm); setWeightDraft(undefined); }}>
            <Plus size={15} strokeWidth={2.4} />{showWeightForm ? 'Cancel' : 'Log Weight'}
          </button>
        </div>
        {showWeightForm && <div style={{ marginBottom: 16 }}><WeightForm key={draftKey} initial={weightDraft} onCreated={handleWeightCreated} /></div>}
        <WeightChart entries={weightEntries} />
        <div style={{ marginTop: 16 }}>
          <WeightEntryList entries={weightEntries} onUpdate={handleWeightUpdated} onDelete={handleWeightDeleted} />
        </div>
      </section>

      {/* Measurements + Soreness */}
      <div className="grid-2-col">
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Measurements</h3>
            <button className="btn btn-ghost" onClick={() => { setShowMeasurementForm(!showMeasurementForm); setMeasurementDraft(undefined); }}>
              <Plus size={15} strokeWidth={2.4} />{showMeasurementForm ? 'Cancel' : 'Log All'}
            </button>
          </div>
          {showMeasurementForm && <div style={{ marginBottom: 16 }}><MeasurementForm key={draftKey} initial={measurementDraft} onCreated={handleMeasurementCreated} /></div>}
          <BodyMeasurementDiagram measurements={measurements} />
          <div style={{ marginTop: 16 }}>
            <MeasurementEntryList measurements={measurements} onUpdate={handleMeasurementUpdated} onDelete={handleMeasurementDeleted} />
          </div>
        </section>

        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Soreness</h3>
            <span className="eyebrow">last 7 days</span>
          </div>
          <SorenessBodyDiagram heatmap={heatmap} />
        </section>
      </div>

      {/* Gym sessions + Training Programs */}
      <div className="grid-2-col">
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 17 }}>Recent Sessions</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setShowManualSession(!showManualSession); setShowImport(false); setGymDraft(undefined); }}>
                <Plus size={15} strokeWidth={2.4} />{showManualSession ? 'Cancel' : 'Log Session'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowImport(!showImport); setShowManualSession(false); setGymDraft(undefined); }}>
                <Plus size={15} strokeWidth={2.4} />{showImport ? 'Cancel' : 'Import from Hevy'}
              </button>
            </div>
          </div>
          {showManualSession && <div style={{ marginBottom: 16 }}><GymSessionForm key={draftKey} initial={gymDraft?.source === 'manual' ? gymDraft.body : undefined} onCreated={(o, b) => handleGymSessionImported(o, b, 'manual')} /></div>}
          {showImport && <div style={{ marginBottom: 16 }}><GymSessionImport key={draftKey} initial={gymDraft?.source === 'import' ? gymDraft.body : undefined} onImport={(o, b) => handleGymSessionImported(o, b, 'import')} /></div>}
          {gymSessions.length > 0 ? (
            <GymSessionLog sessions={gymSessions} onDelete={handleGymSessionDeleted} />
          ) : (
            <p style={{ color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              No sessions yet. Import from Hevy to get started.
            </p>
          )}
        </section>

        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Training Programs</h3>
            <button className="btn btn-ghost" onClick={() => { setShowProgramForm(!showProgramForm); setProgramDraft(undefined); }}>
              <Plus size={15} strokeWidth={2.4} />{showProgramForm ? 'Cancel' : 'New Program'}
            </button>
          </div>
          {showProgramForm && <div style={{ marginBottom: 16 }}><TrainingProgramForm key={draftKey} initial={programDraft} onCreated={handleProgramCreated} /></div>}
          <TrainingProgramView programs={programs} onActivate={handleProgramActivate} onDelete={handleProgramDelete} />
        </section>
      </div>
    </div>
  );
}
