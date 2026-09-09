import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  // Cambia el color y texto del botón según si es acción de borrar o no
  const isDeleteAction = title.toLowerCase().includes('eliminar');

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <AlertCircle className={isDeleteAction ? "text-red-500" : "text-blue-500"} size={20} /> 
          {title}
        </h3>
        <p className="text-sm text-neutral-400 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end pt-3 border-t border-neutral-800/80">
          <button 
            onClick={onCancel} 
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onCancel(); // Esto asegura que se cierre la alerta al confirmar
            }} 
            className={`px-4 py-2.5 rounded-xl text-xs font-medium text-white transition-colors shadow-lg ${
              isDeleteAction ? 'bg-red-600/90 hover:bg-red-500 shadow-red-600/20' : 'bg-blue-600/90 hover:bg-blue-500 shadow-blue-600/20'
            }`}
          >
            {isDeleteAction ? 'Sí, eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}