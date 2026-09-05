"use client";

import React from "react";

export function UmlEdgeMarkers() {
  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      <defs>
        {/* 1. Generalización / Herencia y Realización: Triángulo hueco blanco con borde */}
        <marker
          id="uml-generalization-marker"
          viewBox="0 0 16 16"
          refX="14"
          refY="8"
          markerWidth="12"
          markerHeight="12"
          orient="auto-start-reverse"
        >
          <polygon
            points="2 2, 14 8, 2 14"
            fill="#ffffff"
            stroke="#334155"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </marker>

        {/* 2. Asociación Dirigida y Dependencia: Flecha abierta */}
        <marker
          id="uml-open-arrow-marker"
          viewBox="0 0 16 16"
          refX="13"
          refY="8"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <polyline
            points="4 3, 13 8, 4 13"
            fill="none"
            stroke="#334155"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>

        {/* 3. Agregación: Rombo hueco (blanco con borde oscuro) en el extremo contenedor */}
        <marker
          id="uml-aggregation-marker"
          viewBox="0 0 20 20"
          refX="2"
          refY="10"
          markerWidth="14"
          markerHeight="14"
          orient="auto-start-reverse"
        >
          <polygon
            points="2 10, 10 4, 18 10, 10 16"
            fill="#ffffff"
            stroke="#334155"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </marker>

        {/* 4. Composición: Rombo relleno (negro/slate oscuro) en el extremo contenedor */}
        <marker
          id="uml-composition-marker"
          viewBox="0 0 20 20"
          refX="2"
          refY="10"
          markerWidth="14"
          markerHeight="14"
          orient="auto-start-reverse"
        >
          <polygon
            points="2 10, 10 4, 18 10, 10 16"
            fill="#1e293b"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </marker>
      </defs>
    </svg>
  );
}
