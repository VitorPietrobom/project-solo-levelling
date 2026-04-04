import { useState } from 'react';
import LevelDisplay from '../components/LevelDisplay';
import QuestList from '../components/QuestList';
import QuestForm from '../components/QuestForm';

export default function GamificationTab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);

  function handleQuestCreated() {
    setRefreshKey((k) => k + 1);
    setShowForm(false);
  }

  return (
    <div className="text-text-primary space-y-6 max-w-2xl">
      <LevelDisplay />
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Quests</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-accent-info text-sm hover:opacity-80"
          >
            {showForm ? 'Cancel' : '+ New Quest'}
          </button>
        </div>
        {showForm && <div className="mb-4"><QuestForm onCreated={handleQuestCreated} /></div>}
        <QuestList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
