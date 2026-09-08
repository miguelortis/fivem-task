import { create } from 'zustand';

export type TaskType = 'bug' | 'feature' | 'tweak' | 'optimization' | 'research';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'inProgress' | 'done';

export type Task = {
  _id: string;
  title: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: { _id: string; name: string };
  createdBy?: { _id: string; name: string };
};

type Columns = {
  todo: Task[];
  inProgress: Task[];
  done: Task[];
};

interface TaskStore {
  columns: Columns;
  setTasksFromDB: (tasks: Task[]) => void;
  optimisticMove: (sourceCol: keyof Columns, destCol: keyof Columns, sourceIdx: number, destIdx: number) => void;
  optimisticAdd: (task: Task) => void;
  optimisticDelete: (colId: keyof Columns, taskId: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  columns: {
    todo: [],
    inProgress: [],
    done: [],
  },
  
  // Organiza el array plano de MongoDB en columnas
  setTasksFromDB: (tasks) => {
    const newColumns: Columns = { todo: [], inProgress: [], done: [] };
    tasks.forEach((task) => {
      if (newColumns[task.status]) {
        newColumns[task.status].push(task);
      } else {
        newColumns.todo.push(task); // Fallback
      }
    });
    set({ columns: newColumns });
  },

  // Mueve la tarjeta al instante en la pantalla
  optimisticMove: (sourceCol, destCol, sourceIdx, destIdx) => set((state) => {
    const sourceItems = [...state.columns[sourceCol]];
    const destItems = sourceCol === destCol ? sourceItems : [...state.columns[destCol]];
    const [removed] = sourceItems.splice(sourceIdx, 1);
    
    // Actualizamos su estado localmente
    removed.status = destCol as TaskStatus;
    destItems.splice(destIdx, 0, removed);

    return {
      columns: { ...state.columns, [sourceCol]: sourceItems, [destCol]: destItems },
    };
  }),

  optimisticAdd: (task) => set((state) => ({
    columns: { ...state.columns, [task.status]: [...state.columns[task.status], task] }
  })),

  optimisticDelete: (colId, taskId) => set((state) => ({
    columns: { ...state.columns, [colId]: state.columns[colId].filter(t => t._id !== taskId) }
  })),
}));