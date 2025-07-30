import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Bell, BarChart3, FileText, History, UserCog, LogOut, Menu, X } from "lucide-react";
import facilityLogo from "@assets/449265_6886_1753882292906.jpg";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    // Clear all cached data
    localStorage.clear();
    sessionStorage.clear();
    
    // Force logout and redirect
    fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    }).then(() => {
      window.location.href = "/auth";
    }).catch(() => {
      window.location.href = "/auth";
    });
  };

  const navItems = [
    ...((user as any)?.permissions?.pages?.dashboard !== false ? [
      { path: "/", icon: BarChart3, label: "Dashboard", description: "Visão geral e métricas" }
    ] : []),
    ...((user as any)?.permissions?.pages?.cases !== false ? [
      { path: "/cases", icon: FileText, label: "Processos", description: "Gerenciar processos jurídicos" }
    ] : []),
    ...((user as any)?.permissions?.pages?.activityLog === true ? [
      { path: "/activity-log", icon: History, label: "Atividades", description: "Log de ações do sistema" }
    ] : []),
    ...((user as any)?.permissions?.pages?.users === true || user?.role === 'admin' ? [
      { path: "/users", icon: UserCog, label: "Usuários", description: "Gerenciar usuários" }
    ] : []),
  ].filter(Boolean);

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      "/": "Dashboard - Visão Geral",
      "/cases": "Gerenciamento de Processos",
      "/activity-log": "Log de Atividades",
      "/users": "Gerenciamento de Usuários",
    };
    return titles[location] || "Dashboard";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Navigation Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        
        {/* Mobile Close Button */}
        <div className="flex justify-end p-4 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:bg-slate-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-slate-700 mt-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user?.firstName?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <div className="text-white font-medium">{user?.firstName} {user?.lastName}</div>
              <div className="text-slate-400 text-sm capitalize">{user?.role}</div>
              <div className="text-slate-500 text-xs">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <div className={`group flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                }`}>
                  <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full flex items-center justify-center space-x-2 text-slate-300 hover:text-white hover:bg-slate-700/50 py-3"
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </Button>
          
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="text-center text-xs text-slate-500">
              © 2024 BASE FACILITIES
            </div>
            <div className="text-center text-xs text-slate-600 mt-1">
              {currentTime.toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="relative p-2 text-gray-400 hover:text-gray-600">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Button>
            <div className="hidden md:block text-sm text-gray-600">
              {currentTime.toLocaleString('pt-BR')}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}