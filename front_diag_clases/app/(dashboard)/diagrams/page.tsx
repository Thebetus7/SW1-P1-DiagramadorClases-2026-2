"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  UserPlus,
  Trash2,
  Layers,
  Crown,
  Users,
  Search,
  RefreshCw,
  X,
  UserCheck,
  UserMinus,
  Check,
  FileUp,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "@/services/api";
import { DiagramResponse, User } from "@/types";
import { importEnterpriseArchitectXmi } from "@/services/xmiImporter";
import {
  readXmlFileWithEncoding,
  cleanSpecialCharacters,
} from "@/services/xmiEncodingHelper";
import { ImageImportModal } from "@/components/canvas/ImageImportModal";
import { convertImageToDiagramWithGemini } from "@/services/geminiDiagramService";

export default function DiagramsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [diagrams, setDiagrams] = useState<DiagramResponse[]>([]);
  const [allSystemUsers, setAllSystemUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal para Crear Diagrama
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDiagramName, setNewDiagramName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Importar XMI desde Enterprise Architect
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Importar Imagen con Gemini IA
  const [showImageImportModal, setShowImageImportModal] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Modal de Gestión de Colaboradores (2 Columnas: Disponibles con [+] y Actuales con [-])
  const [collabModalDiagram, setCollabModalDiagram] = useState<DiagramResponse | null>(null);
  const [collabActionStatus, setCollabActionStatus] = useState<string | null>(null);
  const [isProcessingCollab, setIsProcessingCollab] = useState(false);
  const [userFilterText, setUserFilterText] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("diag_user");
    if (raw) {
      try {
        const user: User = JSON.parse(raw);
        setCurrentUser(user);
        loadDiagrams(user.id);
        loadSystemUsers();
      } catch {
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  }, [router]);

  const loadDiagrams = async (userId: number) => {
    try {
      setIsLoading(true);
      const data = await api.getDiagrams(userId);
      setDiagrams(data);
      // Si el modal está abierto, refrescar el diagrama seleccionado
      if (collabModalDiagram) {
        const updatedSelected = data.find((d) => d.id === collabModalDiagram.id);
        if (updatedSelected) setCollabModalDiagram(updatedSelected);
      }
    } catch (err) {
      console.error("Error al cargar diagramas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemUsers = async () => {
    try {
      const users = await api.getQuickUsers();
      setAllSystemUsers(users);
    } catch (err) {
      console.error("Error al cargar usuarios del sistema:", err);
    }
  };

  const handleCreateDiagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newDiagramName.trim()) return;

    try {
      setIsCreating(true);
      const created = await api.createDiagram(newDiagramName.trim(), currentUser.id);
      setShowCreateModal(false);
      setNewDiagramName("");
      router.push(`/diagrams/${created.id}`);
    } catch (err: any) {
      alert(err.message || "Error al crear diagrama");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setIsImporting(true);
      // Detección automática de codificación (UTF-8, UTF-8 con BOM, Windows-1252 o ISO-8859-1)
      const xmlContent = await readXmlFileWithEncoding(file);

      // 1. Obtener nombre base del archivo sin extensión y limpiar caracteres especiales
      const rawBaseName = file.name.replace(/\.[^/.]+$/, "").trim() || "Diagrama";
      const baseName = cleanSpecialCharacters(rawBaseName);

      // 2. Formatear fecha y hora actual
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // Nombre del nuevo diagrama: nombre del archivo + fecha/hora
      const finalDiagramName = `${baseName} - ${formattedDateTime}`;

      // 3. Parsear contenido XMI 2.1 de Enterprise Architect
      const importedData = importEnterpriseArchitectXmi(xmlContent, baseName);

      // 4. Crear diagrama con el lienzo importado en el backend
      const lienzoJson = JSON.stringify({
        nodes: importedData.nodes,
        edges: importedData.edges,
      });

      const created = await api.createDiagram(finalDiagramName, currentUser.id, lienzoJson);

      // 5. Redirigir directamente al nuevo diagrama importado
      router.push(`/diagrams/${created.id}`);
    } catch (err: any) {
      console.error("Error al importar XMI:", err);
      alert(err.message || "Error al procesar el archivo XMI de Enterprise Architect");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (diagramId: number, diagramName: string) => {
    if (!currentUser) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar el diagrama "${diagramName}"? (Se aplicará Soft Delete)`
    );
    if (!confirmDelete) return;

    try {
      await api.deleteDiagram(diagramId, currentUser.id);
      setDiagrams(diagrams.filter((d) => d.id !== diagramId));
    } catch (err: any) {
      alert(err.message || "Error al eliminar el diagrama");
    }
  };

  const openCollabModal = async (diagram: DiagramResponse) => {
    setCollabModalDiagram(diagram);
    setCollabActionStatus(null);
    setUserFilterText("");
    await loadSystemUsers();
  };

  // Añadir colaborador con el botón [+]
  const handleAddCollaborator = async (targetUser: User) => {
    if (!collabModalDiagram || !currentUser) return;

    try {
      setIsProcessingCollab(true);
      setCollabActionStatus(null);
      await api.inviteCollaborator(collabModalDiagram.id, targetUser.correo, currentUser.id);
      setCollabActionStatus(`¡${targetUser.nombre} añadido como colaborador!`);
      await loadDiagrams(currentUser.id);
    } catch (err: any) {
      setCollabActionStatus(err.message || "Error al añadir colaborador.");
    } finally {
      setIsProcessingCollab(false);
    }
  };

  // Retirar colaborador con el botón [-]
  const handleRemoveCollaborator = async (collabUserId: number, collabName: string) => {
    if (!collabModalDiagram || !currentUser) return;

    try {
      setIsProcessingCollab(true);
      setCollabActionStatus(null);
      await api.removeCollaborator(collabModalDiagram.id, collabUserId, currentUser.id);
      setCollabActionStatus(`¡${collabName} retirado del diagrama!`);
      await loadDiagrams(currentUser.id);
    } catch (err: any) {
      setCollabActionStatus(err.message || "Error al retirar colaborador.");
    } finally {
      setIsProcessingCollab(false);
    }
  };

  // Handler para importar imagen con Gemini IA
  const handleImageImport = async (diagramName: string, base64Data: string, mimeType: string) => {
    if (!currentUser) return;

    try {
      setIsProcessingImage(true);

      // 1. Llamar a Gemini Vision para convertir la imagen en JSON
      const result = await convertImageToDiagramWithGemini(base64Data, mimeType);

      // 2. Formatear fecha y hora actual
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      const finalDiagramName = `${diagramName} - ${formattedDateTime}`;

      // 3. Crear diagrama con el lienzo generado por IA
      const lienzoJson = JSON.stringify({
        nodes: result.nodes,
        edges: result.edges,
      });

      const created = await api.createDiagram(finalDiagramName, currentUser.id, lienzoJson);

      // 4. Cerrar modal y redirigir al nuevo diagrama
      setShowImageImportModal(false);
      router.push(`/diagrams/${created.id}`);
    } catch (err: any) {
      console.error("Error al importar imagen como diagrama:", err);
      alert(err.message || "Error al procesar la imagen con Gemini IA.");
    } finally {
      setIsProcessingImage(false);
    }
  };

  const filteredDiagrams = diagrams.filter((d) =>
    d.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrado para el modal de colaboradores
  const activeCollabUserIds = new Set(
    collabModalDiagram?.colaboradores?.map((c) => c.userId) || []
  );

  // 1. Usuarios disponibles (excluyendo al creador del diagrama y a los que ya son colaboradores)
  const availableUsers = allSystemUsers.filter(
    (u) =>
      u.id !== collabModalDiagram?.idCreador &&
      !activeCollabUserIds.has(u.id) &&
      (u.nombre.toLowerCase().includes(userFilterText.toLowerCase()) ||
        u.correo.toLowerCase().includes(userFilterText.toLowerCase()))
  );

  // 2. Colaboradores actuales (solo colaboradores asignados, excluyendo la fila del creador si existe)
  const assignedCollaborators = (collabModalDiagram?.colaboradores || []).filter(
    (c) => c.rol === "COLABORADOR" && c.userId !== collabModalDiagram?.idCreador
  );

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Módulo Diagramador
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administra tus diagramas de clases UML y gestiona colaboradores
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Hidden File Input for XMI Import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".xmi,.xml"
            className="hidden"
          />

          {/* Botón Importar Imagen con IA */}
          <button
            onClick={() => setShowImageImportModal(true)}
            title="Importar diagrama desde una imagen (digital o hecho a mano) usando Gemini IA"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-purple-700 hover:text-purple-800 text-xs font-semibold px-4 py-2 rounded-md border border-purple-300 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <ImageIcon className="w-4 h-4 text-purple-600" />
            Importar Imagen
          </button>

          {/* Botón Importar XMI de Enterprise Architect */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            title="Importar un archivo XMI/XML generado por Enterprise Architect"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-indigo-700 hover:text-indigo-800 text-xs font-semibold px-4 py-2 rounded-md border border-indigo-300 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <FileUp className={`w-4 h-4 text-indigo-600 ${isImporting ? "animate-bounce" : ""}`} />
            {isImporting ? "Importando XMI..." : "Importar XMI de EA"}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-md transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Crear Diagrama
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar diagrama por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-800 bg-white"
          />
        </div>

        <button
          onClick={() => currentUser && loadDiagrams(currentUser.id)}
          className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refrescar
        </button>
      </div>

      {/* Clean & Flat Diagrams Table */}
      <div className="mt-4 bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-mono">
            Cargando registros de diagramas...
          </div>
        ) : filteredDiagrams.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No hay diagramas disponibles</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Crea tu primer diagrama de clases UML haciendo clic en el botón superior.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Diagrama Ahora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nombre del Diagrama</th>
                  <th className="py-3 px-4">Propietario / Creador</th>
                  <th className="py-3 px-4">Mi Rol</th>
                  <th className="py-3 px-4">Colaboradores</th>
                  <th className="py-3 px-4">Última Modificación</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDiagrams.map((d) => {
                  const isOwner = currentUser?.id === d.idCreador || d.userRole === "CREADOR";
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <button
                          onClick={() => router.push(`/diagrams/${d.id}`)}
                          className="hover:underline text-left"
                        >
                          {d.nombre}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{d.nombreCreador}</div>
                        <div className="text-[11px] text-slate-400">{d.correoCreador}</div>
                      </td>
                      <td className="py-3 px-4">
                        {isOwner ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
                            <Crown className="w-3 h-3 text-amber-600" />
                            Creador
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                            <Users className="w-3 h-3 text-blue-600" />
                            Colaborador
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center -space-x-1">
                          {d.colaboradores?.slice(0, 4).map((c) => (
                            <span
                              key={c.id}
                              title={`${c.nombre} (${c.rol})`}
                              className="w-5 h-5 rounded-full bg-slate-200 border border-white text-[9px] font-bold flex items-center justify-center text-slate-700"
                            >
                              {c.nombre.charAt(0)}
                            </span>
                          ))}
                          {d.colaboradores?.length > 4 && (
                            <span className="text-[10px] text-slate-400 pl-1.5 font-medium">
                              +{d.colaboradores.length - 4}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Botón Invitar / Gestionar Colaboradores */}
                          <button
                            onClick={() => openCollabModal(d)}
                            title="Gestionar Colaboradores"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded font-medium transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                            <span>Colaboradores</span>
                          </button>

                          {/* Botón Editar [ingresa al lienzo] */}
                          <button
                            onClick={() => router.push(`/diagrams/${d.id}`)}
                            title="Editar Diagrama (Lienzo)"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-medium rounded transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {/* Botón Eliminar [softdelete] */}
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(d.id, d.nombre)}
                              title="Eliminar (Soft Delete)"
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear Diagrama */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-sm mx-4 p-5 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">Crear Nuevo Diagrama</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDiagram} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Diagrama
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newDiagramName}
                  onChange={(e) => setNewDiagramName(e.target.value)}
                  placeholder="Ej. Sistema de Comercio Electrónico"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded disabled:opacity-50"
                >
                  {isCreating ? "Creando..." : "Crear y Abrir Lienzo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Colaboradores: 2 Columnas Lado a Lado ([+] Añadir | [-] Retirar) */}
      {collabModalDiagram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-3xl mx-4 p-6 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Gestión de Colaboradores
                </h3>
                <p className="text-xs text-slate-500">
                  Diagrama: <span className="font-semibold text-slate-700">{collabModalDiagram.nombre}</span> (Creador: {collabModalDiagram.nombreCreador})
                </p>
              </div>
              <button
                onClick={() => setCollabModalDiagram(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mensaje de estado de acción */}
            {collabActionStatus && (
              <div
                className={`mt-3 text-xs p-2.5 rounded flex items-center gap-2 ${
                  collabActionStatus.includes("Error") || collabActionStatus.includes("retirado")
                    ? "bg-amber-50 text-amber-900 border border-amber-200"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                }`}
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>{collabActionStatus}</span>
              </div>
            )}

            {/* Buscador de usuarios */}
            <div className="mt-3">
              <input
                type="text"
                value={userFilterText}
                onChange={(e) => setUserFilterText(e.target.value)}
                placeholder="Filtrar usuarios por nombre o correo..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-800"
              />
            </div>

            {/* Contenedor de 2 Columnas Lado a Lado */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-1 min-h-[260px]">
              {/* COLUMNA 1: Usuarios Registrados Disponibles para Invitar (con [+]) */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Disponibles para Invitar ({availableUsers.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Haz clic en [+]</span>
                </div>

                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-60 pr-1">
                  {availableUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      No hay más usuarios registrados disponibles para invitar.
                    </div>
                  ) : (
                    availableUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 bg-white border border-slate-200 hover:border-blue-300 rounded transition-colors shadow-2xs"
                      >
                        <div className="overflow-hidden mr-2">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {u.nombre}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {u.correo}
                          </div>
                        </div>

                        {/* Botón [+] para añadir */}
                        <button
                          type="button"
                          disabled={isProcessingCollab}
                          onClick={() => handleAddCollaborator(u)}
                          title={`Añadir a ${u.nombre} como colaborador`}
                          className="w-7 h-7 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shrink-0 transition-colors shadow-xs disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* COLUMNA 2: Colaboradores Actuales del Diagrama (con [-]) */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Colaboradores Asignados ({assignedCollaborators.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Haz clic en [-]</span>
                </div>

                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-60 pr-1">
                  {assignedCollaborators.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      Aún no hay colaboradores asignados a este diagrama.
                    </div>
                  ) : (
                    assignedCollaborators.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 bg-white border border-slate-200 hover:border-rose-300 rounded transition-colors shadow-2xs"
                      >
                        <div className="overflow-hidden mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {c.nombre}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium shrink-0">
                              Colaborador
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {c.correo}
                          </div>
                        </div>

                        {/* Botón [-] para retirar */}
                        <button
                          type="button"
                          disabled={isProcessingCollab}
                          onClick={() => handleRemoveCollaborator(c.userId, c.nombre)}
                          title={`Retirar a ${c.nombre} del diagrama`}
                          className="w-7 h-7 flex items-center justify-center bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-300 hover:border-transparent rounded text-xs font-bold shrink-0 transition-colors shadow-xs disabled:opacity-50"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-4 mt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCollabModalDiagram(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importar Imagen con Gemini IA */}
      <ImageImportModal
        isOpen={showImageImportModal}
        onClose={() => setShowImageImportModal(false)}
        onImport={handleImageImport}
        isProcessing={isProcessingImage}
      />
    </div>
  );
}
