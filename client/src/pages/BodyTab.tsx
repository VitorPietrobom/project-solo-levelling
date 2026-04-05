import { useState, useEffect, useCallback } from 'react';
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
import { apiClient } from '../lib/apiClient';

export default function BodyTab() {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [gymSessions, setGymSessions] = useState<GymSession[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});

  const fetchWeight = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/weight')) as WeightEntry[];
      setWeightEntries(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchMeasurements = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/measurements')) as Measurement[];
      setMeasurements(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchGymSessions = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/gym-sessions')) as GymSession[];
      setGymSessions(data);
    } catch { /* silently fail */ }
  }, []);

  const fetchHeatmap = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/gym-sessions/heatmap')) as Record<string, number>;
      setHeatmap(data);
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchWeight();
    fetchMeasurements();
    fetchGymSessions();
    fetchHeatmap();
  }, [fetchWeight, fetchMeasurements, fetchGymSessions, fetchHeatmap]);

  function handleWeightCreated(optimistic: WeightEntry, body: { weight: number; date: string }) {
    setWeightEntries((prev) => [...prev, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    setShowWeightForm(false);
    apiClient.post('/api/weight', { body })
      .then((data) => setWeightEntries((prev) => prev.map((e) => (e.id === optimistic.id ? (data as WeightEntry) : e))))
      .catch(() => setWeightEntries((prev) => prev.filter((e) => e.id !== optimistic.id)));
  }

  function handleMeasurementCreated(optimistic: Measurement, body: { type: string; value: number; date: string }) {
    setMeasurements((prev) => [...prev, optimistic].sort((a, b) => a.date.localeCompare(b.date)));
    setShowMeasurementForm(false);
    apiClient.post('/api/measurements', { body })
      .then((data) => setMeasurements((prev) => prev.map((m) => (m.id === optimistic.id ? (data as Measurement) : m))))
      .catch(() => setMeasurements((prev) => prev.filter((m) => m.id !== optimistic.id)));
  }

  function handleGymSessionImported(
    optimistic: GymSession,
    body: { date: string; notes: string; exercises: { name: string; sets: number; reps: number; weight: number; muscleGroups: string[] }[] },
  ) {
    setGymSessions((prev) => [optimistic, ...prev]);
    setShowImport(false);
    apiClient.post('/api/gym-sessions', { body })
      .then((data) => {
        setGymSessions((prev) => prev.map((s) => (s.id === optimistic.id ? (data as GymSession) : s)));
        fetchHeatmap();
      })
      .catch(() => setGymSessions((prev) => prev.filter((s) => s.id !== optimistic.id)));
  }

  function handleGymSessionDeleted(sessionId: string) {
    setGymSessions((prev) => prev.filter((s) => s.id !== sessionId));
    apiClient.delete(`/api/gym-sessions/${sessionId}`)
      .then(() => fetchHeatmap())
      .catch(() => fetchGymSessions());
  }

  return (
    <div className="text-text-primary">
      {/* Top row: Weight chart full width */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Weight</h2>
          <button onClick={() => setShowWeightForm(!showWeightForm)} className="text-accent-info text-sm hover:opacity-80">
            {showWeightForm ? 'Cancel' : '+ Log Weight'}
          </button>
        </div>
        {showWeightForm && <div className="mb-4"><WeightForm onCreated={handleWeightCreated} /></div>}
        <WeightChart entries={weightEntries} />
      </div>

      {/* Middle row: Body diagrams side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Measurements</h2>
            <button onClick={() => setShowMeasurementForm(!showMeasurementForm)} className="text-accent-info text-sm hover:opacity-80">
              {showMeasurementForm ? 'Cancel' : '+ Log All'}
            </button>
          </div>
          {showMeasurementForm && <div className="mb-4"><MeasurementForm onCreated={handleMeasurementCreated} /></div>}
          <BodyMeasurementDiagram measurements={measurements} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Soreness</h2>
          <SorenessBodyDiagram heatmap={heatmap} />
        </div>
      </div>

      {/* Bottom row: Gym sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Gym Sessions</h2>
          <button onClick={() => setShowImport(!showImport)} className="text-accent-info text-sm hover:opacity-80">
            {showImport ? 'Cancel' : '+ Import from Hevy'}
          </button>
        </div>
        {showImport && <div className="mb-4"><GymSessionImport onImport={handleGymSessionImported} /></div>}
        <GymSessionLog sessions={gymSessions} onDelete={handleGymSessionDeleted} />
      </div>
    </div>
  );
}
