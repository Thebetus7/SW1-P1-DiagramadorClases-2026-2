"use client";

import React from "react";
import { Check, X, Sparkles, CheckCircle2, XCircle, Pencil, Ban, Loader2 } from "lucide-react";
import { ChatProposalPayload, ProposalStatus } from "@/types";
import { MarkdownPreview } from "./MarkdownPreview";

interface ProactiveSuggestionCardProps {
  id?: string;
  taggedUserName?: string | null;
  content: string;
  proposal?: ChatProposalPayload | null;
  proposalStatus?: ProposalStatus;
  resolvedByUserName?: string | null;
  onAccept: () => void;
  onIgnore: () => void;
  isLoading?: boolean;
  isApplying?: boolean;
}

export function ProactiveSuggestionCard({
  taggedUserName,
  content,
  proposal,
  proposalStatus = "PENDING",
  resolvedByUserName,
  onAccept,
  onIgnore,
  isLoading = false,
  isApplying = false,
}: ProactiveSuggestionCardProps) {
  const isPending = !proposalStatus || proposalStatus === "PENDING";
  const isAccepted = proposalStatus === "ACCEPTED";
  const isIgnored = proposalStatus === "IGNORED";

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-3.5 shadow-sm hover:shadow-md transition-shadow">
      {/* Cabecera de la sugerencia */}
      <div className="flex items-center gap-2 mb-2">
        <span className="p-1 rounded-md bg-indigo-100 text-indigo-700">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs font-bold text-indigo-900 tracking-wide uppercase">
          Sugerencia de Copilot
        </span>
        {taggedUserName && (
          <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-800">
            @{taggedUserName}
          </span>
        )}
      </div>

      {/* Contenido / Explicación formateada con Markdown */}
      <div className="mb-3">
        <MarkdownPreview content={content} />
      </div>

      {/* Resumen de cambios técnicos propuestos si existen */}
      {proposal?.summary && (
        <div className="text-[11px] bg-slate-100/80 rounded-lg p-2 text-slate-600 mb-3 border border-slate-200/60 font-mono">
          <span className="font-semibold text-slate-700">Impacto en lienzo: </span>
          {proposal.summary}
        </div>
      )}

      {/* Botones de acción o estado terminal */}
      {isPending ? (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100/60">
          <button
            onClick={onAccept}
            disabled={isLoading || isApplying}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Aplicar cambios al lienzo"
          >
            {isApplying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Aplicando...</span>
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar</span>
              </>
            )}
          </button>
          <button
            onClick={onIgnore}
            disabled={isLoading || isApplying}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-200/80 hover:bg-slate-300 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Cancelar sugerencia"
          >
            <Ban className="w-3.5 h-3.5 text-rose-500" />
            <span>Cancelar</span>
          </button>
        </div>
      ) : isAccepted ? (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Cambios aplicados por @{resolvedByUserName || taggedUserName || "colaborador"}</span>
        </div>
      ) : isIgnored ? (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Sugerencia cancelada</span>
        </div>
      ) : null}
    </div>
  );
}
