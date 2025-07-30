import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  Link2, 
  Check, 
  X, 
  Plus,
  ExternalLink,
  Folder,
  Clock
} from "lucide-react";

interface DocumentManagerProps {
  caseId: string;
  tipoProcesso?: string;
  documentosSolicitados?: string[];
  documentosAnexados?: any[];
  onUpdateDocuments?: (data: any) => void;
}

export default function DocumentManager({ 
  caseId, 
  tipoProcesso, 
  documentosSolicitados = [], 
  documentosAnexados = [],
  onUpdateDocuments 
}: DocumentManagerProps) {
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentLink, setNewDocumentLink] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  // Documentos padrão por tipo de processo
  const documentosPadrao: Record<string, string[]> = {
    'Trabalhista': [
      'Carteira de Trabalho',
      'Comprovante de Residência',
      'RG',
      'CPF',
      'Comprovantes de Pagamento',
      'Declaração de Testemunhas'
    ],
    'Rescisão Indireta': [
      'Carta de Rescisão',
      'Testemunhas',
      'E-mails/Mensagens',
      'Atestados Médicos',
      'Comprovantes de Falta de Pagamento',
      'Registro de Ponto'
    ],
    'Dano Moral': [
      'Boletim de Ocorrência',
      'Laudos Médicos',
      'Testemunhas',
      'Fotos/Vídeos',
      'Comprovantes de Gastos',
      'Correspondências'
    ],
    'Previdenciário': [
      'Documentos Pessoais',
      'CNIS',
      'Carteira de Trabalho',
      'Laudos Médicos',
      'Comprovantes de Contribuição'
    ],
    'Cível': [
      'Contratos',
      'Comprovantes',
      'Correspondências',
      'Documentos Pessoais'
    ]
  };

  const documentosNecessarios = tipoProcesso ? documentosPadrao[tipoProcesso] || [] : [];
  const documentosCustom = documentosSolicitados.filter(doc => !documentosNecessarios.includes(doc));

  const handleAddCustomDocument = () => {
    if (newDocumentName.trim()) {
      const updatedDocs = [...documentosSolicitados, newDocumentName.trim()];
      onUpdateDocuments?.({
        documentosSolicitados: updatedDocs
      });
      setNewDocumentName("");
    }
  };

  const handleAttachDocument = () => {
    if (newDocumentLink.trim()) {
      const newAttachment = {
        nome: newDocumentName.trim() || "Documento Anexado",
        link: newDocumentLink.trim(),
        dataAnexo: new Date().toISOString(),
        tipo: "link"
      };
      
      const updatedAttachments = [...documentosAnexados, newAttachment];
      onUpdateDocuments?.({
        documentosAnexados: updatedAttachments,
        observacoes
      });
      
      setNewDocumentName("");
      setNewDocumentLink("");
    }
  };

  const getDocumentStatus = (docName: string) => {
    const isAttached = documentosAnexados.some(doc => 
      doc.nome?.toLowerCase().includes(docName.toLowerCase())
    );
    return isAttached;
  };

  return (
    <div className="space-y-6">
      {/* Documentos Solicitados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <FileText className="mr-2 h-5 w-5" />
            Documentos Necessários
            {tipoProcesso && (
              <Badge variant="outline" className="ml-2">
                {tipoProcesso}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Documentos Padrão */}
          {documentosNecessarios.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Documentos Padrão</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {documentosNecessarios.map((doc, index) => {
                  const isAttached = getDocumentStatus(doc);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={isAttached}
                          disabled
                          className={isAttached ? "data-[state=checked]:bg-green-500" : ""}
                        />
                        <span className={`text-sm ${isAttached ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                          {doc}
                        </span>
                      </div>
                      {isAttached ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documentos Customizados */}
          {documentosCustom.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Documentos Específicos</h4>
              <div className="space-y-2">
                {documentosCustom.map((doc, index) => {
                  const isAttached = getDocumentStatus(doc);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox checked={isAttached} disabled />
                        <span className={`text-sm ${isAttached ? 'text-blue-700 font-medium' : 'text-blue-600'}`}>
                          {doc}
                        </span>
                      </div>
                      {isAttached ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Adicionar Documento Customizado */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Documento Específico</h4>
            <div className="flex space-x-2">
              <Input
                placeholder="Nome do documento"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddCustomDocument} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anexar Documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <Upload className="mr-2 h-5 w-5" />
            Anexar Documentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <Folder className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-800">Organização no Drive</h4>
                <p className="text-xs text-blue-600 mt-1">
                  Recomendamos criar uma pasta específica para este processo no seu Google Drive ou outro serviço de nuvem.
                  Estrutura sugerida: Processos/{tipoProcesso || 'Geral'}/{caseId}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Nome do Documento</Label>
              <Input
                placeholder="Ex: Carteira de Trabalho - João Silva"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Link do Documento</Label>
              <Input
                placeholder="Ex: https://drive.google.com/file/..."
                value={newDocumentLink}
                onChange={(e) => setNewDocumentLink(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Observações</Label>
            <Textarea
              placeholder="Observações sobre os documentos..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleAttachDocument} className="w-full">
            <Link2 className="w-4 h-4 mr-2" />
            Anexar Link do Documento
          </Button>
        </CardContent>
      </Card>

      {/* Documentos Anexados */}
      {documentosAnexados.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <Check className="mr-2 h-5 w-5 text-green-600" />
              Documentos Anexados ({documentosAnexados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documentosAnexados.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.nome}</p>
                      <p className="text-xs text-gray-500">
                        Anexado em {new Date(doc.dataAnexo).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Anexado
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <a href={doc.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}