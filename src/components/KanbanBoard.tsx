'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTaskStore, Task, TaskType, TaskPriority } from '@/store/useTaskStore';
import { Bug, Cpu, Wrench, Zap, Search, Plus, Trash2, LogOut, Shield, Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const columnConfig = {
  todo: { title: 'Por Hacer', icon: Clock, color: 'text-amber-400', border: 'border-amber-500/20' },
  inProgress: { title: 'En Progreso', icon: Layers, color: 'text-blue-400', border: 'border-blue-500/20' },
  done: { title: 'Listas', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/20' },
};

const typeConfig: Record<TaskType, { label: string; color: string; icon: React.ComponentType<{ size: number }> }> = {
  bug: { label: 'Bug', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Bug },
  feature: { label: 'Script', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Cpu },
  tweak: { label: 'Mod', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Wrench },
  optimization: { label: 'Optimización', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Zap },
  research: { label: 'Investigación', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Search },
};

const priorityConfig: Record<TaskPriority, { label: string; class: string }> = {
  low: { label: 'Baja', class: 'border-transparent text-neutral-500' },
  medium: { label: 'Media', class: 'border-transparent text-neutral-400' },
  high: { label: 'Alta', class: 'border-orange-500/40 bg-orange-500/5' },
  critical: { label: 'Crítico', class: 'border-red-500/80 bg-red-500/10 shadow-lg shadow-red-500/10 animate-pulse' },
};

export default function KanbanBoard() {
  const { data: session, status } = useSession();
  const { columns, setTasksFromDB, optimisticMove, optimisticAdd, optimisticDelete } = useTaskStore();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredColumns = {
    todo: columns.todo.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    inProgress: columns.inProgress.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    done: columns.done.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
  };
  const isSearching = searchTerm.trim().length > 0;

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
  }, [setTasksFromDB, status]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    optimisticMove(
      source.droppableId as keyof typeof columns,
      destination.droppableId as keyof typeof columns,
      source.index,
      destination.index
    );

    const freshColumns = useTaskStore.getState().columns;
    const destColumn = freshColumns[destination.droppableId as keyof typeof columns];
    const reorderedItems = destColumn.map((task, index) => ({
      _id: task._id,
      status: destination.droppableId,
      order: index
    }));

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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle, type: newTaskType, priority: newTaskPriority }),
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

  const handleDeleteTask = async (colId: keyof typeof columns, taskId: string) => {
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return;
    optimisticDelete(colId, taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error eliminando tarea:", error);
    }
  };

  if (!isMounted) return null;
  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-neutral-400">Cargando espacio de trabajo...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans selection:bg-blue-500/30">
      
      {/* NAVBAR SUPERIOR MODERNO */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo y Título */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Cpu className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-tight text-white leading-none">FiveM Dev</h1>
                <span className="text-[11px] text-neutral-400 font-medium">Administrador de tareas</span>
              </div>
            </div>

            {/* Acciones móviles de usuario */}
            <div className="flex md:hidden items-center gap-2">
              {session?.user?.role === 'admin' && (
                <Link href="/admin" className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Shield size={16} />
                </Link>
              )}
              <button onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })} className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Información de Usuario y Botones de Escritorio */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-200">{session?.user?.name}</p>
              <p className="text-xs text-neutral-400">{session?.user?.role === "admin" ? "Administrador" : "Usuario"}</p>
            </div>

            <div className="h-6 w-[1px] bg-neutral-800" />

            <div className="flex items-center gap-2">
              {session?.user?.role === 'admin' && (
                <Link href="/admin" className="flex items-center gap-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-2 rounded-xl border border-purple-500/20 transition-all">
                  <Shield size={14} /> Panel Admin
                </Link>
              )}
              <button onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })} className="flex items-center gap-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-2 rounded-xl border border-red-500/20 transition-all" title="Cerrar sesión">
                <LogOut size={14} /> Salir
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        
        {/* BARRA DE ACCIONES (BUSCADOR + FORMULARIO DE CREACIÓN) */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Buscador */}
          <div className="lg:col-span-4 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar tarea..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900/80 border border-neutral-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-inner"
            />
          </div>

          {/* Formulario Crear Tarea Rápida */}
          <form onSubmit={handleAddTask} className="lg:col-span-8 flex flex-col sm:flex-row gap-2 bg-neutral-900/50 p-1.5 rounded-2xl border border-neutral-800/80 backdrop-blur-sm">
            <input
              type="text"
              placeholder="¿Qué tarea nueva hay que hacer en el servidor?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="bg-transparent px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none flex-1"
            />
            
            <div className="flex items-center gap-2 px-2 sm:px-0">
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as TaskType)}
                className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value="feature">Script</option>
                <option value="bug">Bug</option>
                <option value="tweak">Mod</option>
                <option value="optimization">Optimización</option>
                <option value="research">Investigación</option>
              </select>

              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítico</option>
              </select>

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 shrink-0"
              >
                <Plus size={15} /> Crear
              </button>
            </div>
          </form>

        </div>

        {/* TABLERO KANBAN */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(columns) as Array<keyof typeof columns>).map((colId) => {
              const config = columnConfig[colId];
              const ColIcon = config.icon;
              
              return (
                <div key={colId} className="flex flex-col gap-3">
                  
                  {/* Encabezado de Columna */}
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2">
                      <ColIcon size={16} className={config.color} />
                      <h2 className="font-semibold text-neutral-200 text-sm">{config.title}</h2>
                    </div>
                    <span className="text-xs bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full text-neutral-400 font-mono font-medium">
                      {isSearching ? `${filteredColumns[colId].length}/${columns[colId].length}` : columns[colId].length}
                    </span>
                  </div>

                  {/* Contenedor Droppable */}
                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`min-h-[650px] p-3 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
                          snapshot.isDraggingOver 
                            ? 'bg-neutral-900/50 border-blue-500/30 shadow-inner' 
                            : 'bg-neutral-900/20 border-neutral-800/60'
                        }`}
                      >
                        {isSearching && (
                          <div className="text-[11px] text-center text-amber-400/80 bg-amber-500/10 py-1.5 rounded-xl border border-amber-500/20 font-medium">
                            Arrastre bloqueado por búsqueda
                          </div>
                        )}

                        {filteredColumns[colId].map((task, index) => {
                          const typeData = typeConfig[task.type];
                          const TypeIcon = typeData.icon;
                          const priorityData = priorityConfig[task.priority];

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
                                  className={`p-4 rounded-xl bg-neutral-900/90 select-none group transition-colors duration-200 border relative ${
                                    snapshot.isDragging
                                      ? 'shadow-2xl shadow-blue-500/20 border-blue-500/50 z-50'
                                      : `border-neutral-800/80 ${isSearching ? '' : 'hover:border-neutral-700'} ${priorityData.class}`
                                  } ${isSearching ? 'cursor-default' : 'cursor-grab'}`}
                                >
                                  {/* Título de la tarjeta */}
                                  <div className="flex justify-between items-start gap-3">
                                    <p className="text-sm font-medium text-neutral-100 leading-relaxed">{task.title}</p>
                                    
                                    {session?.user?.role === 'admin' && (
                                      <button
                                        onClick={() => handleDeleteTask(colId, task._id)}
                                        className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 shrink-0"
                                        title="Eliminar tarea"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>

                                  {/* Footer de la tarjeta: Etiqueta de tipo + Creador */}
                                  <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${typeData.color}`}>
                                      <TypeIcon size={12} />
                                      <span>{typeData.label}</span>
                                    </div>

                                    {task.createdBy && (
                                      <span className="text-[11px] text-neutral-500 font-medium">
                                        @{task.createdBy.name.split(' ')[0]}
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
              );
            })}
          </div>
        </DragDropContext>

      </main>
    </div>
  );
}