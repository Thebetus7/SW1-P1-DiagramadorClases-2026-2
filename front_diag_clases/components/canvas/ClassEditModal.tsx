"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { UmlClassData } from "@/types";

interface ClassEditModalProps {
  isOpen: boolean;
  nodeId: string | null;
  initialData: UmlClassData | null;
  onClose: () => void;
  onSave: (nodeId: string, updatedData: UmlClassData) => void;
  onDeleteNode?: (nodeId: string) => void;
}

export function ClassEditModal({
  isOpen,
  nodeId,
  initialData,
  onClose,
  onSave,
  onDeleteNode,
}: ClassEditModalProps) {
  const [name, setName] = useState("");
  const [stereotype, setStereotype] = useState("");
  const [attributes, setAttributes] = useState<string[]>([]);
  const [methods, setMethods] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setStereotype(initialData.stereotype || "");
      setAttributes(initialData.attributes ? [...initialData.attributes] : []);
      setMethods(initialData.methods ? [...initialData.methods] : []);
    }
  }, [initialData, isOpen]);

  if (!isOpen || !nodeId) return null;

  const handleAddAttribute = () => {
    setAttributes([...attributes, "- nuevoAtributo: tipo"]);
  };

  const handleUpdateAttribute = (index: number, val: string) => {
    const updated = [...attributes];
    updated[index] = val;
    setAttributes(updated);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, idx) => idx !== index));
  };

  const handleAddMethod = () => {
    setMethods([...methods, "+ nuevaOperacion(): void"]);
  };

  const handleUpdateMethod = (index: number, val: string) => {
    const updated = [...methods];
    updated[index] = val;
    setMethods(updated);
  };

  const handleRemoveMethod = (index: number) => {
    setMethods(methods.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    onSave(nodeId, {
      name: name.trim() || "ClaseSinNombre",
      stereotype: stereotype.trim(),
      attributes,
      methods,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-lg">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Editar Clase UML</h3>
            <p className="text-xs text-slate-500">Configura nombre, atributos y operaciones</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* General Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la Clase
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Usuario, Pedido, Cliente"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estereotipo (Opcional)
              </label>
              <input
                type="text"
                value={stereotype}
                onChange={(e) => setStereotype(e.target.value)}
                placeholder="interface, entity"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* Atributos */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Atributos ({attributes.length})
              </label>
              <button
                type="button"
                onClick={handleAddAttribute}
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Atributo
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={attr}
                    onChange={(e) => handleUpdateAttribute(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {attributes.length === 0 && (
                <p className="text-xs text-slate-400 italic py-1">Sin atributos definidos.</p>
              )}
            </div>
          </div>

          {/* Operaciones / Métodos */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Operaciones / Métodos ({methods.length})
              </label>
              <button
                type="button"
                onClick={handleAddMethod}
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Método
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {methods.map((method, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={method}
                    onChange={(e) => handleUpdateMethod(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded focus:outline-none focus:border-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMethod(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {methods.length === 0 && (
                <p className="text-xs text-slate-400 italic py-1">Sin operaciones definidas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-lg">
          {onDeleteNode ? (
            <button
              type="button"
              onClick={() => {
                onDeleteNode(nodeId);
                onClose();
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50"
            >
              Eliminar Clase
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded border border-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
