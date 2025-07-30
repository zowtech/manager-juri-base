import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            {/* BASE FACILITIES Logo */}
            <div className="mx-auto w-24 h-24 mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-base-red to-base-navy rounded-full"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <div className="text-base-navy font-bold text-lg">BASE</div>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-base-navy mb-2">BASE FACILITIES</h1>
            <p className="text-gray-600">Sistema Jurídico</p>
          </div>
          
          <div className="space-y-4">
            <p className="text-center text-gray-700 mb-6">
              Faça login para acessar o sistema de gerenciamento jurídico
            </p>
            
            <Button 
              onClick={handleLogin}
              className="w-full bg-base-navy hover:bg-blue-800 text-white py-3 px-4 rounded-lg transition-colors font-semibold"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Entrar com Replit
            </Button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Sistema seguro e profissional para gestão de processos jurídicos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
