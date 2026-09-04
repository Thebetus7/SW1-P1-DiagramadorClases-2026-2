"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, FileText, User as UserIcon, LogOut, Code2, PlusCircle } from "lucide-react";
import { User } from "@/types";

interface SidebarProps {
  currentUser: User | null;
  onNewDiagram?: () => void;
}

export function Sidebar({ currentUser, onNewDiagram }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("diag_user");
    router.push("/login");
  };

  const navItems = [
    { name: "Mis Diagramas", href: "/diagrams", icon: LayoutGrid },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen select-none shrink-0">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">UML Studio</h1>
            <p className="text-xs text-slate-500 font-medium">Diagramador de Clases</p>
          </div>
        </div>

        {/* Action Button */}
        {onNewDiagram && (
          <div className="p-4">
            <button
              onClick={onNewDiagram}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-4 rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo Diagrama
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User & Logout Section */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold uppercase">
            {currentUser?.nombre ? currentUser.nombre.charAt(0) : "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {currentUser?.nombre || "Usuario"}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {currentUser?.correo || "correo@ejemplo.com"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 py-1.5 px-3 rounded transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
