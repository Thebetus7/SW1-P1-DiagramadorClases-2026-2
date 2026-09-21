"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, StickyNote, Check } from "lucide-react";
import { UmlNoteData } from "@/types";

interface NoteEditModalProps {
  isOpen: boolean;
  nodeId: string | null;
  initialData: UmlNoteData | null;
  onClose: () => void;
  onSave: (nodeId: string, content: string) => void;
  onDeleteNode?: (nodeId: string) => void;
}

export function NoteEditModal({
  isOpen,
  nodeId,
  initialData,
  onClose,
  onSave,
  onDeleteNode,
}: NoteEditModalProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (initialData && isOpen) {
      setContent(initialData.content || "");
    }
  }, [initialData, isOpen]);

  if (!isOpen || !nodeId) return null;

  const handleSave = () => {
    onSave(nodeId, content.trim() || "Nota explicativa");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Guardar con Ctrl + Enter o Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col transition-all">
        {/* Encabezado del modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50/80 border-b border-amber-200/60">
          <div className="flex items-center gap-2 text-amber-900">
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Editar Nota UML</h2>
              <p className="text-[11px] text-amber-800/80">Comentario o regla de negocio para el diagrama</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo del modal con Textarea */}
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contenido de la Nota
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              placeholder="Escribe la explicación, regla de negocio o comentario aquí..."
              className="w-full text-xs font-sans p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all resize-y min-h-[100px] text-slate-800 bg-amber-50/20"
              autoFocus
            />
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
              <span>Presiona <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-600">Ctrl + Enter</kbd> para guardar</span>
              <span>{content.length} caracteres</span>
            </div>
          </div>
        </div>

        {/* Pie del modal con acciones */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200">
          {onDeleteNode ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("¿Estás seguro de eliminar esta nota UML?")) {
                  onDeleteNode(nodeId);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
