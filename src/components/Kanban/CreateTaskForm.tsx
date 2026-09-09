import React, { useState, useRef, useEffect } from 'react';
import { Plus, Upload, Smile } from 'lucide-react';
import { TaskType, TaskPriority } from '@/store/useTaskStore';
import { compressImage } from '@/lib/compressImage';
import { toast } from 'sonner';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface CreateTaskFormProps {
  devParam: string | null;
  userIdParam: string | null;
  onSuccess: (newTaskDB: any) => void;
}

export default function CreateTaskForm({ devParam, userIdParam, onSuccess }: CreateTaskFormProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('feature');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  
  const [taskImageFiles, setTaskImageFiles] = useState<File[]>([]);
  const [taskImagePreviews, setTaskImagePreviews] = useState<string[]>([]);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Cerrar picker de emojis al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiObject: any) => {
    setNewTaskTitle(prev => prev + emojiObject.emoji);
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    try {
      const compressedFiles = await Promise.all(validFiles.map(file => compressImage(file)));
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));

      setTaskImageFiles(prev => [...prev, ...compressedFiles]);
      setTaskImagePreviews(prev => [...prev, ...newPreviews]);
    } catch (err) {
      toast.error("Error optimizando imágenes");
    }
  };

  const uploadImagesToBlob = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Error al subir las imágenes');
    const data = await res.json();
    return data.urls;
  };

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      if (userIdParam) payload.targetUserId = userIdParam;

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newTaskDB = await res.json();
        onSuccess(newTaskDB);
        setNewTaskTitle('');
        setTaskImageFiles([]);
        setTaskImagePreviews([]);
        setShowEmojiPicker(false);
        toast.success("Tarea creada exitosamente");
      }
    } catch (error) {
      toast.error("Error creando tarea");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  return (
    <form onSubmit={handleAddTask} className="lg:col-span-8 flex flex-col gap-2 bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/80 relative">
      <div className="flex flex-col sm:flex-row gap-2 items-start">
        
        {/* TEXTAREA Y BOTÓN DE EMOJI */}
        <div className="relative flex-1 w-full bg-neutral-950/50 border border-neutral-800 rounded-xl flex items-start focus-within:border-blue-500/50 transition-colors">
          <textarea
            rows={1}
            placeholder={devParam ? `Crear tarea para ${devParam}...` : "¿Qué tarea nueva hay que hacer? (Usa ``` para código)"}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              // Enviar con Enter, salto de línea con Shift+Enter
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddTask();
              }
            }}
            onPaste={(e) => {
              const files = e.clipboardData.files;
              if (files && files.length > 0) handleFilesSelected(files);
            }}
            className="bg-transparent px-4 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none flex-1 resize-y min-h-[40px] max-h-[200px]"
          />
          <button 
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 text-neutral-500 hover:text-amber-400 transition-colors"
          >
            <Smile size={18}/>
          </button>
        </div>

        {/* SELECTOR DE EMOJIS (FLOTANTE) */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute z-50 top-14 right-4 sm:right-auto sm:left-4 shadow-2xl">
            <EmojiPicker autoFocusSearch={false} onEmojiClick={onEmojiClick} theme={Theme.DARK}/>
          </div>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select value={newTaskType} onChange={(e) => setNewTaskType(e.target.value as TaskType)} className="h-[42px] bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 text-xs text-neutral-300 focus:outline-none cursor-pointer">
            <option value="feature">Script</option><option value="bug">Bug</option><option value="tweak">Mod</option><option value="optimization">Optimización</option><option value="research">Investigación</option>
          </select>

          <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)} className="h-[42px] bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 text-xs text-neutral-300 focus:outline-none cursor-pointer">
            <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítico</option>
          </select>

          <button type="submit" disabled={isSubmittingTask} className="h-[42px] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 rounded-xl transition-all font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/20 shrink-0">
            <Plus size={15}/> {isSubmittingTask ? '...' : 'Crear'}
          </button>
        </div>
      </div>

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files); }}
        className="border border-dashed border-neutral-800 hover:border-blue-500/40 rounded-xl px-3 py-2 text-center cursor-pointer bg-neutral-950/40 transition-colors flex flex-col gap-2"
        onClick={() => document.getElementById('task-file-input')?.click()}
      >
        <input id="task-file-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFilesSelected(e.target.files); }} />
        
        {taskImagePreviews.length > 0 ? (
          <div className="flex items-center justify-between gap-2 w-full flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {taskImagePreviews.map((preview, i) => (
                <img key={i} src={preview} alt="Preview" className="h-9 w-9 object-cover rounded-lg border border-neutral-700" />
              ))}
              <span className="text-[11px] text-emerald-400 font-medium">{taskImagePreviews.length} imágenes listas</span>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); setTaskImageFiles([]); setTaskImagePreviews([]); }} className="text-neutral-400 hover:text-red-400 text-xs px-2 py-1">Limpiar todo</button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 w-full justify-center">
            <Upload className="text-blue-400" size={13}/>
            <span>Adjuntar imágenes (Puedes seleccionar varias, arrastrar o hacer clic)</span>
          </div>
        )}
      </div>
    </form>
  );
}