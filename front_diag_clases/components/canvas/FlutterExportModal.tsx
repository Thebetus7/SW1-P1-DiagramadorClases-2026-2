"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  FolderArchive,
  Smartphone,
  Mic,
  Cpu,
  Terminal,
  FileCode,
  FileText,
  Layers,
  ChevronRight,
  ExternalLink,
  Wifi,
  Sparkles,
} from "lucide-react";
import { Node, Edge } from "@xyflow/react";
import {
  generateFlutterProject,
  FlutterProjectResult,
  GeneratedFile,
} from "@/services/flutterGenerator";

interface FlutterExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  diagramName: string;
}

type TabType = "SUMMARY" | "CODE_PREVIEW" | "CONNECTIVITY" | "LOCAL_AI";

export function FlutterExportModal({
  isOpen,
  onClose,
  nodes,
  edges,
  diagramName,
}: FlutterExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("SUMMARY");
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Generar datos del proyecto Flutter a partir del diagrama actual
  const project: FlutterProjectResult = useMemo(() => {
    return generateFlutterProject(diagramName, nodes, edges);
  }, [diagramName, nodes, edges]);

  if (!isOpen) return null;

  const currentFile: GeneratedFile | undefined = project.files[selectedFileIndex] || project.files[0];

  const handleCopyCurrentCode = () => {
    if (currentFile) {
      navigator.clipboard.writeText(currentFile.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCommand(cmd);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await project.downloadZip();
    } catch (err) {
      console.error("Error al generar el ZIP de Flutter:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 p-4">
      <div className="bg-slate-900 rounded-2xl border border-sky-500/30 shadow-2xl w-full max-w-5xl flex flex-col h-[88vh] overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Exportar Frontend Flutter (Voz Local + IA CRUD)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full">
                  Flutter 3.x
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <Mic className="w-3 h-3" /> STT On-Device
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interfaz de 2 cuadros de texto con transcripción de voz y traducción de lenguaje natural a llamadas REST.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/60">
          <div className="flex gap-2 py-2">
            <button
              onClick={() => setActiveTab("SUMMARY")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "SUMMARY"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Resumen del Proyecto
            </button>

            <button
              onClick={() => setActiveTab("CODE_PREVIEW")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "CODE_PREVIEW"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Explorador de Código ({project.files.length} archivos)
            </button>

            <button
              onClick={() => setActiveTab("CONNECTIVITY")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "CONNECTIVITY"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              Conexión con Backend (:8081)
            </button>

            <button
              onClick={() => setActiveTab("LOCAL_AI")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "LOCAL_AI"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              IA Local (Voz + Ollama / GGUF)
            </button>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <FolderArchive className="w-4 h-4" />
            {isDownloading ? "Generando ZIP..." : "Descargar Proyecto Flutter (.ZIP)"}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-hidden p-6 bg-slate-900/60">
          
          {/* TAB 1: RESUMEN */}
          {activeTab === "SUMMARY" && (
            <div className="h-full overflow-y-auto space-y-6 pr-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-800/70 border border-slate-700/80 rounded-xl">
                  <div className="text-xs font-medium text-slate-400">Entidades UML Mapeadas</div>
                  <div className="text-2xl font-black text-sky-400 mt-1">{project.summary.totalEntities}</div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {project.summary.entitiesList.join(", ") || "Ninguna"}
                  </div>
                </div>

                <div className="p-4 bg-slate-800/70 border border-slate-700/80 rounded-xl">
                  <div className="text-xs font-medium text-slate-400">Reconocimiento de Voz</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">Local / Offline</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    speech_to_text on-device (Español)
                  </div>
                </div>

                <div className="p-4 bg-slate-800/70 border border-slate-700/80 rounded-xl">
                  <div className="text-xs font-medium text-slate-400">IA Procesamiento Semántico</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">Ollama / Heurístico</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Traducción de voz/texto a CRUD REST
                  </div>
                </div>
              </div>

              {/* Diseño de la Pantalla */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  Estructura de la Pantalla Flutter (home_screen.dart)
                </h3>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg flex items-start gap-3">
                    <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 font-bold rounded text-[10px]">Cuadro 1</span>
                    <div>
                      <span className="font-bold text-slate-100">Visor Superior (Salida / Resultados):</span> Muestra respuestas del backend formateadas en JSON con indentación, estado HTTP y mensajes de confirmación (ej: *"✅ Registro guardado correctamente"*).
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg flex items-start gap-3">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold rounded text-[10px]">Cuadro 2</span>
                    <div>
                      <span className="font-bold text-slate-100">Entrada / Transcripción de Audio:</span> Cuadro multilínea donde se refleja en tiempo real lo hablado por el micrófono o se puede escribir manualmente cualquier orden.
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-lg flex items-start gap-3">
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 font-bold rounded text-[10px]">Controles</span>
                    <div>
                      <span className="font-bold text-slate-100">Botón de Micrófono + Botón Enviar:</span> Graba audio con pulsación visual y envía la orden a la IA local para ejecutar el CRUD en el backend.
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Start */}
              <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">¿Listo para probar en Flutter?</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Descarga el ZIP, descomprímelo y ejecuta <code className="text-sky-300">flutter run</code>.
                  </p>
                </div>
                <button
                  onClick={handleDownloadZip}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Descargar ZIP Ahora
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EXPLORADOR DE CÓDIGO */}
          {activeTab === "CODE_PREVIEW" && (
            <div className="h-full flex gap-4 overflow-hidden">
              {/* File Tree */}
              <div className="w-1/3 bg-slate-950 border border-slate-800 rounded-xl overflow-y-auto p-2">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Archivos Generados
                </div>
                <div className="space-y-0.5 mt-1">
                  {project.files.map((file, idx) => {
                    const isSelected = idx === selectedFileIndex;
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFileIndex(idx)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-sky-600/30 text-sky-300 border border-sky-500/40"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        }`}
                      >
                        <span className="truncate">{file.path}</span>
                        <ChevronRight className={`w-3 h-3 ${isSelected ? "text-sky-400" : "text-slate-600"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code Viewer */}
              <div className="w-2/3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-300">{currentFile?.path}</span>
                  <button
                    onClick={handleCopyCurrentCode}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? "Copiado" : "Copiar Código"}
                  </button>
                </div>
                <pre className="flex-1 p-4 overflow-auto font-mono text-xs text-sky-300/90 leading-relaxed bg-[#0b101b] select-text">
                  <code>{currentFile?.content}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: CONEXIÓN BACKEND */}
          {activeTab === "CONNECTIVITY" && (
            <div className="h-full overflow-y-auto space-y-4 pr-2 text-xs">
              <div className="p-4 bg-sky-950/30 border border-sky-500/30 rounded-xl">
                <h3 className="text-sm font-bold text-sky-200 mb-1 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-sky-400" />
                  Opciones de Conexión Flutter ⇄ Backend Spring Boot (:8081)
                </h3>
                <p className="text-slate-300">
                  Elige la opción adecuada para tu dispositivo de desarrollo:
                </p>
              </div>

              {/* Opción 1: ADB Reverse */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    ⭐ Opción 1: Móvil Físico por Cable USB (ADB Reverse - La más recomendada)
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-semibold">
                    0 Latencia / Offline
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">
                  Conecta tu teléfono Android por USB con Depuración activa y ejecuta en la terminal de Windows:
                </p>
                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-emerald-400 flex items-center justify-between">
                  <span>adb reverse tcp:8081 tcp:8081</span>
                  <button
                    onClick={() => handleCopyCommand("adb reverse tcp:8081 tcp:8081")}
                    className="p-1 hover:text-white"
                  >
                    {copiedCommand === "adb reverse tcp:8081 tcp:8081" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Opción 2: Web */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-white text-xs">
                  Opción 2: Navegador Web (Flutter Web)
                </span>
                <p className="text-slate-400 text-[11px]">
                  Abre la app directamente en Chrome conectándose a <code className="text-sky-300">http://localhost:8081/api</code>:
                </p>
                <div className="p-2.5 bg-slate-900 rounded-lg font-mono text-sky-400 flex items-center justify-between">
                  <span>flutter run -d chrome</span>
                  <button
                    onClick={() => handleCopyCommand("flutter run -d chrome")}
                    className="p-1 hover:text-white"
                  >
                    {copiedCommand === "flutter run -d chrome" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Opción 3: Emulador */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="font-bold text-white text-xs">
                  Opción 3: Emulador Android (AVD)
                </span>
                <p className="text-slate-400 text-[11px]">
                  La app detecta automáticamente la IP especial <code className="text-amber-300">http://10.0.2.2:8081/api</code>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: IA LOCAL */}
          {activeTab === "LOCAL_AI" && (
            <div className="h-full overflow-y-auto space-y-4 pr-2 text-xs">
              <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-xl">
                <h3 className="text-sm font-bold text-purple-200 mb-1 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  Arquitectura de IA Local: Voz y Consultas NLP a CRUD
                </h3>
                <p className="text-slate-300">
                  La app Flutter incluye soporte para 3 modalidades de ejecución de IA:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* STT */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    1. Reconocimiento de Voz On-Device
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Utiliza el paquete <code className="text-sky-300">speech_to_text</code> configurado en <code className="text-sky-300">es_ES</code>. No requiere descargar modelos pesados ni enviar audios a servidores externos.
                  </p>
                </div>

                {/* NLP Ollama / Heurístico */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="font-bold text-white text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    2. Traductor Semántico (Ollama / Heurístico)
                  </h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Lee el catálogo <code className="text-sky-300">/api/schemas</code> del backend y mapea órdenes naturales (*"muestra la lista de productos"*, *"crea un producto"*) al método HTTP exacto (<code className="text-emerald-300">GET</code>, <code className="text-blue-300">POST</code>, <code className="text-red-300">DELETE</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Frontend Flutter generado con soporte para Backend Spring Boot (:8081) y Speech-to-Text Local.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? "Descargando..." : "Descargar Proyecto Flutter"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
