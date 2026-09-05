"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  UserPlus,
  Crown,
  Users,
  Check,
  RefreshCw,
  Plus,
  UserMinus,
  X,
} from "lucide-react";
import { DiagramResponse, User } from "@/types";
import { api } from "@/services/api";

interface CollaboratorsHeaderProps {
  diagram: DiagramResponse;
  currentUser: User | null;
  isSaving: boolean;
  lastSavedTime?: Date | null;
  onSave: () => void;
  onInvite: (correo: string) => Promise<void>;
  onRemoveCollaborator?: (userId: number) => Promise<void>;
}

export function CollaboratorsHeader({
  diagram,
  currentUser,
  isSaving,
  lastSavedTime,
  onSave,
  onInvite,
  onRemoveCollaborator,
}: CollaboratorsHeaderProps) {
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [allSystemUsers, setAllSystemUsers] = useState<User[]>([]);
  const [filterText, setFilterText] = useState("");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isOwner = currentUser?.id === diagram.idCreador || diagram.userRole === "CREADOR";

  const loadUsers = async () => {
    try {
      const users = await api.getQuickUsers();
      setAllSystemUsers(users);
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    }
  };

  const handleOpenModal = () => {
    setShowCollabModal(true);
    setActionStatus(null);
    setFilterText("");
    loadUsers();
  };

  const handleAdd = async (targetUser: User) => {
    try {
      setIsProcessing(true);
      setActionStatus(null);
      await onInvite(targetUser.correo);
      setActionStatus(`¡${targetUser.nombre} añadido como colaborador!`);
    } catch (err: any) {
      setActionStatus(err.message || "Error al añadir colaborador.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async (collabUserId: number, collabName: string) => {
    if (!currentUser) return;
    try {
      setIsProcessing(true);
      setActionStatus(null);
      if (onRemoveCollaborator) {
        await onRemoveCollaborator(collabUserId);
      } else {
        await api.removeCollaborator(diagram.id, collabUserId, currentUser.id);
      }
      setActionStatus(`¡${collabName} retirado del diagrama!`);
    } catch (err: any) {
      setActionStatus(err.message || "Error al retirar colaborador.");
    } finally {
      setIsProcessing(false);
    }
  };

  const activeCollabUserIds = new Set(
    diagram.colaboradores?.map((c) => c.userId) || []
  );

  const availableUsers = allSystemUsers.filter(
    (u) =>
      u.id !== diagram.idCreador &&
      !activeCollabUserIds.has(u.id) &&
      (u.nombre.toLowerCase().includes(filterText.toLowerCase()) ||
        u.correo.toLowerCase().includes(filterText.toLowerCase()))
  );

  const assignedCollaborators = (diagram.colaboradores || []).filter(
    (c) => c.rol === "COLABORADOR" && c.userId !== diagram.idCreador
  );

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-10 shrink-0 select-none">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/diagrams"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            title="Volver a la lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 leading-none">
                {diagram.nombre}
              </h1>
              {/* Badge de Rol */}
              {isOwner ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded">
                  <Crown className="w-3 h-3 text-amber-600" />
                  Creador (Propietario)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded">
                  <Users className="w-3 h-3 text-blue-600" />
                  Colaborador
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Creado por: <span className="font-medium text-slate-700">{diagram.nombreCreador}</span>
            </p>
          </div>
        </div>

        {/* Right: Collaborators & Actions */}
        <div className="flex items-center gap-3">
          {/* Collaborator Avatars */}
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {diagram.colaboradores?.map((collab) => (
              <div
                key={collab.id}
                title={`${collab.nombre} (${collab.rol})`}
                className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold uppercase shadow-xs ${
                  collab.rol === "CREADOR"
                    ? "bg-amber-100 text-amber-900 border-amber-300"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {collab.nombre.charAt(0)}
              </div>
            ))}
          </div>

          {/* Colaboradores Button */}
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1.5 rounded transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-blue-600" />
            Colaboradores
          </button>

          {/* Indicador de Autoguardado en tiempo real */}
          <div className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 bg-slate-100/80 border border-slate-200 rounded text-slate-600">
            {isSaving ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                <span className="text-amber-700 font-semibold">Guardando en vivo...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-600 font-medium">Autoguardado activo</span>
              </>
            )}
          </div>

          {/* Save Button Manual */}
          <button
            onClick={onSave}
            disabled={isSaving}
            title="Guardar de inmediato manualmente"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar
          </button>
        </div>
      </header>

      {/* Modal de Gestión de Colaboradores: 2 Columnas ([+] Añadir | [-] Retirar) */}
      {showCollabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl w-full max-w-2xl mx-4 p-5 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gestión de Colaboradores</h3>
                <p className="text-xs text-slate-500">
                  Añade o retira colaboradores registrados para este diagrama
                </p>
              </div>
              <button
                onClick={() => setShowCollabModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionStatus && (
              <div className="mt-2 text-xs p-2 rounded bg-slate-100 border border-slate-300 text-slate-800 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{actionStatus}</span>
              </div>
            )}

            <div className="mt-3">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filtrar por nombre o correo..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1 min-h-[220px]">
              {/* Columna Disponibles */}
              <div className="border border-slate-200 rounded p-2.5 bg-slate-50 flex flex-col">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 text-xs font-bold text-slate-800">
                  <span>Disponibles para Invitar ({availableUsers.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Clic [+]</span>
                </div>

                <div className="space-y-1 flex-1 overflow-y-auto max-h-52 pr-1">
                  {availableUsers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic">
                      No hay más usuarios registrados para invitar.
                    </div>
                  ) : (
                    availableUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded hover:border-blue-300 transition-colors"
                      >
                        <div className="overflow-hidden mr-2">
                          <div className="text-xs font-semibold text-slate-900 truncate">{u.nombre}</div>
                          <div className="text-[11px] text-slate-500 truncate">{u.correo}</div>
                        </div>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleAdd(u)}
                          title="Añadir colaborador"
                          className="w-6 h-6 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shrink-0 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Columna Asignados */}
              <div className="border border-slate-200 rounded p-2.5 bg-slate-50 flex flex-col">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 text-xs font-bold text-slate-800">
                  <span>Colaboradores Asignados ({assignedCollaborators.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Clic [-]</span>
                </div>

                <div className="space-y-1 flex-1 overflow-y-auto max-h-52 pr-1">
                  {assignedCollaborators.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 italic">
                      Sin colaboradores asignados.
                    </div>
                  ) : (
                    assignedCollaborators.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded hover:border-rose-300 transition-colors"
                      >
                        <div className="overflow-hidden mr-2">
                          <div className="text-xs font-semibold text-slate-900 truncate">{c.nombre}</div>
                          <div className="text-[11px] text-slate-500 truncate">{c.correo}</div>
                        </div>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRemove(c.userId, c.nombre)}
                          title="Retirar colaborador"
                          className="w-6 h-6 flex items-center justify-center bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-300 rounded text-xs font-bold shrink-0"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 mt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCollabModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
