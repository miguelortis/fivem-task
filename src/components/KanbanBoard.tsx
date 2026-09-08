'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Bug, Cpu, Wrench, Zap, Search, Plus, Trash2, LogOut } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTaskStore, Task, TaskType, TaskPriority } from '@/store/useTaskStore';

const columnNames = {
  todo: 'Por Hacer 📝',
  inProgress: 'En Progreso ⏳',
  done: 'Listas ✅',
};

const typeConfig: Record<TaskType, { color: string; icon: React.ComponentType<{ size: number }> }> = {
  bug: { color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: Bug },
  feature: { color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Cpu },
  tweak: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: Wrench },
  optimization: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Zap },
  research: { color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: Search },
};

const priorityConfig: Record<TaskPriority, string> = {
  low: 'border-transparent',
  medium: 'border-transparent',
  high: 'border-orange-500/50 shadow-orange-500/10',
  critical: 'border-red-500 shadow-red-500/20 shadow-lg animate-pulse',
};

export default function KanbanBoard() {
  // AQUÍ ESTÁ LA CORRECCIÓN: Extraemos 'status' de useSession
  const { data: session, status } = useSession(); 
  const { columns, setTasksFromDB, optimisticMove, optimisticAdd, optimisticDelete } = useTaskStore();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados del formulario y buscador
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de Filtrado
  const filteredColumns = {
    todo: columns.todo.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    inProgress: columns.inProgress.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    done: columns.done.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
  };
  const isSearching = searchTerm.trim().length > 0;

  // 1. Cargar tareas al iniciar (Protegido por NextAuth)
  useEffect(() => {
    setIsMounted(true);

    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setIsLoading(false);
      return;
    }

    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTasksFromDB(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error cargando tareas:", err);
        setIsLoading(false);
      });
  }, [setTasksFromDB, status]); // status ya está definido arriba

  // 2. Manejar Drag & Drop
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // 1. Actualización instantánea en pantalla (Zustand)
    optimisticMove(
      source.droppableId as keyof typeof columns,
      destination.droppableId as keyof typeof columns,
      source.index,
      destination.index
    );

    // 2. Extraer el nuevo orden directamente del estado fresco
    const freshColumns = useTaskStore.getState().columns;
    const destColumn = freshColumns[destination.droppableId as keyof typeof columns];

    // Mapeamos las tarjetas asignándoles su nuevo índice (0, 1, 2...)
    const reorderedItems = destColumn.map((task, index) => ({
      _id: task._id,
      status: destination.droppableId,
      order: index
    }));

    // 3. Enviar todo el bloque a MongoDB en segundo plano
    try {
      await fetch('/api/tasks/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: reorderedItems }),
      });
    } catch (error) {
      console.error("Error guardando orden:", error);
    }
  };

  // 3. Crear nueva tarea
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskData = {
      title: newTaskTitle,
      type: newTaskType,
      priority: newTaskPriority,
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (res.ok) {
        const newTaskDB = await res.json();
        optimisticAdd(newTaskDB);
        setNewTaskTitle('');
      }
    } catch (error) {
      console.error("Error creando tarea:", error);
    }
  };

  // 4. Eliminar tarea
  const handleDeleteTask = async (colId: keyof typeof columns, taskId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    optimisticDelete(colId, taskId);
    
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error eliminando tarea:", error);
    }
  };

  if (!isMounted) return null;
  if (isLoading) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Cargando base de datos...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex-1 w-full">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              FiveM Dev Tasks
            </h1>
            
            {/* NUEVO CONTENEDOR FLEX PARA USUARIO Y BOTÓN DE SALIDA */}
            <div className="flex items-center gap-3 mt-1">
              <p className="text-neutral-400 text-sm">
                Conectado como: <span className="text-neutral-300 font-semibold">{session?.user?.name}</span>
              </p>
              <button
                onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-2 py-1 rounded-md border border-red-500/20 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={14} /> Salir
              </button>
            </div>
            <div className="mt-4 relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-neutral-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre de tarea..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <form onSubmit={handleAddTask} className="flex flex-wrap gap-2 bg-neutral-900/80 p-2 rounded-xl border border-neutral-800 w-full xl:w-auto">
            <input
              type="text"
              placeholder="Ej: Fix exploit..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="bg-neutral-950 px-3 py-2 rounded-lg outline-none border border-neutral-800 text-sm flex-1 md:w-64 focus:border-blue-500"
            />
            <select
              value={newTaskType}
              onChange={(e) => setNewTaskType(e.target.value as TaskType)}
              className="bg-neutral-950 px-3 py-2 rounded-lg outline-none border border-neutral-800 text-sm text-neutral-300 cursor-pointer"
            >
              <option value="feature">Nuevo Script</option>
              <option value="bug">Bug</option>
              <option value="tweak">Modificación</option>
              <option value="optimization">Optimización</option>
            </select>
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              className="bg-neutral-950 px-3 py-2 rounded-lg outline-none border border-neutral-800 text-sm text-neutral-300 cursor-pointer"
            >
              <option value="low">Prioridad Baja</option>
              <option value="medium">Prioridad Media</option>
              <option value="high">Prioridad Alta</option>
              <option value="critical">CRÍTICO</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <Plus size={16} /> Crear
            </button>
          </form>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(columns) as Array<keyof typeof columns>).map((colId) => (
              <div key={colId} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-semibold text-neutral-300 text-base">{columnNames[colId]}</h2>
                  <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400 font-mono">
                    {isSearching ? `${filteredColumns[colId].length} / ${columns[colId].length}` : columns[colId].length}
                  </span>
                </div>

                <Droppable droppableId={colId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`min-h-[600px] p-3 rounded-2xl border transition-colors ${
                        snapshot.isDraggingOver ? 'bg-neutral-900/60 border-blue-500/40' : 'bg-neutral-900/30 border-neutral-800/80'
                      }`}
                    >
                      {isSearching && (
                        <div className="mb-3 text-[11px] text-center text-amber-500/70 bg-amber-500/10 py-1 rounded border border-amber-500/20">
                          Arrastre desactivado durante la búsqueda
                        </div>
                      )}

                      {filteredColumns[colId].map((task, index) => {
                        const TypeIcon = typeConfig[task.type].icon;
                        return (
                          <Draggable 
                            key={task._id} 
                            draggableId={task._id} 
                            index={index}
                            isDragDisabled={isSearching}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`mb-3 p-4 rounded-xl bg-neutral-900 select-none group transition-colors duration-200 border-2 ${
                                    snapshot.isDragging
                                    // 2. Quitamos el scale-[1.02] y aumentamos un poco la sombra para compensar
                                    ? 'shadow-2xl shadow-blue-500/10 border-blue-500/50'
                                    : `border-neutral-800/90 ${isSearching ? '' : 'hover:border-neutral-700'} ${priorityConfig[task.priority]}`
                                } ${isSearching ? 'cursor-default' : 'cursor-grab'}`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-sm font-medium text-neutral-200 leading-snug">{task.title}</p>
                                  
                                  {session?.user?.role === 'admin' && (
                                    <button
                                      onClick={() => handleDeleteTask(colId, task._id)}
                                      className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${typeConfig[task.type].color}`}>
                                    <TypeIcon size={12} />
                                    <span className="capitalize">{task.type}</span>
                                  </div>
                                  
                                  {task.createdBy && (
                                    <span className="text-[10px] text-neutral-500 font-medium">
                                      Creador: {task.createdBy.name.split(' ')[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}