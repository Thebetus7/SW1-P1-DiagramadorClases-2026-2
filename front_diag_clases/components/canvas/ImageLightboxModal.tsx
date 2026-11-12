"use client";

import React, { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, Download, RotateCcw } from "lucide-react";
import { resolveImageUrl } from "@/utils/imageUrlResolver";

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  altText?: string;
  onClose: () => void;
}

export function ImageLightboxModal({
  isOpen,
  imageUrl,
  altText = "Imagen adjunta de diagrama",
  onClose,
}: ImageLightboxModalProps) {
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Resetear nivel de zoom al abrir una nueva imagen o cerrar
  useEffect(() => {
    setScale(1);
  }, [imageUrl, isOpen]);

  if (!isOpen || !imageUrl) return null;

  const resolvedUrl = resolveImageUrl(imageUrl);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setScale(1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de imagen en alta resolución"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra superior con acciones */}
        <div className="w-full flex items-center justify-between pb-3 text-white">
          <span className="text-xs font-medium text-slate-300 truncate max-w-[320px]">
            {altText} {scale !== 1 && `(${Math.round(scale * 100)}%)`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
              title="Alejar (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Restablecer tamaño (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
              title="Acercar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <a
              href={resolvedUrl}
              download="diagrama-adjunto.jpg"
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
              title="Descargar imagen"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500/80 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenedor de la Imagen con auto-scroll si escala > 1 */}
        <div className="relative overflow-auto max-h-[80vh] max-w-full rounded-xl bg-slate-950/70 border border-white/10 shadow-2xl flex items-center justify-center p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedUrl}
            alt={altText}
            style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
            className="max-h-[75vh] max-w-full object-contain select-none transition-transform duration-150"
          />
        </div>
      </div>
    </div>
  );
}
