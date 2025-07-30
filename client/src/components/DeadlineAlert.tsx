import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface DeadlineAlertProps {
  prazoEntrega: string | null;
  status: string;
}

export default function DeadlineAlert({ prazoEntrega, status }: DeadlineAlertProps) {
  if (!prazoEntrega || status === 'concluido') {
    return status === 'concluido' ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle size={12} className="mr-1" />
        Concluído
      </Badge>
    ) : (
      <span className="text-gray-500 text-sm">-</span>
    );
  }

  const today = new Date();
  const deadline = new Date(prazoEntrega);
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Cores baseadas na proximidade do prazo
  if (diffDays < 0) {
    return (
      <Badge className="bg-red-100 text-red-800 animate-pulse">
        <AlertTriangle size={12} className="mr-1" />
        Atrasado ({Math.abs(diffDays)}d)
      </Badge>
    );
  } else if (diffDays === 0) {
    return (
      <Badge className="bg-red-100 text-red-800 animate-pulse">
        <AlertTriangle size={12} className="mr-1" />
        Hoje
      </Badge>
    );
  } else if (diffDays === 1) {
    return (
      <Badge className="bg-orange-100 text-orange-800">
        <Clock size={12} className="mr-1" />
        Amanhã
      </Badge>
    );
  } else if (diffDays <= 3) {
    return (
      <Badge className="bg-orange-100 text-orange-800">
        <Clock size={12} className="mr-1" />
        {diffDays} dias
      </Badge>
    );
  } else if (diffDays <= 7) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock size={12} className="mr-1" />
        {diffDays} dias
      </Badge>
    );
  } else {
    return (
      <Badge className="bg-green-100 text-green-800">
        <Clock size={12} className="mr-1" />
        {diffDays} dias
      </Badge>
    );
  }
}