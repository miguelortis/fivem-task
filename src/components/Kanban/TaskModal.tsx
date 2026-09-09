import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskType, TaskPriority } from '@/store/useTaskStore';
import { X, Trash2, ImagePlus, Upload, Shield, Edit3, Send, MessageSquare, Smile } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { compressImage } from '@/lib/compressImage';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface TaskModalProps {
  task: Task;
  session: any;
  systemUsers: any[];
  typeConfig: Record<TaskType, { label: string; color: string; icon: React.ElementType }>;
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onOpenCarousel: (images: string[], index: number) => void;
  onRemoveTaskImage: (taskId: string, imgUrl: string) => void;
  onRemoveNoteImage: (taskId: string, noteId: string, imgUrl: string) => void;
  onDeleteNote: (taskId: string, noteId: string) => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export default function TaskModal({
  task, session, systemUsers, typeConfig, onClose, onTaskUpdated,
  onOpenCarousel, onRemoveTaskImage, onRemoveNoteImage, onDeleteNote, onShowConfirm
}: TaskModalProps) {
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editType, setEditType] = useState<TaskType>(task.type);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [transferTargetId, setTransferTargetId] = useState('');

  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [extraPreviews, setExtraPreviews] = useState<string[]>([]);
  const [isSubmittingExtra, setIsSubmittingExtra] = useState(false);

  const [newNoteText, setNewNoteText] = useState('');
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [notePreviews, setNotePreviews] = useState<string[]>([]);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

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
    setNewNoteText(prev => prev + emojiObject.emoji);
  };

  const uploadImagesToBlob = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Error al subir las imágenes');
    const data = await res.json();
    return data.urls;
  };

  const handleFilesSelected = async (files: FileList | File[], target: 'note' | 'extra') => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    try {
      const compressedFiles = await Promise.all(validFiles.map(f => compressImage(f)));
      const newPreviews = compressedFiles.map(f => URL.createObjectURL(f));

      if (target === 'note') {
        setNoteFiles(prev => [...prev, ...compressedFiles]);
        setNotePreviews(prev => [...prev, ...newPreviews]);
      } else {
        setExtraFiles(prev => [...prev, ...compressedFiles]);
        setExtraPreviews(prev => [...prev, ...newPreviews]);
      }
    } catch (err) {
      toast.error("Error optimizando imágenes");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, type: editType, priority: editPriority }),
      });
      if (res.ok) {
        const updated = await res.json();
        onTaskUpdated(updated);
        setIsEditing(false);
        toast.success("Cambios guardados");
      }
    } catch (error) {
      toast.error("Error editando tarea");
    }
  };

  const handleTransferTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTargetId) return;

    onShowConfirm(
      'Transferir Tarea',
      '¿Estás seguro de transferir la responsabilidad de esta tarea a otro usuario?',
      async () => {
        try {
          const res = await fetch(`/api/tasks/${task._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignedTo: transferTargetId }),
          });
          if (res.ok) {
            const updated = await res.json();
            onTaskUpdated(updated);
            setTransferTargetId('');
            toast.success("Tarea transferida exitosamente");
          }
        } catch (error) {
          toast.error("Error transfiriendo tarea");
        }
      }
    );
  };

  const handleUploadExtraImages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (extraFiles.length === 0) return;
    try {
      setIsSubmittingExtra(true);
      const uploadedUrls = await uploadImagesToBlob(extraFiles);
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newImages: uploadedUrls }),
      });
      if (res.ok) {
        const updated = await res.json();
        onTaskUpdated(updated);
        setExtraFiles([]);
        setExtraPreviews([]);
        toast.success("Imágenes guardadas");
      }
    } catch (error) {
      toast.error("Error subiendo imágenes");
    } finally {
      setIsSubmittingExtra(false);
    }
  };

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim() && noteFiles.length === 0) return;

    try {
      setIsSubmittingNote(true);
      let uploadedUrls: string[] = [];
      if (noteFiles.length > 0) {
        uploadedUrls = await uploadImagesToBlob(noteFiles);
      }

      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newNote: newNoteText || 'Imágenes adjuntas', noteImages: uploadedUrls }),
      });

      if (res.ok) {
        const updated = await res.json();
        onTaskUpdated(updated);
        setNewNoteText('');
        setNoteFiles([]);
        setNotePreviews([]);
        setShowEmojiPicker(false);
        toast.success("Nota añadida");
      }
    } catch (error) {
      toast.error("Error al enviar la nota");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER MODAL */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {typeConfig[task.type]?.label || 'Tarea'}
            </span>
            <span className="text-xs text-neutral-400">
              Asignado a: <strong className="text-blue-300">@{typeof task.assignedTo === 'object' ? task.assignedTo?.name : 'Desconocido'}</strong>
            </span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
            <X size={18} />
          </button>
        </div>

        {/* CONTENIDO MODAL */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* GALERÍA DE IMÁGENES PRINCIPALES */}
          {task.images && task.images.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium">Imágenes adjuntas a la tarea:</span>
              <div className="grid grid-cols-3 gap-2">
                {task.images.map((imgUrl: string, idx: number) => (
                  <div key={idx} className="relative group/modalimg rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 h-28">
                    <img loading="lazy" src={imgUrl} alt="Referencia" onClick={() => onOpenCarousel(task.images || [], idx)} className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform" />
                    <button onClick={() => onRemoveTaskImage(task._id, imgUrl)} className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover/modalimg:opacity-100 transition-opacity shadow-lg">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ZONA PARA AÑADIR MÁS FOTOS A LA TAREA */}
          <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800 space-y-2">
            <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1.5">
              <ImagePlus className="text-blue-400" size={14} /> Agregar más fotos a esta tarea:
            </span>
            <div 
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files, 'extra'); }}
              onPaste={(e) => { const files = e.clipboardData.files; if (files && files.length > 0) handleFilesSelected(files, 'extra'); }}
              className="border border-dashed border-neutral-800 hover:border-blue-500/40 rounded-xl px-3 py-2 text-center cursor-pointer bg-neutral-900/60 transition-colors flex flex-col gap-2"
              onClick={() => document.getElementById('extra-task-file-input')?.click()}
            >
              <input id="extra-task-file-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFilesSelected(e.target.files, 'extra'); }} />
              {extraPreviews.length > 0 ? (
                <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {extraPreviews.map((preview, i) => (<img key={i} src={preview} alt="Preview" className="h-8 w-8 object-cover rounded-md border border-neutral-700" />))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={isSubmittingExtra} onClick={async (e) => { e.stopPropagation(); await handleUploadExtraImages(e); }} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-1 rounded-lg">
                      {isSubmittingExtra ? 'Subiendo...' : 'Subir fotos'}
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setExtraFiles([]); setExtraPreviews([]); }} className="text-neutral-400 hover:text-red-400 text-xs px-2 py-1">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-neutral-400 justify-center">
                  <Upload className="text-blue-400" size={12} /> <span>Arrastra, <strong>pega (Ctrl+V)</strong> o haz clic para añadir más fotos</span>
                </div>
              )}
            </div>
          </div>

          {/* PANELES DE ADMIN */}
          {session?.user?.role === 'admin' && (
            <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-purple-400 flex items-center gap-1">
                  <Shield size={13} /> Controles de Administrador
                </span>
                <button onClick={() => setIsEditing(!isEditing)} className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1">
                  <Edit3 size={12} /> {isEditing ? 'Cancelar Edición' : 'Editar Tarea'}
                </button>
              </div>

              {isEditing && (
                <form onSubmit={handleSaveEdit} className="space-y-3 pt-3 border-t border-neutral-800">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Descripción de la Tarea</label>
                    <textarea 
                      rows={4}
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Tipo</label>
                      <select value={editType} onChange={(e) => setEditType(e.target.value as TaskType)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                        <option value="feature">Script</option><option value="bug">Bug</option><option value="tweak">Mod</option><option value="optimization">Optimización</option><option value="research">Investigación</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-neutral-400 block mb-1">Prioridad</label>
                      <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TaskPriority)} className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                        <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítico</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors">Guardar Cambios</button>
                </form>
              )}

              <div className="pt-3 border-t border-neutral-800">
                <span className="text-[11px] text-neutral-400 block mb-2 font-medium">Transferir Tarea a otro Desarrollador</span>
                <form onSubmit={handleTransferTask} className="flex gap-2">
                  <select value={transferTargetId} onChange={(e) => setTransferTargetId(e.target.value)} className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="">Seleccionar desarrollador...</option>
                    {systemUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                  <button type="submit" disabled={!transferTargetId} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors">Transferir</button>
                </form>
              </div>
            </div>
          )}

          {/* TÍTULO RENDERIZADO CON MARKDOWN (SOPORTA CÓDIGO) */}
          {!isEditing && (
            <div>
              <div className="text-xl font-bold text-white mb-2 break-words">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      return !inline ? (
                        <pre className="bg-[#0d0d0d] border border-neutral-800 p-3 rounded-lg overflow-x-auto my-2 text-sm font-mono text-neutral-300 font-normal">
                          <code {...props}>{children}</code>
                        </pre>
                      ) : (
                        <code className="bg-neutral-800 text-blue-300 px-1.5 py-0.5 rounded-md text-[13px] font-mono font-normal" {...props}>
                          {children}
                        </code>
                      )
                    },
                    a({node, ...props}: any) {
                      return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all" onClick={(e) => e.stopPropagation()} />
                    },
                    p({node, ...props}: any) {
                      return <p {...props} className="mb-2 last:mb-0" />
                    }
                  }}
                >
                  {task.title}
                </ReactMarkdown>
              </div>
              <div className="flex gap-2 text-xs text-neutral-400">
                <span>Prioridad: <strong className="text-neutral-200 capitalize">{task.priority}</strong></span>
                <span>•</span>
                <span>Estado: <strong className="text-neutral-200 capitalize">{task.status}</strong></span>
              </div>
            </div>
          )}

          {/* BITÁCORA Y NOTAS */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-300 flex items-center gap-2">
              <MessageSquare className="text-blue-400" size={16} /> Notas y Bitácora de Actividad
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {task.notes && task.notes.length > 0 ? (
                task.notes.map((note: any, idx: number) => {
                  const noteAuthorId = typeof note.author === 'object' ? note.author?._id : note.author;
                  const canDeleteNote = session?.user?.role === 'admin' || noteAuthorId === session?.user?.id;

                  return (
                    <div key={note._id || idx} className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800/80 space-y-2 relative group">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-blue-400">@{typeof note.author === 'object' ? note.author?.name : 'Desarrollador'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-500">{new Date(note.createdAt).toLocaleString()}</span>
                          {canDeleteNote && (
                            <button onClick={() => onDeleteNote(task._id, note._id)} className="text-neutral-500 hover:text-red-400 transition-colors p-0.5">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-neutral-300 whitespace-pre-wrap break-words">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code({node, inline, className, children, ...props}: any) {
                              return !inline ? (
                                <pre className="bg-[#0d0d0d] border border-neutral-800 p-3 rounded-lg overflow-x-auto my-2 text-xs font-mono text-neutral-300">
                                  <code {...props}>{children}</code>
                                </pre>
                              ) : (
                                <code className="bg-neutral-800 text-blue-300 px-1.5 py-0.5 rounded-md text-[11px] font-mono" {...props}>
                                  {children}
                                </code>
                              )
                            },
                            a({node, ...props}: any) {
                              return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all" onClick={(e) => e.stopPropagation()} />
                            }
                          }}
                        >
                          {note.text}
                        </ReactMarkdown>
                      </div>

                      {note.images && note.images.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {note.images.map((imgUrl: string, imgIdx: number) => (
                            <div key={imgIdx} className="relative group/noteimg rounded-lg overflow-hidden border border-neutral-800 h-24 bg-neutral-900">
                              <img loading="lazy" src={imgUrl} alt="Nota adjunta" onClick={() => onOpenCarousel(note.images, imgIdx)} className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform" />
                              <button onClick={() => onRemoveNoteImage(task._id, note._id, imgUrl)} className="absolute top-1.5 right-1.5 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded-md opacity-0 group-hover/noteimg:opacity-100 transition-opacity shadow-lg">
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

            <form onSubmit={handleAddNote} className="flex flex-col gap-2 pt-2 relative">
              <div className="flex gap-2 relative">
                
                <div className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl flex items-start focus-within:border-blue-500/50 transition-colors">
                  <textarea
                    rows={1}
                    placeholder="Escribe una nota o usa ``` para código..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddNote();
                      }
                    }}
                    onPaste={(e) => { const files = e.clipboardData.files; if (files && files.length > 0) handleFilesSelected(files, 'note'); }}
                    className="bg-transparent px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none flex-1 resize-y min-h-[40px] max-h-[150px]"
                  />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(!showEmojiPicker); }}
                    className="p-2.5 text-neutral-500 hover:text-amber-400 transition-colors"
                  >
                    <Smile size="{18}"/>
                  </button>
                </div>

                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute z-50 bottom-14 right-0 shadow-2xl">
                    <EmojiPicker autoFocusSearch={false} onEmojiClick={onEmojiClick} theme={Theme.DARK}/>
                  </div>
                )}

                <button type="submit" disabled={isSubmittingNote} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 rounded-xl transition-colors flex items-center gap-1.5 text-sm font-medium">
                  <Send size="{15}"/> {isSubmittingNote ? '...' : 'Enviar'}
                </button>
              </div>

              <div 
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files, 'note'); }}
                onPaste={(e) => { const files = e.clipboardData.files; if (files && files.length > 0) handleFilesSelected(files, 'note'); }}
                className="border border-dashed border-neutral-800 hover:border-blue-500/40 rounded-xl px-3 py-2 text-center cursor-pointer bg-neutral-950/40 transition-colors flex flex-col gap-2"
                onClick={() => document.getElementById('note-file-input')?.click()}
              >
                <input id="note-file-input" type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleFilesSelected(e.target.files, 'note'); }} />
                {notePreviews.length > 0 ? (
                  <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {notePreviews.map((preview, i) => (<img key={i} src={preview} alt="Preview" className="h-8 w-8 object-cover rounded-lg border border-neutral-700" />))}
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setNoteFiles([]); setNotePreviews([]); }} className="text-neutral-400 hover:text-red-400 text-xs px-2 py-1">Limpiar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-neutral-400 justify-center">
                    <Upload className="text-blue-400" size="{13}"/> <span>Adjuntar imágenes en la nota (Arrastra o <strong>pega con Ctrl+V</strong>)</span>
                  </div>
                )}
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}