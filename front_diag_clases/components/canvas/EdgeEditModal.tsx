"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { UmlEdgeData, UmlRelationType } from "@/types";

interface EdgeEditModalProps {
  isOpen: boolean;
  edgeId: string | null;
  initialData: UmlEdgeData | null;
  sourceClassName?: string;
  targetClassName?: string;
  onClose: () => void;
  onSave: (edgeId: string, updatedData: UmlEdgeData) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

const MULTIPLICITY_PRESETS = ["1", "0..1", "*", "0..*", "1..*", "n..m"];

const COMMON_VERBS = [
  "contiene",
  "actualiza",
  "es",
  "depende",
  "administra",
  "pertenece a",
  "genera",
  "posee",
];

const RELATION_TYPES: { value: UmlRelationType; label: string; symbol: string }[] = [
  { value: "ASSOCIATION", label: "Asociación Simple", symbol: "─────" },
  { value: "DIRECTED_ASSOCIATION", label: "Asociación Dirigida", symbol: "────►" },
  { value: "GENERALIZATION", label: "Generalización / Herencia", symbol: "────▷" },
  { value: "REALIZATION", label: "Realización / Implementación", symbol: "- - ▷" },
  { value: "AGGREGATION", label: "Agregación (Todo-Parte débil)", symbol: "◇────" },
  { value: "COMPOSITION", label: "Composición (Todo-Parte fuerte)", symbol: "◆────" },
  { value: "DEPENDENCY", label: "Dependencia", symbol: "- - ►" },
];

export function EdgeEditModal({
  isOpen,
  edgeId,
  initialData,
  sourceClassName = "Origen",
  targetClassName = "Destino",
  onClose,
  onSave,
  onDeleteEdge,
}: EdgeEditModalProps) {
  const [relationType, setRelationType] = useState<UmlRelationType>("ASSOCIATION");
  const [sourceMultiplicity, setSourceMultiplicity] = useState("");
  const [targetMultiplicity, setTargetMultiplicity] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (initialData) {
      setRelationType(initialData.relationType || "ASSOCIATION");
      setSourceMultiplicity(initialData.sourceMultiplicity || "");
      setTargetMultiplicity(initialData.targetMultiplicity || "");
      setName(initialData.name || "");
    } else {
      setRelationType("ASSOCIATION");
      setSourceMultiplicity("");
      setTargetMultiplicity("");
      setName("");
    }
  }, [initialData, isOpen]);

  if (!isOpen || !edgeId) return null;

  const handleSave = () => {
    onSave(edgeId, {
      relationType,
      sourceMultiplicity: sourceMultiplicity.trim(),
      targetMultiplicity: targetMultiplicity.trim(),
      name: name.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white rounded-xl border border-slate-300 shadow-2xl w-full max-w-md mx-4 flex flex-col overflow-hidden animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Editar Relación UML</h3>
            <p className="text-xs text-slate-500">
              {sourceClassName} &rarr; {targetClassName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Tipo de Relación */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Relación
            </label>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as UmlRelationType)}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-800 text-slate-800"
            >
              {RELATION_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label} ({rt.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Nombre / Verbo / Rol opcional */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre o Verbo de la Relación <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. contiene, actualiza, depende, administra..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800 text-slate-800"
            />
            {/* Chips de sugerencias */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {COMMON_VERBS.map((verb) => (
                <button
                  key={verb}
                  type="button"
                  onClick={() => setName(verb)}
                  className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                    name === verb
                      ? "bg-indigo-600 text-white border-indigo-600 font-medium"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {verb}
                </button>
              ))}
            </div>
          </div>

          {/* Multiplicidades */}
          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
              Multiplicidad / Cardinalidad
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Multiplicidad Origen */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-600 truncate">
                  Origen ({sourceClassName})
                </label>
                <input
                  type="text"
                  value={sourceMultiplicity}
                  onChange={(e) => setSourceMultiplicity(e.target.value)}
                  placeholder="ej. 1, 0..1, *"
                  className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
                {/* Presets */}
                <div className="flex flex-wrap gap-1">
                  {MULTIPLICITY_PRESETS.map((preset) => (
                    <button
                      key={`src-${preset}`}
                      type="button"
                      onClick={() => setSourceMultiplicity(preset)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                        sourceMultiplicity === preset
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSourceMultiplicity("")}
                    className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Borrar
                  </button>
                </div>
              </div>

              {/* Multiplicidad Destino */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-600 truncate">
                  Destino ({targetClassName})
                </label>
                <input
                  type="text"
                  value={targetMultiplicity}
                  onChange={(e) => setTargetMultiplicity(e.target.value)}
                  placeholder="ej. 1..*, 0..*"
                  className="w-full px-2.5 py-1 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-slate-800"
                />
                {/* Presets */}
                <div className="flex flex-wrap gap-1">
                  {MULTIPLICITY_PRESETS.map((preset) => (
                    <button
                      key={`tgt-${preset}`}
                      type="button"
                      onClick={() => setTargetMultiplicity(preset)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                        targetMultiplicity === preset
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTargetMultiplicity("")}
                    className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          {onDeleteEdge ? (
            <button
              type="button"
              onClick={() => {
                onDeleteEdge(edgeId);
                onClose();
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar Relación
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
