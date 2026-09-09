import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageCarousel({ images, initialIndex, onClose }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sincronizar el índice inicial
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!images || images.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div 
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
        <span className="text-xs font-mono bg-neutral-900/80 border border-neutral-700 px-3 py-1.5 rounded-full text-neutral-300 shadow-xl">
          {currentIndex + 1} / {images.length}
        </span>
        <button 
          onClick={onClose}
          className="text-neutral-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 p-2.5 rounded-full transition-colors z-10 border border-neutral-700 shadow-xl cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {images.length > 1 && (
        <button
          onClick={handlePrev}
          className="absolute left-6 text-white bg-neutral-900/80 hover:bg-neutral-800 p-3 rounded-full transition-colors z-20 border border-neutral-700 shadow-xl cursor-pointer"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      <div className="relative max-w-6xl max-h-[85vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img 
          src={images[currentIndex]} 
          alt={`Imagen ${currentIndex + 1}`} 
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-neutral-800" 
        />
      </div>

      {images.length > 1 && (
        <button
          onClick={handleNext}
          className="absolute right-6 text-white bg-neutral-900/80 hover:bg-neutral-800 p-3 rounded-full transition-colors z-20 border border-neutral-700 shadow-xl cursor-pointer"
        >
          <ChevronRight size={24} />
        </button>
      )}
    </div>
  );
}