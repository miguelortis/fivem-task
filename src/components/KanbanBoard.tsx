'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTaskStore, Task, TaskType, TaskPriority } from '@/store/useTaskStore';
import { Bug, Cpu, Wrench, Zap, Search, Plus, Trash2, LogOut, Shield, Layers, CheckCircle2, Clock, MessageSquare, X, Edit3, Send, UserCheck } from 'lucide-react';
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
  const searchParams = useSearchParams();
  const userIdParam = searchParams.get('userId');
  const devParam = searchParams.get('dev');

  const { columns, setTasksFromDB, optimisticMove, optimisticAdd, optimisticDelete } = useTaskStore();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [searchTerm, setSearchTerm] = useState('');

  const [systemUsers, setSystemUsers] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  
  const [selectedUserFilter, setSelectedUserFilter] = useState(userIdParam || 'my');

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<TaskType>('feature');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');

  useEffect(() => {
    if (userIdParam) {
      setSelectedUserFilter(userIdParam);
    } else {
      setSelectedUserFilter('my');
    }
  }, [userIdParam]);

  const allTasksList = [...columns.todo, ...columns.inProgress, ...columns.done];
  const uniqueCreators = Array.from(
    new Map(
      allTasksList
        .filter(t => t.assignedTo?._id && t.assignedTo?.name)
        .map(t => [t?.assignedTo?._id, t?.assignedTo?.name])
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredColumns = {
    todo: columns.todo.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      let matchUser = true;
      if (selectedUserFilter === 'my') {
        matchUser = t.assignedTo?._id === session?.user?.id || (!t.assignedTo && t.createdBy?._id === session?.user?.id);
      } else if (selectedUserFilter !== 'all') {
        matchUser = t.assignedTo?._id === selectedUserFilter;
      }
      return matchSearch && matchUser;
    }),
    inProgress: columns.inProgress.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      let matchUser = true;
      if (selectedUserFilter === 'my') {
        matchUser = t.assignedTo?._id === session?.user?.id || (!t.assignedTo && t.createdBy?._id === session?.user?.id);
      } else if (selectedUserFilter !== 'all') {
        matchUser = t.assignedTo?._id === selectedUserFilter;
      }
      return matchSearch && matchUser;
    }),
    done: columns.done.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
      let matchUser = true;
      if (selectedUserFilter === 'my') {
        matchUser = t.assignedTo?._id === session?.user?.id || (!t.assignedTo && t.createdBy?._id === session?.user?.id);
      } else if (selectedUserFilter !== 'all') {
        matchUser = t.assignedTo?._id === selectedUserFilter;
      }
      return matchSearch && matchUser;
    }),
  };
  const isSearching = searchTerm.trim().length > 0 || selectedUserFilter !== 'my';

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

    if (session?.user?.role === 'admin') {
      fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setSystemUsers(data);
        })
        .catch(err => console.error("Error cargando usuarios:", err));
    }
  }, [setTasksFromDB, status, session]);

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
      const payload: any = { 
        title: newTaskTitle, 
        type: newTaskType, 
        priority: newTaskPriority 
      };

      if (userIdParam) {
        payload.targetUserId = userIdParam;
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleDeleteTask = async (colId: keyof typeof columns, taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return;
    optimisticDelete(colId, taskId);
    if (activeTask?._id === taskId) setActiveTask(null);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (error) {
      console.error("Error eliminando tarea:", error);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !activeTask) return;

    try {
      const res = await fetch(`/api/tasks/${activeTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newNote: newNoteText }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        setNewNoteText('');
        const tasksRes = await fetch('/api/tasks');
        const tasksData = await tasksRes.json();
        if (Array.isArray(tasksData)) setTasksFromDB(tasksData);
      }
    } catch (error) {
      console.error("Error enviando nota:", error);
    }
  };

  const handleDeleteNote = async (taskId: string, noteId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteNoteId: noteId }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        const tasksRes = await fetch('/api/tasks');
        const tasksData = await tasksRes.json();
        if (Array.isArray(tasksData)) setTasksFromDB(tasksData);
      }
    } catch (error) {
      console.error("Error eliminando nota:", error);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    try {
      const res = await fetch(`/api/tasks/${activeTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, type: editType, priority: editPriority }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        setIsEditing(false);
        const tasksRes = await fetch('/api/tasks');
        const tasksData = await tasksRes.json();
        if (Array.isArray(tasksData)) setTasksFromDB(tasksData);
      }
    } catch (error) {
      console.error("Error editando tarea:", error);
    }
  };

  const handleTransferTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetId || !activeTask) return;
    if (!confirm('¿Estás seguro de transferir la ejecución de esta tarea a otro usuario?')) return;

    try {
      const res = await fetch(`/api/tasks/${activeTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: transferTargetId }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        setTransferTargetId('');
        const tasksRes = await fetch('/api/tasks');
        const tasksData = await tasksRes.json();
        if (Array.isArray(tasksData)) setTasksFromDB(tasksData);
        alert('¡Tarea transferida exitosamente!');
      }
    } catch (error) {
      console.error("Error transfiriendo tarea:", error);
    }
  };

  const openTaskModal = (task: Task) => {
    setActiveTask(task);
    setEditTitle(task.title);
    setEditType(task.type);
    setEditPriority(task.priority);
    setIsEditing(false);
  };

  if (!isMounted) return null;
  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-neutral-400">Cargando espacio de trabajo...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans selection:bg-blue-500/30">
      
      {/* NAVBAR SUPERIOR */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/40 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Cpu className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-tight text-white leading-none">FiveM Dev</h1>
                <span className="text-[11px] text-neutral-400 font-medium">Task Manager</span>
              </div>
            </div>

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

          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-neutral-400">Conectado como</p>
              <p className="text-sm font-semibold text-neutral-200">{session?.user?.name}</p>
            </div>
            <div className="h-6 w-[1px] bg-neutral-800" />
            <div className="flex items-center gap-2">
              {session?.user?.role === 'admin' && (
                <Link href="/admin" className="flex items-center gap-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-2 rounded-xl border border-purple-500/20 transition-all">
                  <Shield size={14} /> Panel Admin
                </Link>
              )}
              <button onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })} className="flex items-center gap-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-2 rounded-xl border border-red-500/20 transition-all">
                <LogOut size={14} /> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* BANNER DE ADMINISTRACIÓN ACTIVA */}
      {devParam && (
        <div className="bg-purple-600/10 border-b border-purple-500/20 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-purple-300 font-medium">
              <UserCheck size={15} /> Administrando el panel de: <strong className="text-white underline">{devParam}</strong> (Las tareas que crees aquí se le asignarán directamente).
            </span>
            <Link href="/dashboard" className="text-neutral-400 hover:text-white underline transition-colors">
              Volver a mis tareas generales
            </Link>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto p-6 md:p-8">
        
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          <div className="lg:col-span-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder={devParam ? `Buscar tareas de ${devParam}...` : "Buscar tarea..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-neutral-900/80 border border-neutral-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            {!userIdParam && (
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-300 focus:outline-none cursor-pointer"
              >
                <option value="my">Mis Tareas</option>
                <option value="all">Todas (Global)</option>
                {uniqueCreators.map((dev) => (
                  <option key={dev.id} value={dev.id}>Dev: {dev.name}</option>
                ))}
              </select>
            )}
          </div>

          <form onSubmit={handleAddTask} className="lg:col-span-8 flex flex-col sm:flex-row gap-2 bg-neutral-900/50 p-1.5 rounded-2xl border border-neutral-800/80">
            <input
              type="text"
              placeholder={devParam ? `Crear tarea para ${devParam}...` : "¿Qué tarea nueva hay que hacer?"}
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
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2">
                      <ColIcon size={16} className={config.color} />
                      <h2 className="font-semibold text-neutral-200 text-sm">{config.title}</h2>
                    </div>
                    <span className="text-xs bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full text-neutral-400 font-mono font-medium">
                      {isSearching ? `${filteredColumns[colId].length}/${columns[colId].length}` : columns[colId].length}
                    </span>
                  </div>

                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`min-h-[650px] p-3 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${
                          snapshot.isDraggingOver ? 'bg-neutral-900/50 border-blue-500/30 shadow-inner' : 'bg-neutral-900/20 border-neutral-800/60'
                        }`}
                      >
                        {filteredColumns[colId].map((task, index) => {
                          const typeData = typeConfig[task.type];
                          const TypeIcon = typeData.icon;
                          const priorityData = priorityConfig[task.priority];

                          return (
                            <Draggable key={task._id} draggableId={task._id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openTaskModal(task)}
                                  className={`p-4 rounded-xl bg-neutral-900/90 select-none group transition-colors duration-200 border relative cursor-pointer ${
                                    snapshot.isDragging ? 'shadow-2xl shadow-blue-500/20 border-blue-500/50 z-50' : `border-neutral-800/80 hover:border-neutral-700 ${priorityData.class}`
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <p className="text-sm font-medium text-neutral-100 leading-relaxed">{task.title}</p>
                                    
                                    {session?.user?.role === 'admin' && (
                                      <button
                                        onClick={(e) => handleDeleteTask(colId, task._id, e)}
                                        className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 shrink-0"
                                        title="Eliminar tarea"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>

                                  <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${typeData.color}`}>
                                      <TypeIcon size={12} />
                                      <span>{typeData.label}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {task.notes && task.notes.length > 0 && (
                                        <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                                          <MessageSquare size={12} /> {task.notes.length}
                                        </span>
                                      )}
                                      {task.assignedTo && (
                                        <span className="text-[11px] text-blue-400/90 font-medium bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                          @{task.assignedTo.name.split(' ')[0]}
                                        </span>
                                      )}
                                    </div>
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

      {/* MODAL DE TAREA: NOTAS, EDICIÓN Y TRANSFERENCIA */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {typeConfig[activeTask.type]?.label || 'Tarea'}
                </span>
                <span className="text-xs text-neutral-400">
                  Asignado a: <strong className="text-blue-300">@{activeTask.assignedTo?.name || 'Nadie'}</strong>
                </span>
              </div>
              <button onClick={() => setActiveTask(null)} className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {session?.user?.role === 'admin' && (
                <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                      <Shield size={13} /> Controles de Administrador
                    </span>
                    <button 
                      onClick={() => setIsEditing(!isEditing)} 
                      className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit3 size={12} /> {isEditing ? 'Cancelar Edición' : 'Editar Tarea'}
                    </button>
                  </div>

                  {isEditing && (
                    <form onSubmit={handleSaveEdit} className="space-y-3 pt-3 border-t border-neutral-800">
                      <div>
                        <label className="text-[11px] text-neutral-400 block mb-1">Título de la Tarea</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">Tipo</label>
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as TaskType)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="feature">Script</option>
                            <option value="bug">Bug</option>
                            <option value="tweak">Mod</option>
                            <option value="optimization">Optimización</option>
                            <option value="research">Investigación</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-neutral-400 block mb-1">Prioridad</label>
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítico</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors">
                        Guardar Cambios
                      </button>
                    </form>
                  )}

                  {/* Sección de Transferencia de Tarea */}
                  <div className="pt-3 border-t border-neutral-800">
                    <span className="text-[11px] text-neutral-400 block mb-2 font-medium">Transferir Tarea a otro Desarrollador</span>
                    <form onSubmit={handleTransferTask} className="flex gap-2">
                      <select
                        value={transferTargetId}
                        onChange={(e) => setTransferTargetId(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="">Seleccionar desarrollador...</option>
                        {systemUsers.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={!transferTargetId}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Transferir
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{activeTask.title}</h2>
                  <div className="flex gap-2 text-xs text-neutral-400">
                    <span>Prioridad: <strong className="text-neutral-200 capitalize">{activeTask.priority}</strong></span>
                    <span>•</span>
                    <span>Estado: <strong className="text-neutral-200 capitalize">{activeTask.status}</strong></span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-400" /> Notas y Bitácora de Actividad
                </h3>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {activeTask.notes && activeTask.notes.length > 0 ? (
                    activeTask.notes.map((note: any, idx: number) => {
                      const canDeleteNote = session?.user?.role === 'admin' || note.author?._id === session?.user?.id || note.author === session?.user?.id;

                      return (
                        <div key={note._id || idx} className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800/80 space-y-1 relative group">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-blue-400">@{note.author?.name || 'Desarrollador'}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-500">{new Date(note.createdAt).toLocaleString()}</span>
                              {canDeleteNote && (
                                <button
                                  onClick={() => handleDeleteNote(activeTask._id, note._id)}
                                  className="text-neutral-500 hover:text-red-400 transition-colors p-0.5"
                                  title="Eliminar nota"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-neutral-300 whitespace-pre-wrap">{note.text}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-neutral-500 italic py-2">No hay notas registradas todavía.</p>
                  )}
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Escribe una nota o actualización..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium shadow-lg shadow-blue-600/20 shrink-0"
                  >
                    <Send size={15} /> Enviar
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}