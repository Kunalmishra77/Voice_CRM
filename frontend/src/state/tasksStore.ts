import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LeadTask {
  id: string;
  phone_number: string;
  lead_name: string;
  due_at: string;
  task_type: string;
  notes: string;
  created_by: string;
  done: boolean;
  created_at: string;
  done_at?: string;
}

interface TasksStore {
  tasks: LeadTask[];
  addTask: (task: Omit<LeadTask, 'id' | 'created_at'>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<LeadTask>) => void;
  setTasks: (tasks: LeadTask[]) => void;
}

export const useTasksStore = create<TasksStore>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (task) => set((state) => ({
        tasks: [
          {
            ...task,
            id: `task_${Date.now()}`,
            created_at: new Date().toISOString()
          },
          ...state.tasks
        ]
      })),
      toggleTask: (id) => set((state) => ({
        tasks: state.tasks.map((t) => 
          t.id === id ? { ...t, done: !t.done, done_at: !t.done ? new Date().toISOString() : undefined } : t
        )
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      })),
      updateTask: (id, updates) => set((state) => ({
        tasks: state.tasks.map((t) => 
          t.id === id ? { ...t, ...updates } : t
        )
      })),
      setTasks: (tasks) => set({ tasks })
    }),
    {
      name: 'voice_crm_tasks_persistence',
    }
  )
);
