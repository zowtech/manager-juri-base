import React from "react";
import { useQuery } from "@tanstack/react-query";

/** ---------------------------
 *  Tipos (compatíveis com o backend atual)
 *  --------------------------*/
type CaseItem = {
  id: string;
  clientName: string | null;
  processType?: string | null;
  processNumber?: string | null;
  description?: string | null;
  dueDate?: string | null;
  hearingDate?: string | null;
  startDate?: string | null;
  observacoes?: string | null;
  companyId?: number | null;

  status: "novo" | "pendente" | "atrasado" | "concluido";
  bucket?: "novo" | "pendente" | "atrasado" | "concluido";
  isOverdue?: boolean;

  archived?: boolean;
  deleted?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;

  employeeId?: string | null;
  employeeName?: string | null;
  employeeRegistration?: string | null;

  matricula?: string | null;   // alias para UI
  registration?: string | null;// alias para UI
  employee?: {
    id?: string | null;
    name?: string | null;
    registration?: string | null;
  } | null;
  process?: { number?: string | null } | null;
};

type Stats = {
  total: number;
  novo: number;
  pendente: number;
  atrasado: number;
  concluido: number;
  // chaves em plural (compatibilidade com UIs antigas)
  novos?: number;
  pendentes?: number;
  atrasados?: number;
  concluidos?: number;
  // objeto agrupado (se a UI esperava)
  cards?: { novo?: number; pendente?: number; atrasado?: number; concluido?: number };
};

/** ---------------------------
 *  Helpers
 *  --------------------------*/
function normalizeStats(r?: Partial<Stats>): Stats {
  const novo      = r?.novo      ?? r?.novos      ?? r?.cards?.novo      ?? 0;
  const pendente  = r?.pendente  ?? r?.pendentes  ?? r?.cards?.pendente  ?? 0;
  const atrasado  = r?.atrasado  ?? r?.atrasados  ?? r?.cards?.atrasado  ?? 0;
  const concluido = r?.concluido ?? r?.concluidos ?? r?.cards?.concluido ?? 0;
  const total     = r?.total ?? (novo + pendente + atrasado + concluido);
  return { total, novo, pendente, atrasado, concluido };
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status} - ${url}`);
  return res.json();
}

/** ---------------------------
 *  Componente principal
 *  --------------------------*/
const CasesPage: React.FC = () => {
  // Abas controladas aqui. Pode incluir "novo" e "todos" se quiser expor.
  const [activeTab, setActiveTab] = React.useState<"pendente" | "atrasado" | "concluido">("pendente");

  // Stats para mostrar números nos botões (vem do backend, já corrigido)
  const { data: statsRaw } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetchJSON<Stats>("/api/dashboard/stats"),
    staleTime: 20_000,
  });
  const stats = normalizeStats(statsRaw);

  // Lista de casos: SEMPRE busca já filtrado pelo backend.
  const { data: cases, isLoading, error } = useQuery({
    queryKey: ["cases", activeTab],
    queryFn: () => fetchJSON<CaseItem[]>(`/api/cases?status=${activeTab}`),
    keepPreviousData: true,
    staleTime: 10_000,
  });

  return (
    <div className="cases-page" style={{ display: "grid", gap: 16 }}>
      {/* Cards do topo da página (se a sua UI já renderiza, pode remover esta faixa) */}
      <section className="cards-resumo" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <Card title="Novos"       value={stats.novo} />
        <Card title="Pendentes"   value={stats.pendente} />
        <Card title="Atrasados"   value={stats.atrasado} />
        <Card title="Concluídos"  value={stats.concluido} />
      </section>

      {/* Abas (botões) — agora SEM sobreposição porque cada aba consulta a API filtrada */}
      <section className="tabs">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <TabButton
            active={activeTab === "pendente"}
            onClick={() => setActiveTab("pendente")}
            label={`Pendentes${Number.isFinite(stats.pendente) ? ` (${stats.pendente})` : ""}`}
          />
          <TabButton
            active={activeTab === "atrasado"}
            onClick={() => setActiveTab("atrasado")}
            label={`Atrasados${Number.isFinite(stats.atrasado) ? ` (${stats.atrasado})` : ""}`}
          />
          <TabButton
            active={activeTab === "concluido"}
            onClick={() => setActiveTab("concluido")}
            label={`Concluídos${Number.isFinite(stats.concluido) ? ` (${stats.concluido})` : ""}`}
          />
        </div>
      </section>

      {/* Lista */}
      <section className="lista">
        {isLoading && <div>Carregando...</div>}
        {error && <div style={{ color: "crimson" }}>Falha ao carregar: {(error as Error).message}</div>}
        {!isLoading && !error && (
          <CasesTable items={cases ?? []} />
        )}
      </section>
    </div>
  );
};

/** ---------------------------
 *  UI boba (substitua por seus componentes de design/shadcn se quiser)
 *  --------------------------*/
const Card: React.FC<{ title: string; value: number }> = ({ title, value }) => (
  <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
    <div style={{ fontSize: 14, color: "#6b7280" }}>{title}</div>
    <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
  </div>
);

const TabButton: React.FC<{ label: string; active?: boolean; onClick?: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid",
      borderColor: active ? "#111827" : "#e5e7eb",
      background: active ? "#111827" : "white",
      color: active ? "white" : "#111827",
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);

const CasesTable: React.FC<{ items: CaseItem[] }> = ({ items }) => {
  if (!items?.length) {
    return <div style={{ color: "#6b7280" }}>Nenhum processo encontrado para esta aba.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: 8 }}>Nº Processo</th>
            <th style={{ padding: 8 }}>Cliente</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Prazo</th>
            <th style={{ padding: 8 }}>Funcionário</th>
            <th style={{ padding: 8 }}>Matrícula</th>
            <th style={{ padding: 8 }}>Atualizado em</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: 8 }}>{c.processNumber || c.process?.number || "-"}</td>
              <td style={{ padding: 8 }}>{c.clientName || "-"}</td>
              <td style={{ padding: 8, textTransform: "capitalize" }}>{c.bucket || c.status}</td>
              <td style={{ padding: 8 }}>{c.dueDate ? new Date(c.dueDate).toLocaleDateString("pt-BR") : "-"}</td>
              <td style={{ padding: 8 }}>{c.employeeName || c.employee?.name || "-"}</td>
              <td style={{ padding: 8 }}>{c.employeeRegistration || c.matricula || c.employee?.registration || "-"}</td>
              <td style={{ padding: 8 }}>{c.updatedAt ? new Date(c.updatedAt).toLocaleString("pt-BR") : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CasesPage;
