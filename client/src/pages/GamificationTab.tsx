import { useState, useEffect, useCallback } from 'react';
import LevelDisplay from '../components/LevelDisplay';
import QuestList from '../components/QuestList';
import type { Quest } from '../components/QuestList';
import QuestForm from '../components/QuestForm';
import TaskList from '../components/TaskList';
import type { Task } from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import { apiClient } from '../lib/apiClient';

export default function GamificationTab() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const fetchQuests = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/quests')) as Quest[];
      setQuests(data);
    } catch {
      // silently fail
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/tasks')) as Task[];
      setTasks(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchQuests();
    fetchTasks();
  }, [fetchQuests, fetchTasks]);

  function handleQuestCreated(
    optimistic: Quest,
    validSteps: string[],
    xpReward: number,
  ) {
    setQuests((prev) => [optimistic, ...prev]);
    setShowForm(false);

    apiClient
      .post('/api/quests', {
        body: {
          title: optimistic.title,
          description: optimistic.description,
          xpReward,
          steps: validSteps,
        },
      })
      .then((data) => {
        setQuests((prev) =>
          prev.map((q) =>
            q.id === optimistic.id ? (data as Quest) : q,
          ),
        );
      })
      .catch(() => {
        setQuests((prev) =>
          prev.filter((q) => q.id !== optimistic.id),
        );
      });
  }


  function handleTaskCreated(
    optimistic: Task,
    body: { title: string; recurrence: string; xpReward: number },
  ) {
    setTasks((prev) => [optimistic, ...prev]);
    setShowTaskForm(false);

    apiClient
      .post('/api/tasks', { body })
      .then((data) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === optimistic.id ? (data as Task) : t,
          ),
        );
      })
      .catch(() => {
        setTasks((prev) =>
          prev.filter((t) => t.id !== optimistic.id),
        );
      });
  }

  function handleTaskToggle(taskId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completedToday: true } : t,
      ),
    );

    apiClient
      .patch(`/api/tasks/${taskId}/complete`)
      .catch(() => {
        fetchTasks();
      });
  }

  function handleStepToggle(questId: string, stepId: string) {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q;
        const updatedSteps = q.steps.map((s) =>
          s.id === stepId ? { ...s, completed: true } : s,
        );
        const allDone = updatedSteps.every((s) => s.completed);
        return { ...q, steps: updatedSteps, completed: allDone };
      }),
    );

    apiClient
      .patch(`/api/quests/${questId}/steps/${stepId}`)
      .catch(() => {
        fetchQuests();
      });
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
        {showForm && (
          <div className="mb-4">
            <QuestForm onCreated={handleQuestCreated} />
          </div>
        )}
        <QuestList quests={quests} onToggleStep={handleStepToggle} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <button
            onClick={() => setShowTaskForm(!showTaskForm)}
            className="text-accent-info text-sm hover:opacity-80"
          >
            {showTaskForm ? 'Cancel' : '+ New Task'}
          </button>
        </div>
        {showTaskForm && (
          <div className="mb-4">
            <TaskForm onCreated={handleTaskCreated} />
          </div>
        )}
        <TaskList tasks={tasks} onToggle={handleTaskToggle} />
      </div>
    </div>
  );
}
