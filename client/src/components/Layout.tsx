import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BarChart3, FileText, Users, History, UserCog, LogOut } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { path: "/", icon: BarChart3, label: "Dashboard" },
    { path: "/cases", icon: FileText, label: "Processos" },
    { path: "/activity-log", icon: History, label: "Log de Atividades" },
    ...(user?.role === 'admin' ? [
      { path: "/users", icon: UserCog, label: "Usuários" }
    ] : []),
  ];

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      "/": "Dashboard",
      "/cases": "Gerenciamento de Processos",
      "/activity-log": "Log de Atividades",
      "/users": "Gerenciamento de Usuários",
    };
    return titles[location] || "Dashboard";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-base-navy shadow-lg">
        <div className="flex items-center justify-center h-16 bg-base-red">
          <div className="text-white font-bold text-lg">BASE FACILITIES</div>
        </div>
        
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a className={`flex items-center px-4 py-3 text-white hover:bg-blue-700 rounded-lg transition-colors ${
                  location === item.path ? 'bg-blue-700' : ''
                }`}>
                  <item.icon className="mr-3" size={20} />
                  {item.label}
                </a>
              </Link>
            ))}
          </div>
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="bg-blue-800">
            <CardContent className="p-3">
              <div className="text-white text-sm">
                <div className="font-semibold">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-blue-200 capitalize">
                  {user?.role}
                </div>
              </div>
            </CardContent>
          </Card>
          <Button
            onClick={handleLogout}
            className="w-full mt-2 bg-base-red text-white hover:bg-red-700"
          >
            <LogOut className="mr-2" size={16} />
            Sair
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button variant="ghost" size="sm" className="p-2 text-gray-400 hover:text-gray-600">
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 bg-base-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </Button>
            </div>
            <div className="text-sm text-gray-600">
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
