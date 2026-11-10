"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  LogOut,
  Code2,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { User } from "@/types";

interface SidebarProps {
  currentUser: User | null;
  onNewDiagram?: () => void;
}

export function Sidebar({ currentUser, onNewDiagram }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Estado colapsado para pantallas de escritorio (PC)
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Estado abierto/cerrado tipo drawer para pantallas móviles
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Cargar preferencia previa de colapso si existe
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("diag_user");
    router.push("/login");
  };

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navItems = [
    { name: "Mis Diagramas", href: "/diagrams", icon: LayoutGrid },
  ];

  return (
    <>
      {/* Botón flotante para abrir sidebar en pantallas móviles / tablet */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          aria-label="Abrir menú"
          className="p-2 rounded-lg bg-white border border-slate-200 shadow-md text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Backdrop oscuro para móvil cuando el menú está abierto */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* Contenedor Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col justify-between h-screen select-none shrink-0 transition-all duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "md:w-20" : "w-64"}`}
      >
        <div>
          {/* Header de la marca con botón de comprimir */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 h-16">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
                <Code2 className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                    UML Studio
                  </h1>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Diagramador de Clases
                  </p>
                </div>
              )}
            </div>

            {/* Botón cerrar en móvil */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              aria-label="Cerrar menú móvil"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Botón para comprimir/expandir en escritorio */}
            <button
              onClick={toggleCollapsed}
              title={isCollapsed ? "Expandir barra lateral" : "Comprimir barra lateral"}
              className="hidden md:flex p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Comprimir barra"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Botón de acción: Nuevo Diagrama */}
          {onNewDiagram && (
            <div className="p-3">
              <button
                onClick={onNewDiagram}
                title={isCollapsed ? "Nuevo Diagrama" : undefined}
                className={`w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-md transition-colors flex items-center justify-center shadow-xs ${
                  isCollapsed ? "px-0" : "px-4 gap-2"
                }`}
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Nuevo Diagrama</span>}
              </button>
            </div>
          )}

          {/* Enlaces de Navegación */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`flex items-center rounded-md text-sm font-medium transition-colors ${
                    isCollapsed ? "justify-center py-2.5 px-0" : "gap-3 px-3 py-2"
                  } ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sección de Usuario y Cerrar Sesión */}
        <div className="p-3 border-t border-slate-200 bg-slate-50">
          <div
            className={`flex items-center mb-3 ${
              isCollapsed ? "justify-center" : "gap-3"
            }`}
            title={
              isCollapsed
                ? `${currentUser?.nombre || "Usuario"} (${currentUser?.correo || ""})`
                : undefined
            }
          >
            <div className="w-8 h-8 shrink-0 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold uppercase">
              {currentUser?.nombre ? currentUser.nombre.charAt(0) : "U"}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser?.nombre || "Usuario"}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser?.correo || "correo@ejemplo.com"}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
            className={`w-full flex items-center justify-center text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 py-1.5 rounded transition-colors ${
              isCollapsed ? "px-0" : "px-3 gap-2"
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
