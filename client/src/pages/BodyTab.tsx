import { useState, useEffect, useCallback } from 'react';
import { Plus, Dumbbell, Clock } from 'lucide-react';
import WeightChart from '../components/WeightChart';
import type { WeightEntry } from '../components/WeightChart';
import WeightForm from '../components/WeightForm';
import BodyMeasurementDiagram from '../components/BodyMeasurementDiagram';
import type { Measurement } from '../components/MeasurementList';
import MeasurementForm from '../components/MeasurementForm';
import GymSessionLog from '../components/GymSessionLog';
import type { GymSession } from '../components/GymSessionLog';
import GymSessionImport from '../components/GymSessionImport';
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
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [showProgramForm, setShowProgramForm] = useState(false);

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
    apiClient.post('/api/weight', { body })
      .then((data) => setWeightEntries((prev) => prev.map((e) => (e.id === optimistic.id ? (data as WeightEntry) : e))))
      .catch((err) => {
        setWeightEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to save weight entry'));
      });
  }

  function handleMeasurementCreated(optimistic: Measurement, body: { type: string; value: number; date: string }) {
    setMeasurements((prev) => [...prev, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    setShowMeasurementForm(false);
    apiClient.post('/api/measurements', { body })
      .then((data) => setMeasurements((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Measurement) : m))))
      .catch((err) => {
        setMeasurements((prev) => prev.filter((m) => m.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to save measurement'));
      });
  }

  function handleGymSessionImported(
    optimistic: GymSession,
    body: { date: string; notes: string; exercises: { name: string; sets: number; reps: number; weight: number; muscleGroups: string[] }[] },
  ) {
    setGymSessions((prev) => [optimistic, ...prev]);
    setShowImport(false);
    apiClient.post('/api/gym-sessions', { body })
      .then((data) => { setGymSessions((prev) => prev.map((s) => (s.id === optimistic.id ? (data as GymSession) : s))); fetchHeatmap(); })
      .catch((err) => {
        setGymSessions((prev) => prev.filter((s) => s.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to import gym session'));
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
    apiClient.post('/api/training-programs', { body })
      .then((data) => setPrograms((prev) => prev.map((p) => (p.id === optimistic.id ? (data as TrainingProgram) : p))))
      .catch((err) => {
        setPrograms((prev) => prev.filter((p) => p.id !== optimistic.id));
        showToast(errorMessage(err, 'Failed to create training program'));
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
          <button className="btn btn-ghost" onClick={() => setShowWeightForm(!showWeightForm)}>
            <Plus size={15} strokeWidth={2.4} />{showWeightForm ? 'Cancel' : 'Log Weight'}
          </button>
        </div>
        {showWeightForm && <div style={{ marginBottom: 16 }}><WeightForm onCreated={handleWeightCreated} /></div>}
        <WeightChart entries={weightEntries} />
      </section>

      {/* Measurements + Soreness */}
      <div className="grid-2-col">
        <section className="card arise-in" style={{ padding: 'var(--pad)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Measurements</h3>
            <button className="btn btn-ghost" onClick={() => setShowMeasurementForm(!showMeasurementForm)}>
              <Plus size={15} strokeWidth={2.4} />{showMeasurementForm ? 'Cancel' : 'Log All'}
            </button>
          </div>
          {showMeasurementForm && <div style={{ marginBottom: 16 }}><MeasurementForm onCreated={handleMeasurementCreated} /></div>}
          <BodyMeasurementDiagram measurements={measurements} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17 }}>Recent Sessions</h3>
            <button className="btn btn-ghost" onClick={() => setShowImport(!showImport)}>
              <Plus size={15} strokeWidth={2.4} />{showImport ? 'Cancel' : 'Import from Hevy'}
            </button>
          </div>
          {showImport && <div style={{ marginBottom: 16 }}><GymSessionImport onImport={handleGymSessionImported} /></div>}
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
            <button className="btn btn-ghost" onClick={() => setShowProgramForm(!showProgramForm)}>
              <Plus size={15} strokeWidth={2.4} />{showProgramForm ? 'Cancel' : 'New Program'}
            </button>
          </div>
          {showProgramForm && <div style={{ marginBottom: 16 }}><TrainingProgramForm onCreated={handleProgramCreated} /></div>}
          <TrainingProgramView programs={programs} onActivate={handleProgramActivate} onDelete={handleProgramDelete} />
        </section>
      </div>
    </div>
  );
}
