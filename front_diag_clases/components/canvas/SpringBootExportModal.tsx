"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Copy,
  Check,
  Download,
  FolderArchive,
  Database,
  FileCode,
  FileText,
  Layers,
  Terminal,
  Server,
  CodeXml,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { Node, Edge } from "@xyflow/react";
import {
  generateSpringBootProject,
  SpringBootProjectResult,
  GeneratedFile,
} from "@/services/springBootGenerator";

interface SpringBootExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  diagramName: string;
}

type TabType = "SUMMARY" | "HTTP_REQUESTS" | "POSTGRES_ENV" | "CODE_PREVIEW";

export function SpringBootExportModal({
  isOpen,
  onClose,
  nodes,
  edges,
  diagramName,
}: SpringBootExportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("SUMMARY");
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copiedHttp, setCopiedHttp] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Generar datos del proyecto a partir de los nodos y aristas del diagrama
  const project: SpringBootProjectResult = useMemo(() => {
    return generateSpringBootProject(diagramName, nodes, edges);
  }, [diagramName, nodes, edges]);

  if (!isOpen) return null;

  const currentFile: GeneratedFile | undefined = project.files[selectedFileIndex] || project.files[0];

  const handleCopyHttp = () => {
    navigator.clipboard.writeText(project.httpRequestsCode);
    setCopiedHttp(true);
    setTimeout(() => setCopiedHttp(false), 2000);
  };

  const handleCopyCurrentCode = () => {
    if (currentFile) {
      navigator.clipboard.writeText(currentFile.content);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await project.downloadZip();
    } catch (err) {
      console.error("Error al generar el ZIP:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl w-full max-w-5xl flex flex-col h-[88vh] overflow-hidden text-slate-100 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Exportar Proyecto Spring Boot (MVC + PostgreSQL)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Java 17 / Spring Boot 3
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Diagrama: <span className="font-semibold text-slate-300">{diagramName || "Diagrama de Clases"}</span> • {project.summary.totalEntities} Entidades • {project.summary.totalEndpoints} Endpoints generados
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab("SUMMARY")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "SUMMARY"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Resumen & Estructura
          </button>

          <button
            onClick={() => setActiveTab("HTTP_REQUESTS")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "HTTP_REQUESTS"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            Endpoints & Pruebas (requests.http)
          </button>

          <button
            onClick={() => setActiveTab("POSTGRES_ENV")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "POSTGRES_ENV"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            PostgreSQL & Variables de Entorno
          </button>

          <button
            onClick={() => setActiveTab("CODE_PREVIEW")}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "CODE_PREVIEW"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            Explorar Código Fuente ({project.files.length} archivos)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative bg-[#0b0f17]">
          {/* TAB 1: SUMMARY & STRUCTURE */}
          {activeTab === "SUMMARY" && (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{project.summary.totalEntities}</div>
                    <div className="text-xs text-slate-400 font-medium">Clases / Entidades JPA</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3.5">
                  <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{project.summary.totalEndpoints}</div>
                    <div className="text-xs text-slate-400 font-medium">Endpoints REST (CRUD + Schema)</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3.5">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">PostgreSQL</div>
                    <div className="text-xs text-slate-400 font-medium">Auto DDL & Env Vars</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3.5">
                  <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
                    <FolderArchive className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{project.files.length}</div>
                    <div className="text-xs text-slate-400 font-medium">Archivos Generados</div>
                  </div>
                </div>
              </div>

              {/* Architecture Layer Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Arquitectura MVC en Capas Incluida
                  </h3>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-emerald-400 font-bold">model:</span>
                      <span>Entidades JPA con anotaciones de tabla, claves primarias autoincrementales, mapeo de tipos y constructores.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-cyan-400 font-bold">repository:</span>
                      <span>Interfaces <code className="text-indigo-300 bg-slate-900 px-1 py-0.5 rounded">JpaRepository</code> para consultas y persistencia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-amber-400 font-bold">service:</span>
                      <span>Interfaces y clases de servicio transaccionales con CRUD completo y método <code className="text-amber-300 bg-slate-900 px-1 py-0.5 rounded">getSchema()</code>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-pink-400 font-bold">controller:</span>
                      <span>Controladores REST con soporte CORS, CRUD y endpoints de consulta de metadatos de esquema.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-emerald-400" />
                    Archivos de Configuración y Pruebas
                  </h3>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-slate-200 font-semibold">requests.http:</span>
                      <span>Peticiones HTTP preconfiguradas con payloads JSON de prueba para ejecutar en VS Code o IntelliJ.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-slate-200 font-semibold">postman_collection.json:</span>
                      <span>Colección completa para importar directamente en Postman con variables de entorno.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-slate-200 font-semibold">application.properties & .env:</span>
                      <span>Configurado para inyectar credenciales de PostgreSQL por variables de entorno sin modificar código.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-slate-200 font-semibold">README.md:</span>
                      <span>Manual en español para levantar la base de datos y correr el backend en Windows o Linux.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* List of Entities */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Clases Detectadas en el Lienzo
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.summary.entitiesList.map((ent) => (
                    <span
                      key={ent}
                      className="px-3 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {ent}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HTTP REQUESTS FILE */}
          {activeTab === "HTTP_REQUESTS" && (
            <div className="h-full flex flex-col">
              <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Archivo de pruebas: <code className="text-amber-300 font-bold">requests.http</code> (Compatible con REST Client, IntelliJ y Thunder Client)</span>
                </div>
                <button
                  onClick={handleCopyHttp}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
                >
                  {copiedHttp ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado al Portapapeles!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-300" />
                      <span>Copiar Todos los Endpoints</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 p-4 overflow-hidden">
                <pre className="h-full w-full overflow-auto font-mono text-xs text-amber-300/90 leading-relaxed bg-[#0d1117] p-4 rounded-xl border border-slate-800 select-text scrollbar-thin scrollbar-thumb-slate-700">
                  <code>{project.httpRequestsCode}</code>
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: POSTGRESQL & ENV CONFIG */}
          {activeTab === "POSTGRES_ENV" && (
            <div className="h-full overflow-y-auto p-6 space-y-6">
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Configuración de PostgreSQL mediante Variables de Entorno</h3>
                    <p className="text-xs text-slate-400">El proyecto no requiere que modifiques el código; solo debes suministrar tus credenciales mediante variables de entorno.</p>
                  </div>
                </div>

                <div className="border border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">Variable de Entorno</th>
                        <th className="px-4 py-2.5">Descripción</th>
                        <th className="px-4 py-2.5">Valor por Defecto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300 bg-slate-900/50 font-mono">
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">PORT</td>
                        <td className="px-4 py-2.5 font-sans">Puerto del servidor web</td>
                        <td className="px-4 py-2.5 text-slate-400">8080</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">DB_HOST</td>
                        <td className="px-4 py-2.5 font-sans">Host de tu servidor PostgreSQL</td>
                        <td className="px-4 py-2.5 text-slate-400">localhost</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">DB_PORT</td>
                        <td className="px-4 py-2.5 font-sans">Puerto de conexión de PostgreSQL</td>
                        <td className="px-4 py-2.5 text-slate-400">5432</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">DB_NAME</td>
                        <td className="px-4 py-2.5 font-sans">Nombre de la base de datos</td>
                        <td className="px-4 py-2.5 text-slate-400">diagrama_db</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">DB_USER</td>
                        <td className="px-4 py-2.5 font-sans">Usuario de la base de datos</td>
                        <td className="px-4 py-2.5 text-slate-400">postgres</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">DB_PASSWORD</td>
                        <td className="px-4 py-2.5 font-sans">Contraseña del usuario</td>
                        <td className="px-4 py-2.5 text-slate-400">postgres</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Execution Commands */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Ejecución en Windows (PowerShell)
                  </h4>
                  <pre className="p-3.5 rounded-lg bg-[#0d1117] border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
{`$env:DB_HOST="localhost"
$env:DB_PORT="5432"
$env:DB_NAME="diagrama_db"
$env:DB_USER="postgres"
$env:DB_PASSWORD="tu_password"

./mvnw spring-boot:run`}
                  </pre>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    Ejecución en Linux / macOS / Bash
                  </h4>
                  <pre className="p-3.5 rounded-lg bg-[#0d1117] border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
{`export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=diagrama_db
export DB_USER=postgres
export DB_PASSWORD=tu_password

./mvnw spring-boot:run`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CODE PREVIEW */}
          {activeTab === "CODE_PREVIEW" && (
            <div className="h-full flex">
              {/* File Explorer Tree Sidebar */}
              <div className="w-72 bg-slate-950/80 border-r border-slate-800 flex flex-col h-full">
                <div className="px-4 py-2.5 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Archivos del Proyecto ({project.files.length})
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs font-mono">
                  {project.files.map((file, idx) => {
                    const isSelected = selectedFileIndex === idx;
                    const fileName = file.path.split("/").pop();
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFileIndex(idx)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-2 truncate ${
                          isSelected
                            ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-semibold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                        }`}
                        title={file.path}
                      >
                        {file.category === "model" && <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {file.category === "repository" && <Database className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                        {file.category === "service" && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {file.category === "controller" && <Terminal className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                        {file.category === "config" && <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        {file.category === "test" && <CodeXml className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                        {file.category === "doc" && <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span className="truncate">{fileName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Viewer Content */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="px-6 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-300 truncate">
                    {currentFile?.path}
                  </div>
                  <button
                    onClick={handleCopyCurrentCode}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>Copiar archivo</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-hidden">
                  <pre className="h-full w-full overflow-auto font-mono text-xs text-emerald-400/90 leading-relaxed bg-[#0d1117] p-4 rounded-xl border border-slate-800 select-text scrollbar-thin scrollbar-thumb-slate-700">
                    <code>{currentFile?.content}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Proyecto empaquetado en ZIP listo para compilar con <code className="text-emerald-300 font-mono">./mvnw spring-boot:run</code></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cerrar
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isDownloading}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isDownloading ? "Empaquetando ZIP..." : "Descargar Proyecto Spring Boot (.ZIP)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
