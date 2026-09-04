"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Code2, Users2, Move, Layers, CheckCircle2 } from "lucide-react";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">UML Studio</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-md hover:bg-slate-100 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-md transition-colors shadow-xs"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section (Clean & Flat) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-slate-900" />
          Herramienta de Modelado UML 2.5 Colaborativo
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 max-w-3xl leading-tight">
          Diseña diagramas de clases UML con precisión y en tiempo real
        </h1>

        <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed">
          Una plataforma ligera, sin distracciones ni sobrecarga visual. Modela entidades, define atributos y operaciones, y colabora con tu equipo instantáneamente.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            Comenzar Ahora
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-md text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
          >
            Crear una Cuenta
          </Link>
        </div>

        {/* Flat Preview Box */}
        <div className="mt-16 w-full max-w-4xl bg-white border border-slate-300 rounded-lg p-6 shadow-sm text-left">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
              <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
              <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
              <span className="text-xs font-mono text-slate-400 ml-2">lienzo_ejemplo.uml</span>
            </div>
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Colaboración en vivo activa
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Class 1 Preview */}
            <div className="bg-white border border-slate-300 rounded text-xs font-mono shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 font-bold text-slate-900 font-sans text-center">
                Usuario
              </div>
              <div className="p-2 border-b border-slate-200 space-y-1 text-slate-700 text-[11px]">
                <div>- correo: string</div>
                <div>- contraseña: string</div>
              </div>
              <div className="p-2 space-y-1 text-slate-700 text-[11px]">
                <div>+ login(): void</div>
                <div>+ register(): void</div>
              </div>
            </div>

            {/* Class 2 Preview */}
            <div className="bg-white border border-slate-300 rounded text-xs font-mono shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 font-bold text-slate-900 font-sans text-center">
                Diagrama
              </div>
              <div className="p-2 border-b border-slate-200 space-y-1 text-slate-700 text-[11px]">
                <div>- nombre: string</div>
                <div>- id_creador: int</div>
                <div>- lienzo: json</div>
              </div>
              <div className="p-2 space-y-1 text-slate-700 text-[11px]">
                <div>+ create(): void</div>
                <div>+ softdelete(): void</div>
              </div>
            </div>

            {/* Class 3 Preview */}
            <div className="bg-white border border-slate-300 rounded text-xs font-mono shadow-xs">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 font-bold text-slate-900 font-sans text-center">
                Colaborador
              </div>
              <div className="p-2 border-b border-slate-200 space-y-1 text-slate-700 text-[11px]">
                <div>- id_colaborador: int</div>
                <div>- id_diagrama: int</div>
              </div>
              <div className="p-2 space-y-1 text-slate-700 text-[11px]">
                <div>+ entrar(): void</div>
                <div>+ ignorar(): void</div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights (Simple & Clean) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full max-w-4xl">
          <div className="p-4 rounded-md border border-slate-200 bg-white">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-800 mb-3">
              <Move className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Lienzo Interactivo</h2>
            <p className="text-xs text-slate-600">
              Arrastra componentes, conecta nodos mediante puertos magnéticos y haz zoom sin restricciones.
            </p>
          </div>

          <div className="p-4 rounded-md border border-slate-200 bg-white">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-800 mb-3">
              <Users2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Roles & Colaboración</h2>
            <p className="text-xs text-slate-600">
              Distingue con claridad entre Creador (propietario) y Colaboradores invitados al mismo espacio de trabajo.
            </p>
          </div>

          <div className="p-4 rounded-md border border-slate-200 bg-white">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-800 mb-3">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">UML 2.5 Estándar</h2>
            <p className="text-xs text-slate-600">
              Modifica clases, visibilidad de atributos (+, -, #), métodos y añade notas explicativas fácilmente.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        UML Studio &copy; {new Date().getFullYear()} - Sistema de Modelado y Diagramación Colaborativa
      </footer>
    </div>
  );
}
