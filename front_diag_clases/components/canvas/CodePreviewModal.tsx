"use client";

import React, { useState } from "react";
import { X, Copy, Check, Download, Code, FileText } from "lucide-react";

interface CodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  xmiCode: string;
  jsonCode: string;
  diagramName: string;
  onDownloadXmi: () => void;
  onDownloadJson: () => void;
}

export function CodePreviewModal({
  isOpen,
  onClose,
  xmiCode,
  jsonCode,
  diagramName,
  onDownloadXmi,
  onDownloadJson,
}: CodePreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"XMI" | "JSON">("XMI");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentCode = activeTab === "XMI" ? xmiCode : jsonCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-2xl w-full max-w-3xl mx-4 flex flex-col h-[80vh] overflow-hidden text-slate-100 animate-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700">
              <Code className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Previsualización de Código</span>
            </div>
            <span className="text-xs text-slate-400 truncate max-w-[200px]">
              {diagramName || "Diagrama"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => setActiveTab("XMI")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "XMI"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                XMI / XML (EA 15)
              </button>
              <button
                onClick={() => setActiveTab("JSON")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "JSON"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative bg-[#0d1117] overflow-hidden p-4">
          <pre className="h-full w-full overflow-auto font-mono text-xs text-emerald-400/90 leading-relaxed bg-[#0d1117] select-text focus:outline-none scrollbar-thin scrollbar-thumb-slate-700">
            <code>{currentCode}</code>
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="text-[11px] text-slate-400">
            {activeTab === "XMI"
              ? "Formato OMG XMI 2.1 compatible con Enterprise Architect 15"
              : "Formato JSON del esquema de nodos y relaciones"}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar al portapapeles</span>
                </>
              )}
            </button>

            <button
              onClick={activeTab === "XMI" ? onDownloadXmi : onDownloadJson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar {activeTab === "XMI" ? ".xmi" : ".json"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
