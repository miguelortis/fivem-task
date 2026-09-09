'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useTaskStore, Task, TaskType, TaskPriority } from '@/store/useTaskStore';
import { Bug, Cpu, Wrench, Zap, Search, Plus, Trash2, LogOut, Shield, Layers, CheckCircle2, Clock, MessageSquare, X, Edit3, Send, UserCheck, Upload, Maximize2, ChevronLeft, ChevronRight, ImagePlus, SlidersHorizontal, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { compressImage } from '@/lib/compressImage';

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
  
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para múltiples imágenes
  const [taskImageFiles, setTaskImageFiles] = useState<File[]>([]);
  const [taskImagePreviews, setTaskImagePreviews] = useState<string[]>([]);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [noteImageFiles, setNoteImageFiles] = useState<File[]>([]);
  const [noteImagePreviews, setNoteImagePreviews] = useState<string[]>([]);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [extraTaskImageFiles, setExtraTaskImageFiles] = useState<File[]>([]);
  const [extraTaskImagePreviews, setExtraTaskImagePreviews] = useState<string[]>([]);
  const [isSubmittingExtraImages, setIsSubmittingExtraImages] = useState(false);

  // Estados para el carrusel y menú rápido de tarjeta
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  const [systemUsers, setSystemUsers] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  
  const [selectedUserFilter, setSelectedUserFilter] = useState(userIdParam || 'my');

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<TaskType>('feature');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');

  // EFECTO GLOBAL: Cerrar modales y menús al presionar la tecla ESCAPE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenCardMenuId(null);
        setActiveTask(null);
        setCarouselImages([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // EFECTO GLOBAL: Cerrar el mini-menú al hacer clic fuera de él
  useEffect(() => {
    if (!openCardMenuId) return;
    const handleClickOutside = () => {
      setOpenCardMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [openCardMenuId]);

  useEffect(() => {
    if (userIdParam) {
      setSelectedUserFilter(userIdParam);
    } else {
      setSelectedUserFilter('my');
    }
  }, [userIdParam]);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) {
        setRawTasks(data);
      }
    } catch (err) {
      console.error("Error cargando tareas:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setIsLoading(false);
      return;
    }

    loadTasks();

    if (session?.user?.role === 'admin' && session?.user?.id) {
      fetch('/api/admin/users')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const currentUserAsDev = {
              _id: session.user.id,
              name: `${session.user.name} (Tú)`,
              email: session.user.email || ''
            };
            setSystemUsers([currentUserAsDev, ...data]);
          }
        })
        .catch(err => console.error("Error cargando usuarios:", err));
    }
  }, [status, session, loadTasks]);

  useEffect(() => {
    if (rawTasks.length === 0) {
      setTasksFromDB([]);
      return;
    }

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

  const uniqueCreators = Array.from(
    new Map(
      rawTasks
        .filter(t => {
          const u = t.assignedTo || t.createdBy;
          const uId = typeof u === 'object' ? u?._id : u;
          const uName = typeof u === 'object' ? u?.name : null;
          return uId && uName;
        })
        .map(t => {
          const u = t.assignedTo || t.createdBy;
          const uId = typeof u === 'object' ? u._id : u;
          const uName = typeof u === 'object' ? u.name : 'Desconocido';
          return [uId, uName];
        })
    ).entries()
  ).map(([id, name]) => ({ id, name }));

  const filteredColumns = {
    todo: columns.todo.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    inProgress: columns.inProgress.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
    done: columns.done.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())),
  };
  
  const isSearching = searchTerm.trim().length > 0;
  const isDragDisabled = selectedUserFilter === 'all' || isSearching;

  const handleFilesSelected = async (files: FileList | File[], target: 'task' | 'note' | 'extra') => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    try {
      const compressedFiles = await Promise.all(validFiles.map(file => compressImage(file)));
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));

      if (target === 'task') {
        setTaskImageFiles(prev => [...prev, ...compressedFiles]);
        setTaskImagePreviews(prev => [...prev, ...newPreviews]);
      } else if (target === 'note') {
        setNoteImageFiles(prev => [...prev, ...compressedFiles]);
        setNoteImagePreviews(prev => [...prev, ...newPreviews]);
      } else if (target === 'extra') {
        setExtraTaskImageFiles(prev => [...prev, ...compressedFiles]);
        setExtraTaskImagePreviews(prev => [...prev, ...newPreviews]);
      }
    } catch (err) {
      console.error("Error optimizando imágenes:", err);
    }
  };

  const uploadImagesToBlob = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Error al subir las imágenes');
    const data = await res.json();
    return data.urls;
  };

  const openCarousel = (images: string[], index: number) => {
    setCarouselImages(images);
    setCarouselIndex(index);
  };

  const handleQuickUpdate = async (taskId: string, updates: { status?: string; priority?: string }, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenCardMenuId(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        loadTasks();
      }
    } catch (error) {
      console.error("Error en actualización rápida:", error);
    }
  };

  const renderWhatsAppGrid = (images: string[]) => {
    if (!images || images.length === 0) return null;

    if (images.length === 1) {
      return (
        <div 
          onClick={(e) => { e.stopPropagation(); openCarousel(images, 0); }}
          className="mt-3 overflow-hidden rounded-lg border border-neutral-800 max-h-36 bg-neutral-950 relative group/img cursor-zoom-in"
        >
          <img src={images[0]} alt="Attachment" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            <Maximize2 size={15} className="text-white" />
            <span className="text-[11px] font-medium text-white">Ampliar</span>
          </div>
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-32 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
          {images.map((url, i) => (
            <div 
              key={i} 
              onClick={(e) => { e.stopPropagation(); openCarousel(images, i); }}
              className="relative group/img cursor-zoom-in h-24 overflow-hidden"
            >
              <img src={url} alt={`Attachment ${i}`} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={14} className="text-white" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    const visibleImages = images.slice(0, 2);
    const remainingCount = images.length - 2;

    return (
      <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-32 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
        {visibleImages.map((url, i) => {
          const isLast = i === 1;
          return (
            <div 
              key={i} 
              onClick={(e) => { e.stopPropagation(); openCarousel(images, i); }}
              className="relative group/img cursor-zoom-in h-24 overflow-hidden"
            >
              <img src={url} alt={`Attachment ${i}`} className={`w-full h-full object-cover group-hover/img:scale-105 transition-transform ${isLast && remainingCount > 0 ? 'filter blur-[3px]' : ''}`} />
              
              {isLast && remainingCount > 0 ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-base tracking-wider">+{remainingCount}</span>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 size={14} className="text-white" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleRemoveTaskImage = async (taskId: string, imageUrl: string) => {
    if (!confirm('¿Estás seguro de eliminar esta imagen?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeTaskImageUrl: imageUrl }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        loadTasks();
      }
    } catch (error) {
      console.error("Error eliminando imagen:", error);
    }
  };

  const handleRemoveNoteImage = async (taskId: string, noteId: string, imageUrl: string) => {
    if (!confirm('¿Estás seguro de eliminar la imagen de esta nota?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeNoteImageUrl: { noteId, imageUrl } }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        loadTasks();
      }
    } catch (error) {
      console.error("Error eliminando imagen de nota:", error);
    }
  };

  const handleUploadExtraImages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || extraTaskImageFiles.length === 0) return;

    try {
      setIsSubmittingExtraImages(true);
      const uploadedUrls = await uploadImagesToBlob(extraTaskImageFiles);

      const res = await fetch(`/api/tasks/${activeTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newImages: uploadedUrls }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        setExtraTaskImageFiles([]);
        setExtraTaskImagePreviews([]);
        loadTasks();
      }
    } catch (error) {
      console.error("Error agregando imágenes a la tarea:", error);
    } finally {
      setIsSubmittingExtraImages(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (isDragDisabled) return;

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
      loadTasks();
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() && taskImageFiles.length === 0) return;

    try {
      setIsSubmittingTask(true);
      let uploadedUrls: string[] = [];

      if (taskImageFiles.length > 0) {
        uploadedUrls = await uploadImagesToBlob(taskImageFiles);
      }

      const payload: any = { 
        title: newTaskTitle || 'Imágenes adjuntas', 
        type: newTaskType, 
        priority: newTaskPriority,
        images: uploadedUrls
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
        setTaskImageFiles([]);
        setTaskImagePreviews([]);
        loadTasks();
      }
    } catch (error) {
      console.error("Error creando tarea:", error);
    } finally {
      setIsSubmittingTask(false);
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
      loadTasks();
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newNoteText.trim() && noteImageFiles.length === 0) || !activeTask) return;

    try {
      setIsSubmittingNote(true);
      let uploadedUrls: string[] = [];

      if (noteImageFiles.length > 0) {
        uploadedUrls = await uploadImagesToBlob(noteImageFiles);
      }

      const res = await fetch(`/api/tasks/${activeTask._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newNote: newNoteText || 'Imágenes adjuntas', 
          noteImages: uploadedUrls 
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setActiveTask(updated);
        setNewNoteText('');
        setNoteImageFiles([]);
        setNoteImagePreviews([]);
        loadTasks();
      }
    } catch (error) {
      console.error("Error enviando nota:", error);
    } finally {
      setIsSubmittingNote(false);
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
        loadTasks();
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
        loadTasks();
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
        loadTasks();
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
    setExtraTaskImageFiles([]);
    setExtraTaskImagePreviews([]);
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

          {/* FORMULARIO DE TAREA */}
          <form onSubmit={handleAddTask} className="lg:col-span-8 flex flex-col gap-2 bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/80">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder={devParam ? `Crear tarea para ${devParam}...` : "¿Qué tarea nueva hay que hacer?"}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onPaste={(e) => {
                  const files = e.clipboardData.files;
                  if (files && files.length > 0) handleFilesSelected(files, 'task');
                }}
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
                  disabled={isSubmittingTask}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-all font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 shrink-0"
                >
                  <Plus size={15} /> {isSubmittingTask ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </div>

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files, 'task');
              }}
              onPaste={(e) => {
                const files = e.clipboardData.files;
                if (files && files.length > 0) handleFilesSelected(files, 'task');
              }}
              className="border border-dashed border-neutral-800 hover:border-blue-500/40 rounded-xl px-3 py-2 text-center cursor-pointer bg-neutral-950/40 transition-colors flex flex-col gap-2"
              onClick={() => document.getElementById('task-file-input')?.click()}
            >
              <input 
                id="task-file-input" 
                type="file" 
                accept="image/*" 
                multiple
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files) handleFilesSelected(e.target.files, 'task');
                }} 
              />
              
              {taskImagePreviews.length > 0 ? (
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {taskImagePreviews.map((preview, i) => (
                      <img 
                        key={i}
                        src={preview} 
                        alt="Preview" 
                        onClick={(e) => { e.stopPropagation(); openCarousel(taskImagePreviews, i); }}
                        className="h-9 w-9 object-cover rounded-lg border border-neutral-700 cursor-zoom-in" 
                      />
                    ))}
                    <span className="text-[11px] text-emerald-400 font-medium">{taskImagePreviews.length} imágenes listas</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); setTaskImageFiles([]); setTaskImagePreviews([]); }} 
                    className="text-neutral-400 hover:text-red-400 text-xs px-2 py-1"
                  >
                    Limpiar todo
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-neutral-400 w-full justify-center">
                  <Upload size={13} className="text-blue-400" />
                  <span>Adjuntar imágenes (Puedes seleccionar varias, arrastrar, <strong>pega con Ctrl+V</strong> o hacer clic)</span>
                </div>
              )}
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
                            <Draggable 
                              key={task._id} 
                              draggableId={task._id} 
                              index={index}
                              isDragDisabled={isDragDisabled}
                            >
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
                                    <p className="text-sm font-medium text-neutral-100 leading-relaxed pr-6">{task.title}</p>
                                    
                                    {/* MENÚ RÁPIDO EN LA TARJETA (ESTADO Y PRIORIDAD) */}
                                    <div className="absolute top-3 right-3 flex items-center gap-1">
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenCardMenuId(openCardMenuId === task._id ? null : task._id);
                                          }}
                                          className="text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 transition-colors"
                                          title="Cambio rápido de estado / prioridad"
                                        >
                                          <SlidersHorizontal size={13} />
                                        </button>

                                        {openCardMenuId === task._id && (
                                          <div 
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-7 w-48 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-40 space-y-2 text-xs"
                                          >
                                            <div>
                                              <span className="text-[10px] uppercase font-mono text-neutral-500 px-2 block mb-1">Mover a columna</span>
                                              <div className="space-y-0.5">
                                                {colId !== 'todo' && (
                                                  <button onClick={(e) => handleQuickUpdate(task._id, { status: 'todo' }, e)} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-800 text-amber-400 flex items-center gap-1.5">
                                                    <Clock size={12} /> Por Hacer
                                                  </button>
                                                )}
                                                {colId !== 'inProgress' && (
                                                  <button onClick={(e) => handleQuickUpdate(task._id, { status: 'inProgress' }, e)} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-800 text-blue-400 flex items-center gap-1.5">
                                                    <Layers size={12} /> En Progreso
                                                  </button>
                                                )}
                                                {colId !== 'done' && (
                                                  <button onClick={(e) => handleQuickUpdate(task._id, { status: 'done' }, e)} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-800 text-emerald-400 flex items-center gap-1.5">
                                                    <CheckCircle2 size={12} /> Listas
                                                  </button>
                                                )}
                                              </div>
                                            </div>

                                            <div className="border-t border-neutral-800 pt-1.5">
                                              <span className="text-[10px] uppercase font-mono text-neutral-500 px-2 block mb-1">Cambiar prioridad</span>
                                              <div className="grid grid-cols-2 gap-1">
                                                <button onClick={(e) => handleQuickUpdate(task._id, { priority: 'low' }, e)} className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-center text-[10px] text-neutral-400">Baja</button>
                                                <button onClick={(e) => handleQuickUpdate(task._id, { priority: 'medium' }, e)} className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-center text-[10px] text-neutral-300">Media</button>
                                                <button onClick={(e) => handleQuickUpdate(task._id, { priority: 'high' }, e)} className="px-2 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-center text-[10px] text-orange-400">Alta</button>
                                                <button onClick={(e) => handleQuickUpdate(task._id, { priority: 'critical' }, e)} className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-center text-[10px] font-bold text-red-400 flex items-center justify-center gap-0.5">
                                                  <AlertCircle size={10} /> Crítico
                                                </button>
                                              </div>
                                            </div>

                                            {session?.user?.role === 'admin' && (
                                              <div className="border-t border-neutral-800 pt-1.5">
                                                <button 
                                                  onClick={(e) => handleDeleteTask(colId, task._id, e)} 
                                                  className="w-full text-left px-2 py-1 rounded hover:bg-red-500/10 text-red-400 flex items-center gap-1.5"
                                                >
                                                  <Trash2 size={12} /> Eliminar tarea
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {renderWhatsAppGrid(task.images || [])}

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
                                          @{typeof task.assignedTo === 'object' ? task.assignedTo.name.split(' ')[0] : 'Dev'}
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
                  Asignado a: <strong className="text-blue-300">@{typeof activeTask.assignedTo === 'object' ? activeTask.assignedTo?.name : 'Desconocido'}</strong>
                </span>
              </div>
              <button onClick={() => setActiveTask(null)} className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {activeTask.images && activeTask.images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] text-neutral-400 font-medium">Imágenes adjuntas a la tarea:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {activeTask.images.map((imgUrl: string, idx: number) => (
                      <div key={idx} className="relative group/modalimg rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 h-28">
                        <img 
                          src={imgUrl} 
                          alt="Referencia" 
                          onClick={() => openCarousel(activeTask.images || [], idx)}
                          className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform" 
                        />
                        <button
                          onClick={() => handleRemoveTaskImage(activeTask._id, imgUrl)}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover/modalimg:opacity-100 transition-opacity shadow-lg"
                          title="Eliminar imagen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ZONA PARA AGREGAR MÁS FOTOS A UNA TAREA YA CREADA */}
              <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800 space-y-2">
                <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
                  <ImagePlus size={14} className="text-blue-400" /> Agregar más fotos a esta tarea:
                </span>
                
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files, 'extra');
                  }}
                  onPaste={(e) => {
                    const files = e.clipboardData.files;
                    if (files && files.length > 0) handleFilesSelected(files, 'extra');
                  }}
                  className="border border-dashed border-neutral-800 hover:border-blue-500/40 rounded-xl px-3 py-2 text-center cursor-pointer bg-neutral-900/60 transition-colors flex flex-col gap-2"
                  onClick={() => document.getElementById('extra-task-file-input')?.click()}
                >
                  <input 
                    id="extra-task-file-input" 
                    type="file" 
                    accept="image/*" 
                    multiple
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(e.target.files, 'extra');
                    }} 
                  />

                  {extraTaskImagePreviews.length > 0 ? (
                    <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {extraTaskImagePreviews.map((preview, i) => (
                          <img 
                            key={i}
                            src={preview} 
                            alt="Extra Preview" 
                            className="h-8 w-8 object-cover rounded-md border border-neutral-700" 
                          />
                        ))}
                        <span className="text-[11px] text-emerald-400 font-medium">{extraTaskImagePreviews.length} seleccionadas</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isSubmittingExtraImages}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await handleUploadExtraImages(e);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-lg font-medium transition-colors"
                        >
                          {isSubmittingExtraImages ? 'Subiendo...' : 'Subir fotos'}
                        </button>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setExtraTaskImageFiles([]); setExtraTaskImagePreviews([]); }} 
                          className="text-neutral-400 hover:text-red-400 text-xs px-2 py-1"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 w-full justify-center">
                      <Upload size={12} className="text-blue-400" />
                      <span>Arrastra, <strong>pega (Ctrl+V)</strong> o haz clic para añadir más fotos</span>
                    </div>
                  )}
                </div>
              </div>

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
                      const noteAuthorId = typeof note.author === 'object' ? note.author?._id : note.author;
                      const canDeleteNote = session?.user?.role === 'admin' || noteAuthorId === session?.user?.id;

                      return (
                        <div key={note._id || idx} className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800/80 space-y-2 relative group">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-blue-400">@{typeof note.author === 'object' ? note.author?.name : 'Desarrollador'}</span>
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

                          {note.images && note.images.length > 0 && (
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {note.images.map((imgUrl: string, imgIdx: number) => (
                                <div key={imgIdx} className="relative group/noteimg rounded-lg overflow-hidden border border-neutral-800 h-24 bg-neutral-900">
                                  <img 
                                    src={imgUrl} 
                                    alt="Nota adjunta" 
                                    onClick={() => openCarousel(note.images, imgIdx)}
                                    className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform" 
                                  />
                                  <button
                                    onClick={() => handleRemoveNoteImage(activeTask._id, note._id, imgUrl)}
                                    className="absolute top-1.5 right-1.5 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-md opacity-0 group-hover/noteimg:opacity-100 transition-opacity shadow-lg"
                                    title="Eliminar imagen"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-neutral-500 italic py-2">No hay notas registradas todavía.</p>
                  )}
                </div>

                <form onSubmit={handleAddNote} className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe una nota o actualización..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onPaste={(e) => {
                        const files = e.clipboardData.files;
                        if (files && files.length > 0) handleFilesSelected(files, 'note');
                      }}
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingNote}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium shadow-lg shadow-blue-600/20 shrink-0"
                    >
                      <Send size={15} /> {isSubmittingNote ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>

                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files, 'note');
                    }}
                    onPaste={(e) => {
                      const files = e.clipboardData.files;
                      if (files && files.length > 0) handleFilesSelected(files, 'note');
                    }}
                    className="border border-dashed border-neutral-800 hover:border-blue-500/40 rounded-xl px-3 py-2 text-center cursor-pointer bg-neutral-950/40 transition-colors flex flex-col gap-2"
                    onClick={() => document.getElementById('note-file-input')?.click()}
                  >
                    <input 
                      id="note-file-input" 
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files) handleFilesSelected(e.target.files, 'note');
                      }} 
                    />
                    
                    {noteImagePreviews.length > 0 ? (
                      <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {noteImagePreviews.map((preview, i) => (
                            <img 
                              key={i}
                              src={preview} 
                              alt="Preview" 
                              onClick={(e) => { e.stopPropagation(); openCarousel(noteImagePreviews, i); }}
                              className="h-8 w-8 object-cover rounded-lg border border-neutral-700 cursor-zoom-in" 
                            />
                          ))}
                          <span className="text-[11px] text-emerald-400 font-medium">{noteImagePreviews.length} imágenes listas para la nota</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); setNoteImageFiles([]); setNoteImagePreviews([]); }} 
                          className="text-neutral-400 hover:text-red-400 text-xs px-2 py-1"
                        >
                          Limpiar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 w-full justify-center">
                        <Upload size={13} className="text-blue-400" />
                        <span>Adjuntar imágenes en la nota (Arrastra, <strong>pega con Ctrl+V</strong> o haz clic)</span>
                      </div>
                    )}
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CARRUSEL DE IMÁGENES CON FLECHAS */}
      {carouselImages.length > 0 && (
        <div 
          className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setCarouselImages([])}
        >
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
            <span className="text-xs font-mono bg-neutral-900/80 border border-neutral-700 px-3 py-1.5 rounded-full text-neutral-300 shadow-xl">
              {carouselIndex + 1} / {carouselImages.length}
            </span>
            <button 
              onClick={() => setCarouselImages([])}
              className="text-neutral-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 p-2.5 rounded-full transition-colors z-10 border border-neutral-700 shadow-xl cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {carouselImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCarouselIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1)); }}
              className="absolute left-6 text-white bg-neutral-900/80 hover:bg-neutral-800 p-3 rounded-full transition-colors z-20 border border-neutral-700 shadow-xl cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div className="relative max-w-6xl max-h-[85vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={carouselImages[carouselIndex]} 
              alt={`Imagen ${carouselIndex + 1}`} 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-neutral-800" 
            />
          </div>

          {carouselImages.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCarouselIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1)); }}
              className="absolute right-6 text-white bg-neutral-900/80 hover:bg-neutral-800 p-3 rounded-full transition-colors z-20 border border-neutral-700 shadow-xl cursor-pointer"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}

    </div>
  );
}