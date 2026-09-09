'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useTaskStore, Task, TaskType, TaskPriority } from '@/store/useTaskStore';
import { Bug, Cpu, Wrench, Zap, Search, LogOut, Shield, Layers, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Toaster, toast } from 'sonner';

// Módulos importados
import CreateTaskForm from '@/components/Kanban/CreateTaskForm';
import TaskCard from '@/components/Kanban/TaskCard';
import TaskModal from '@/components/Kanban/TaskModal';
import ImageCarousel from '@/components/Kanban/ImageCarousel';
import ConfirmDialog from '@/components/Kanban/ConfirmDialog';

export const columnConfig: Record<string, any> = {
  todo: { title: 'Por Hacer', icon: Clock, color: 'text-amber-400', border: 'border-amber-500/20' },
  inProgress: { title: 'En Progreso', icon: Layers, color: 'text-blue-400', border: 'border-blue-500/20' },
  done: { title: 'Listas', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/20' },
};

export const typeConfig: Record<TaskType, any> = {
  bug: { label: 'Bug', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Bug },
  feature: { label: 'Script', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Cpu },
  tweak: { label: 'Mod', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Wrench },
  optimization: { label: 'Optimización', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Zap },
  research: { label: 'Investigación', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: Search },
};

export const priorityConfig: Record<TaskPriority, any> = {
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
  const [isDragging, setIsDragging] = useState(false);
  
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState(userIdParam || 'my');

  // Estados visuales de modales y diálogos
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);

  const [systemUsers, setSystemUsers] = useState<Array<any>>([]);

  // Cierre Global con Tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenCardMenuId(null);
        setActiveTask(null);
        setCarouselImages([]);
        setConfirmDialog(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cierre Global de menús rápidos al hacer clic fuera
  useEffect(() => {
    if (!openCardMenuId) return;
    const handleClickOutside = () => setOpenCardMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openCardMenuId]);

  useEffect(() => {
    if (userIdParam) setSelectedUserFilter(userIdParam);
    else setSelectedUserFilter('my');
  }, [userIdParam]);

  const loadTasks = useCallback(async (silent = false) => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) setRawTasks(data);
    } catch (err) {
      console.error("Error cargando tareas:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Motor en Tiempo Real (10 Segundos)
  useEffect(() => {
    if (isDragging || activeTask) return;
    const interval = setInterval(() => loadTasks(true), 10000);
    return () => clearInterval(interval);
  }, [isDragging, activeTask, loadTasks]);

  useEffect(() => {
    setIsMounted(true);
    if (status === 'loading') return;
    if (status === 'unauthenticated') { setIsLoading(false); return; }

    loadTasks();

    if (session?.user?.role === 'admin' && session?.user?.id) {
      fetch('/api/admin/users').then(res => res.json()).then(data => {
        if (Array.isArray(data)) {
          setSystemUsers([{ _id: session.user.id, name: `${session.user.name} (Tú)`, email: session.user.email || '' }, ...data]);
        }
      });
    }
  }, [status, session, loadTasks]);

  // Filtrado de las columnas
  useEffect(() => {
    if (rawTasks.length === 0) { setTasksFromDB([]); return; }
    let filtered = rawTasks;
    const activeUserId = userIdParam || (selectedUserFilter === 'my' ? session?.user?.id : selectedUserFilter);

    if (activeUserId && activeUserId !== 'all') {
      filtered = rawTasks.filter(t => {
        const assignedId = typeof t.assignedTo === 'object' ? t.assignedTo?._id : t.assignedTo;
        const creatorId = typeof t.createdBy === 'object' ? t.createdBy?._id : t.createdBy;
        return assignedId === activeUserId || (!assignedId && creatorId === activeUserId);
      });
    }
    setTasksFromDB(filtered);
  }, [rawTasks, selectedUserFilter, userIdParam, session?.user?.id, setTasksFromDB]);

  const uniqueCreators = Array.from(new Map(rawTasks.filter(t => t.assignedTo || t.createdBy).map(t => {
    const u = t.assignedTo || t.createdBy;
    return [typeof u === 'object' ? u._id : u, typeof u === 'object' ? u.name : 'Desconocido'];
  })).entries()).map(([id, name]) => ({ id, name }));

  const filteredColumns = {
    todo: columns.todo.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    inProgress: columns.inProgress.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    done: columns.done.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
  };
  
  const isSearching = searchTerm.trim().length > 0;
  const isDragDisabled = selectedUserFilter === 'all' || isSearching;

  // Lógica de Drag and Drop
  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (isDragDisabled) return;

    optimisticMove(source.droppableId as keyof typeof columns, destination.droppableId as keyof typeof columns, source.index, destination.index);

    const freshColumns = useTaskStore.getState().columns;
    const destColumn = freshColumns[destination.droppableId as keyof typeof columns];
    const reorderedItems = destColumn.map((task, index) => ({ _id: task._id, status: destination.droppableId, order: index }));

    try {
      await fetch('/api/tasks/reorder', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: reorderedItems }) });
    } catch (error) {
      toast.error("Error guardando orden de las tareas");
      loadTasks();
    }
  };

  // Acciones de Tareas pasadas a los componentes hijos
  const handleQuickUpdate = async (taskId: string, updates: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenCardMenuId(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      if (res.ok) { toast.success("Tarea actualizada"); loadTasks(); }
    } catch (error) { toast.error("Error al actualizar la tarea"); }
  };

  const handleDeleteTask = (colId: string, taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenCardMenuId(null);
    setConfirmDialog({
      isOpen: true, title: 'Eliminar Tarea', message: '¿Estás seguro de eliminar esta tarea y todas sus imágenes permanentemente?',
      onConfirm: async () => {
        optimisticDelete(colId as keyof typeof columns, taskId);
        if (activeTask?._id === taskId) setActiveTask(null);
        try {
          await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
          toast.success("Tarea eliminada correctamente");
        } catch (error) { toast.error("Error al eliminar la tarea"); loadTasks(); }
      }
    });
  };

  const handleRemoveTaskImage = (taskId: string, imageUrl: string) => {
    setConfirmDialog({
      isOpen: true, title: 'Eliminar Imagen', message: '¿Estás seguro de eliminar esta imagen? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removeTaskImageUrl: imageUrl }) });
          if (res.ok) {
            const updated = await res.json();
            if (activeTask?._id === taskId) setActiveTask(updated);
            loadTasks();
            toast.success("Imagen eliminada");
          }
        } catch (error) { toast.error("Error al eliminar la imagen"); }
      }
    });
  };

  const handleRemoveNoteImage = (taskId: string, noteId: string, imageUrl: string) => {
    setConfirmDialog({
      isOpen: true, title: 'Eliminar Imagen de Nota', message: '¿Estás seguro de eliminar esta imagen?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ removeNoteImageUrl: { noteId, imageUrl } }) });
          if (res.ok) {
            const updated = await res.json();
            if (activeTask?._id === taskId) setActiveTask(updated);
            loadTasks();
            toast.success("Imagen eliminada");
          }
        } catch (error) { toast.error("Error al eliminar la imagen"); }
      }
    });
  };

  const handleDeleteNote = (taskId: string, noteId: string) => {
    setConfirmDialog({
      isOpen: true, title: 'Eliminar Nota', message: '¿Estás seguro de eliminar esta nota de la bitácora?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleteNoteId: noteId }) });
          if (res.ok) {
            const updated = await res.json();
            if (activeTask?._id === taskId) setActiveTask(updated);
            loadTasks();
            toast.success("Nota eliminada");
          }
        } catch (error) { toast.error("Error eliminando nota"); }
      }
    });
  };

  if (!isMounted) return null;
  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-neutral-400">Cargando espacio de trabajo...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans selection:bg-blue-500/30">
      <Toaster closeButton position="bottom-right" richColors theme="dark" />
      
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
              {session?.user?.role === 'admin' && <Link className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20" href="/admin"><Shield size={16} /></Link>}
              <button onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })} className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"><LogOut size={16} /></button>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-neutral-400">Conectado como</p>
              <p className="text-sm font-semibold text-neutral-200">{session?.user?.name}</p>
            </div>
            <div className="h-6 w-[1px] bg-neutral-800" />
            <div className="flex items-center gap-2">
              {session?.user?.role === 'admin' && <Link className="flex items-center gap-1.5 text-xs font-medium bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-3 py-2 rounded-xl border border-purple-500/20 transition-all" href="/admin"><Shield size={14} /> Panel Admin</Link>}
              <button onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })} className="flex items-center gap-1.5 text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-2 rounded-xl border border-red-500/20 transition-all"><LogOut size={14} /> Salir</button>
            </div>
          </div>
        </div>
      </header>

      {devParam && (
        <div className="bg-purple-600/10 border-b border-purple-500/20 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-purple-300 font-medium">
              <UserCheck size={15} /> Administrando panel de: <strong className="text-white underline">{devParam}</strong>
            </span>
            <Link className="text-neutral-400 hover:text-white underline transition-colors" href="/dashboard">Volver a mis tareas generales</Link>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
              <input type="text" placeholder="Buscar tarea..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-neutral-900/80 border border-neutral-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-200 focus:outline-none focus:border-blue-500/50" />
            </div>

            {!userIdParam && (
              <select value={selectedUserFilter} onChange={(e) => setSelectedUserFilter(e.target.value)} className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-300 focus:outline-none cursor-pointer">
                <option value="my">Mis Tareas</option><option value="all">Todas (Global)</option>
                {uniqueCreators.map((dev) => <option key={dev.id} value={dev.id}>Dev: {dev.name}</option>)}
              </select>
            )}
          </div>

          <CreateTaskForm devParam={devParam} userIdParam={userIdParam} onSuccess={(newTask) => { optimisticAdd(newTask); loadTasks(); }} />
        </div>

        <DragDropContext onDragStart={() => setIsDragging(true)} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(Object.keys(columns) as Array<keyof typeof columns>).map((colId) => {
              const config = columnConfig[colId];
              const ColIcon = config.icon;
              return (
                <div key={colId} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2"><ColIcon className={config.color} size={16} /><h2 className="font-semibold text-neutral-200 text-sm">{config.title}</h2></div>
                    <span className="text-xs bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 rounded-full text-neutral-400 font-mono font-medium">{filteredColumns[colId].length}</span>
                  </div>

                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className={`min-h-[650px] p-3 rounded-2xl border transition-all duration-200 flex flex-col gap-3 ${snapshot.isDraggingOver ? 'bg-neutral-900/50 border-blue-500/30' : 'bg-neutral-900/20 border-neutral-800/60'}`}>
                        {filteredColumns[colId].map((task, index) => (
                          <TaskCard 
                            key={task._id} task={task} index={index} colId={colId} isDragDisabled={isDragDisabled} session={session} typeConfig={typeConfig} priorityConfig={priorityConfig}
                            openCardMenuId={openCardMenuId} setOpenCardMenuId={setOpenCardMenuId} onOpenModal={setActiveTask} onDelete={handleDeleteTask} onQuickUpdate={handleQuickUpdate} onOpenCarousel={(imgs, idx) => { setCarouselImages(imgs); setCarouselIndex(idx); }}
                          />
                        ))}
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

      {/* COMPONENTES MODULARES INVISIBLES HASTA QUE SE ACTIVAN */}
      {activeTask && (
        <TaskModal 
          task={activeTask} session={session} systemUsers={systemUsers} typeConfig={typeConfig}
          onClose={() => setActiveTask(null)} onTaskUpdated={(updated) => { setActiveTask(updated); loadTasks(); }}
          onOpenCarousel={(imgs, idx) => { setCarouselImages(imgs); setCarouselIndex(idx); }}
          onRemoveTaskImage={handleRemoveTaskImage} onRemoveNoteImage={handleRemoveNoteImage} onDeleteNote={handleDeleteNote}
        />
      )}

      <ImageCarousel images={carouselImages} initialIndex={carouselIndex} onClose={() => setCarouselImages([])} />
      
      {confirmDialog && <ConfirmDialog isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />}
    </div>
  );
}