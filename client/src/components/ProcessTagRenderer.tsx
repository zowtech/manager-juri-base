import { Badge } from "@/components/ui/badge";

interface ProcessTagRendererProps {
  processo: string;
  maxTags?: number;
}

export default function ProcessTagRenderer({ processo, maxTags = 3 }: ProcessTagRendererProps) {
  const processos = processo.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  const displayedProcessos = processos.slice(0, maxTags);
  const remainingCount = processos.length - maxTags;
  
  return (
    <div className="flex flex-wrap gap-1">
      {displayedProcessos.map((proc, index) => (
        <Badge 
          key={index} 
          variant="secondary" 
          className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
        >
          {proc}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} mais
        </Badge>
      )}
    </div>
  );
}