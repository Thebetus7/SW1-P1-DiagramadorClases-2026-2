"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { UmlAttribute, UmlClassData, UmlMethod, UmlVisibility } from "@/types";
import { normalizeAttribute, normalizeMethod } from "@/services/xmiExporter";

interface ClassEditModalProps {
  isOpen: boolean;
  nodeId: string | null;
  initialData: UmlClassData | null;
  onClose: () => void;
  onSave: (nodeId: string, updatedData: UmlClassData) => void;
  onDeleteNode?: (nodeId: string) => void;
}

const VISIBILITY_OPTIONS: { value: UmlVisibility; label: string }[] = [
  { value: "+", label: "+ (Público)" },
  { value: "-", label: "- (Privado)" },
  { value: "#", label: "# (Protegido)" },
  { value: "~", label: "~ (Paquete)" },
];

const COMMON_DATA_TYPES = ["string", "int", "boolean", "float", "date", "void", "any"];

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
  const [attributes, setAttributes] = useState<UmlAttribute[]>([]);
  const [methods, setMethods] = useState<UmlMethod[]>([]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setStereotype(initialData.stereotype || "");
      setAttributes(
        (initialData.attributes || []).map((attr) => normalizeAttribute(attr))
      );
      setMethods(
        (initialData.methods || []).map((m) => normalizeMethod(m))
      );
    }
  }, [initialData, isOpen]);

  if (!isOpen || !nodeId) return null;

  // Manejadores para Atributos
  const handleAddAttribute = () => {
    const newAttr: UmlAttribute = {
      id: `attr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      visibility: "-",
      name: `nuevoAtributo_${attributes.length + 1}`,
      type: "string",
    };
    setAttributes([...attributes, newAttr]);
  };

  const handleUpdateAttribute = (index: number, field: keyof UmlAttribute, val: string) => {
    const updated = [...attributes];
    updated[index] = { ...updated[index], [field]: val };
    setAttributes(updated);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, idx) => idx !== index));
  };

  // Manejadores para Métodos / Operaciones
  const handleAddMethod = () => {
    const newMethod: UmlMethod = {
      id: `meth-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      visibility: "+",
      name: `operacion_${methods.length + 1}`,
      parameters: "",
      returnType: "void",
    };
    setMethods([...methods, newMethod]);
  };

  const handleUpdateMethod = (index: number, field: keyof UmlMethod, val: string) => {
    const updated = [...methods];
    updated[index] = { ...updated[index], [field]: val };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white rounded-lg border border-slate-300 shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-lg">
          <div>
            <h3 className="text-base font-bold text-slate-900">Editar Clase UML 2.5</h3>
            <p className="text-xs text-slate-500">Configura nombre, estereotipo, atributos y operaciones estructuradas</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
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
                placeholder="Ej. Usuario, Pedido, Producto"
                className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded focus:outline-none focus:border-slate-800"
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
                placeholder="interface, abstract, entity"
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* Atributos Estructurados */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Atributos ({attributes.length})
                </label>
                <p className="text-[11px] text-slate-400">Visibilidad, nombre y tipo de dato estructurado</p>
              </div>
              <button
                type="button"
                onClick={handleAddAttribute}
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Atributo
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {attributes.map((attr, idx) => (
                <div key={attr.id || idx} className="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded border border-slate-200">
                  {/* Visibilidad */}
                  <select
                    value={attr.visibility}
                    onChange={(e) => handleUpdateAttribute(idx, "visibility", e.target.value)}
                    className="w-24 px-2 py-1 text-xs font-mono font-semibold border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800"
                  >
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Nombre */}
                  <input
                    type="text"
                    value={attr.name}
                    placeholder="nombreAtributo"
                    onChange={(e) => handleUpdateAttribute(idx, "name", e.target.value)}
                    className="flex-1 min-w-[100px] px-2.5 py-1 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800"
                  />

                  <span className="text-slate-400 font-mono font-bold">:</span>

                  {/* Tipo de dato */}
                  <input
                    type="text"
                    list={`types-list-attr-${idx}`}
                    value={attr.type}
                    placeholder="tipo (string, int...)"
                    onChange={(e) => handleUpdateAttribute(idx, "type", e.target.value)}
                    className="w-28 px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800"
                  />
                  <datalist id={`types-list-attr-${idx}`}>
                    {COMMON_DATA_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    title="Eliminar atributo"
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {attributes.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                  Sin atributos definidos. Haz clic en "Añadir Atributo".
                </p>
              )}
            </div>
          </div>

          {/* Operaciones / Métodos Estructurados */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Operaciones / Métodos ({methods.length})
                </label>
                <p className="text-[11px] text-slate-400">Visibilidad, nombre, parámetros y tipo de retorno</p>
              </div>
              <button
                type="button"
                onClick={handleAddMethod}
                className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-medium px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir Método
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {methods.map((method, idx) => (
                <div key={method.id || idx} className="flex items-center gap-1.5 bg-slate-50/50 p-1.5 rounded border border-slate-200">
                  {/* Visibilidad */}
                  <select
                    value={method.visibility}
                    onChange={(e) => handleUpdateMethod(idx, "visibility", e.target.value)}
                    className="w-24 px-2 py-1 text-xs font-mono font-semibold border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800 shrink-0"
                  >
                    {VISIBILITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Nombre */}
                  <input
                    type="text"
                    value={method.name}
                    placeholder="nombreMetodo"
                    onChange={(e) => handleUpdateMethod(idx, "name", e.target.value)}
                    className="flex-1 min-w-[90px] px-2.5 py-1 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800"
                  />

                  {/* Parámetros entre paréntesis */}
                  <div className="flex items-center gap-0.5">
                    <span className="text-slate-500 font-mono text-xs">(</span>
                    <input
                      type="text"
                      value={method.parameters || ""}
                      placeholder="arg1: int, arg2: string"
                      onChange={(e) => handleUpdateMethod(idx, "parameters", e.target.value)}
                      className="w-32 px-1.5 py-1 text-[11px] font-mono border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800"
                    />
                    <span className="text-slate-500 font-mono text-xs">)</span>
                  </div>

                  <span className="text-slate-400 font-mono font-bold">:</span>

                  {/* Retorno */}
                  <input
                    type="text"
                    list={`types-list-meth-${idx}`}
                    value={method.returnType}
                    placeholder="void"
                    onChange={(e) => handleUpdateMethod(idx, "returnType", e.target.value)}
                    className="w-20 px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800 shrink-0"
                  />
                  <datalist id={`types-list-meth-${idx}`}>
                    {COMMON_DATA_TYPES.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>

                  {/* Eliminar */}
                  <button
                    type="button"
                    onClick={() => handleRemoveMethod(idx)}
                    title="Eliminar método"
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {methods.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                  Sin operaciones definidas. Haz clic en "Añadir Método".
                </p>
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
              className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors shadow-xs"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
