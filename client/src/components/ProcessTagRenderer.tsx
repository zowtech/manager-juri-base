import { Badge } from "@/components/ui/badge";

interface ProcessTagRendererProps {
  processo: string;
}

export default function ProcessTagRenderer({ processo }: ProcessTagRendererProps) {
  const processos = processo.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  return (
    <div className="flex flex-wrap gap-1 max-w-sm">
      {processos.map((proc, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors whitespace-nowrap"
        >
          {proc}
        </Badge>
      ))}
    </div>
  );
}