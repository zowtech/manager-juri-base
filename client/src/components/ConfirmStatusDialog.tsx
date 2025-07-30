import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  currentStatus: string;
  newStatus: string;
  processNumber: string;
  clientName: string;
}

export default function ConfirmStatusDialog({
  open,
  onOpenChange,
  onConfirm,
  currentStatus,
  newStatus,
  processNumber,
  clientName,
}: ConfirmStatusDialogProps) {
  const statusLabels = {
    'novo': 'Novo',
    'andamento': 'Em Andamento',
    'concluido': 'Concluído',
    'pendente': 'Pendente'
  };

  const currentLabel = statusLabels[currentStatus as keyof typeof statusLabels];
  const newLabel = statusLabels[newStatus as keyof typeof statusLabels];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'text-yellow-600';
      case 'andamento': return 'text-blue-600';
      case 'concluido': return 'text-green-600';
      case 'pendente': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            Confirmar Alteração de Status
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-600 space-y-3">
            <div className="bg-gray-50 p-3 rounded-lg border">
              <p><strong>Processo:</strong> {processNumber}</p>
              <p><strong>Cliente:</strong> {clientName}</p>
            </div>
            
            <div className="flex items-center justify-center space-x-4 py-2">
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 ${getStatusColor(currentStatus)}`}>
                  {currentLabel}
                </span>
                <p className="text-xs text-gray-500 mt-1">Status atual</p>
              </div>
              
              <div className="text-gray-400">→</div>
              
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 ${getStatusColor(newStatus)}`}>
                  {newLabel}
                </span>
                <p className="text-xs text-gray-500 mt-1">Novo status</p>
              </div>
            </div>

            <p className="text-center text-sm">
              Tem certeza que deseja alterar o status deste processo?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 text-gray-800">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={`${
              newStatus === 'concluido' 
                ? 'bg-green-600 hover:bg-green-700' 
                : newStatus === 'andamento'
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
          >
            Confirmar Alteração
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}