"use client";

import React, { memo } from "react";
import { useViewport } from "@xyflow/react";

export interface RemoteCursor {
  userId: number;
  userName: string;
  userRole: "CREADOR" | "COLABORADOR";
  x: number;
  y: number;
  lastUpdated: number;
}

interface CollaborativeCursorsProps {
  cursors: Record<number, RemoteCursor>;
}

// Paleta de colores distintivos y vibrantes para colaboradores
const USER_COLORS = [
  "#2563eb", // Azul brillante
  "#9333ea", // Violeta intendo
  "#059669", // Verde esmeralda
  "#db2777", // Rosa fucsia
  "#ea580c", // Naranja intenso
  "#0891b2", // Cyan brillante
  "#4f46e5", // Indigo
  "#e11d48", // Rojo carmesí
];

function getUserColor(userId: number, role: string): string {
  if (role === "CREADOR") {
    return "#f59e0b"; // Ámbar dorado brillante para creadores
  }
  // Generar un color consistente basado en el ID del usuario
  const index = Math.abs(userId * 17) % USER_COLORS.length;
  return USER_COLORS[index];
}

function CollaborativeCursorsComponent({ cursors }: CollaborativeCursorsProps) {
  const { x: vpX, y: vpY, zoom } = useViewport();

  // Mantener visibles los cursores activos durante 15 segundos para evitar que desaparezcan si se pausan
  const activeCursors = Object.values(cursors).filter(
    (c) => Date.now() - c.lastUpdated < 15000
  );

  if (activeCursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[9999] overflow-hidden">
      {activeCursors.map((cursor) => {
        // Validación estricta de coordenadas
        if (isNaN(cursor.x) || isNaN(cursor.y)) return null;

        // Proyección matemática del lienzo a la pantalla según zoom y desplazamiento
        const screenX = vpX + cursor.x * zoom;
        const screenY = vpY + cursor.y * zoom;
        const color = getUserColor(cursor.userId, cursor.userRole);
        const isCreator = cursor.userRole === "CREADOR";

        return (
          <div
            key={cursor.userId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out will-change-transform pointer-events-none drop-shadow-xl"
            style={{
              transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
            }}
          >
            {/* SVG del ratón colaborativo con borde blanco radiante */}
            <svg
              className="w-6 h-6 filter drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                fill={color}
              />
            </svg>

            {/* Etiqueta distintiva del usuario (Nombre + Rol) */}
            <div
              className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg select-none whitespace-nowrap border border-white/30 tracking-wide"
              style={{ backgroundColor: color }}
            >
              {isCreator ? (
                <span className="text-[12px]" title="Creador del diagrama">👑</span>
              ) : (
                <span className="text-[12px]" title="Colaborador">👤</span>
              )}
              <span>{cursor.userName || `Usuario ${cursor.userId}`}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const CollaborativeCursors = memo(CollaborativeCursorsComponent);
