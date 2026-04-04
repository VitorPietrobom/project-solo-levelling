import { useState, useEffect, useCallback } from 'react';
import LevelDisplay from '../components/LevelDisplay';
import QuestList from '../components/QuestList';
import type { Quest } from '../components/QuestList';
import QuestForm from '../components/QuestForm';
import TaskList from '../components/TaskList';
import type { Task } from '../components/TaskList';
import TaskForm from '../components/TaskForm';
import SkillList from '../components/SkillList';
import type { Skill } from '../components/SkillList';
import SkillForm from '../components/SkillForm';
import { apiClient } from '../lib/apiClient';

export default function GamificationTab() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [showSkillForm, setShowSkillForm] = useState(false);

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

  const fetchSkills = useCallback(async () => {
    try {
      const data = (await apiClient.get('/api/skills')) as Skill[];
      setSkills(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchQuests();
    fetchTasks();
    fetchSkills();
  }, [fetchQuests, fetchTasks, fetchSkills]);

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

  function handleSkillCreated(
    optimistic: Skill,
    body: { name: string },
  ) {
    setSkills((prev) => [optimistic, ...prev]);
    setShowSkillForm(false);

    apiClient
      .post('/api/skills', { body })
      .then((data) => {
        setSkills((prev) =>
          prev.map((s) =>
            s.id === optimistic.id ? (data as Skill) : s,
          ),
        );
      })
      .catch(() => {
        setSkills((prev) =>
          prev.filter((s) => s.id !== optimistic.id),
        );
      });
  }

  function handleSkillLog(skillId: string, xp: number) {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === skillId ? { ...s, totalXP: s.totalXP + xp } : s,
      ),
    );

    apiClient
      .post(`/api/skills/${skillId}/log`, { body: { xp } })
      .then((data) => {
        setSkills((prev) =>
          prev.map((s) =>
            s.id === skillId ? (data as Skill) : s,
          ),
        );
      })
      .catch(() => {
        fetchSkills();
      });
  }

  return (
    <div className="text-text-primary">
      <LevelDisplay />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left column — Quests */}
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

        {/* Right column — Tasks + Skills stacked */}
        <div className="space-y-6">
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

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Skills</h2>
              <button
                onClick={() => setShowSkillForm(!showSkillForm)}
                className="text-accent-info text-sm hover:opacity-80"
              >
                {showSkillForm ? 'Cancel' : '+ New Skill'}
              </button>
            </div>
            {showSkillForm && (
              <div className="mb-4">
                <SkillForm onCreated={handleSkillCreated} />
              </div>
            )}
            <SkillList skills={skills} onLog={handleSkillLog} />
          </div>
        </div>
      </div>
    </div>
  );
}
