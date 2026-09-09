import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Trash2, MessageSquare, Maximize2, SlidersHorizontal, Clock, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { Task, TaskType, TaskPriority } from '@/store/useTaskStore';

interface TaskCardProps {
  task: Task;
  index: number;
  colId: string;
  isDragDisabled: boolean;
  session: any;
  typeConfig: Record<TaskType, { label: string; color: string; icon: React.ElementType }>;
  priorityConfig: Record<TaskPriority, { label: string; class: string }>;
  openCardMenuId: string | null;
  setOpenCardMenuId: (id: string | null) => void;
  onOpenModal: (task: Task) => void;
  onDelete: (colId: string, taskId: string, e?: React.MouseEvent) => void;
  onQuickUpdate: (taskId: string, updates: any, e?: React.MouseEvent) => void;
  onOpenCarousel: (images: string[], index: number) => void;
}

export default function TaskCard({
  task, index, colId, isDragDisabled, session, typeConfig, priorityConfig,
  openCardMenuId, setOpenCardMenuId, onOpenModal, onDelete, onQuickUpdate, onOpenCarousel
}: TaskCardProps) {
  
  const typeData = typeConfig[task.type];
  const TypeIcon = typeData.icon;
  const priorityData = priorityConfig[task.priority];

  // FUNCIÓN PARA RENDERIZAR LINKS EN EL TÍTULO
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:underline break-all"
            onClick={(e) => e.stopPropagation()} // Evita que se abra el modal de la tarea al hacer clic en el link
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  const renderWhatsAppGrid = (images: string[]) => {
    if (!images || images.length === 0) return null;

    if (images.length === 1) {
      return (
        <div onClick={(e) => { e.stopPropagation(); onOpenCarousel(images, 0); }} className="mt-3 overflow-hidden rounded-lg border border-neutral-800 max-h-36 bg-neutral-950 relative group/img cursor-zoom-in">
          <img loading="lazy" src={images[0]} alt="Attachment" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
            <Maximize2 className="text-white" size={15} />
            <span className="text-[11px] font-medium text-white">Ampliar</span>
          </div>
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="mt-3 grid grid-cols-2 gap-1.5 max-h-32 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
          {images.map((url, i) => (
            <div key={i} onClick={(e) => { e.stopPropagation(); onOpenCarousel(images, i); }} className="relative group/img cursor-zoom-in h-24 overflow-hidden">
              <img loading="lazy" src={url} alt={`Attachment ${i}`} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="text-white" size={14} />
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
            <div key={i} onClick={(e) => { e.stopPropagation(); onOpenCarousel(images, i); }} className="relative group/img cursor-zoom-in h-24 overflow-hidden">
              <img loading="lazy" src={url} alt={`Attachment ${i}`} className={`w-full h-full object-cover group-hover/img:scale-105 transition-transform ${isLast && remainingCount > 0 ? 'filter blur-[3px]' : ''}`} />
              {isLast && remainingCount > 0 ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-base tracking-wider">+{remainingCount}</span>
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="text-white" size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Draggable draggableId={task._id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpenModal(task)}
          className={`p-4 rounded-xl bg-neutral-900/90 select-none group transition-colors duration-200 border relative cursor-pointer ${
            snapshot.isDragging ? 'shadow-2xl shadow-blue-500/20 border-blue-500/50 z-50' : `border-neutral-800/80 hover:border-neutral-700 ${priorityData.class}`
          }`}
        >
          <div className="flex justify-between items-start gap-3">
            <p className="text-sm font-medium text-neutral-100 leading-relaxed pr-6 break-words">
              {renderTextWithLinks(task.title)}
            </p>
            
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenCardMenuId(openCardMenuId === task._id ? null : task._id);
                  }}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 transition-colors"
                  title="Opciones rápidas"
                >
                  <SlidersHorizontal size={13} />
                </button>

                {openCardMenuId === task._id && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-7 w-48 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-40 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-neutral-500 px-2 block mb-1">Mover a columna</span>
                      <div className="space-y-0.5">
                        {colId !== 'todo' && <button onClick={(e) => onQuickUpdate(task._id, { status: 'todo' }, e)} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-800 text-amber-400 flex items-center gap-1.5"><Clock size={12} /> Por Hacer</button>}
                        {colId !== 'inProgress' && <button onClick={(e) => onQuickUpdate(task._id, { status: 'inProgress' }, e)} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-800 text-blue-400 flex items-center gap-1.5"><Layers size={12} /> En Progreso</button>}
                        {colId !== 'done' && <button onClick={(e) => onQuickUpdate(task._id, { status: 'done' }, e)} className="w-full text-left px-2 py-1 rounded hover:bg-neutral-800 text-emerald-400 flex items-center gap-1.5"><CheckCircle2 size={12} /> Listas</button>}
                      </div>
                    </div>
                    <div className="border-t border-neutral-800 pt-1.5">
                      <span className="text-[10px] uppercase font-mono text-neutral-500 px-2 block mb-1">Cambiar prioridad</span>
                      <div className="grid grid-cols-2 gap-1">
                        <button onClick={(e) => onQuickUpdate(task._id, { priority: 'low' }, e)} className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-center text-[10px] text-neutral-400">Baja</button>
                        <button onClick={(e) => onQuickUpdate(task._id, { priority: 'medium' }, e)} className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-center text-[10px] text-neutral-300">Media</button>
                        <button onClick={(e) => onQuickUpdate(task._id, { priority: 'high' }, e)} className="px-2 py-1 rounded bg-orange-500/10 hover:bg-orange-500/20 text-center text-[10px] text-orange-400">Alta</button>
                        <button onClick={(e) => onQuickUpdate(task._id, { priority: 'critical' }, e)} className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-center text-[10px] font-bold text-red-400 flex items-center justify-center gap-0.5"><AlertCircle size={10} /> Crítico</button>
                      </div>
                    </div>
                    {session?.user?.role === 'admin' && (
                      <div className="border-t border-neutral-800 pt-1.5">
                        <button onClick={(e) => onDelete(colId, task._id, e)} className="w-full text-left px-2 py-1 rounded hover:bg-red-500/10 text-red-400 flex items-center gap-1.5"><Trash2 size={12} /> Eliminar tarea</button>
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
}