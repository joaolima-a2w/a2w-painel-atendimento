
import { useState, useEffect } from 'react';
import { listarSolicitacoes, limparSolicitacoes, solicitarMassa, getBases } from '../services/api';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

function PainelAdmin({ user }) {
  const [historico, setHistorico] = useState([]);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('historico');

  useEffect(() => {
    carregarHistorico();
    carregarBases();
  }, []);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      const data = await listarSolicitacoes();
      setHistorico(data.solicitacoes || []);
    } catch (error) {
      toast.error('Erro ao carregar histórico: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const carregarBases = async (mostrarToast = false) => {
    setLoading(true);
    try {
      const data = await getBases();
      setBases(data);
      if (mostrarToast) { 
        toast.success(`Bases recarregadas! Total: ${data.length} bases`);
      }
    } catch (error) {
      toast.error('Erro ao carregar bases: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpar = async () => {
    const result = await Swal.fire({
      title: 'Limpar histórico?',
      text: 'Todas as solicitações serão removidas. Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, limpar tudo',
      cancelButtonText: 'Cancelar',
    });

if (!result.isConfirmed) return;
    try {
      await limparSolicitacoes();
      toast.success('Solicitações limpas com sucesso!');
      carregarHistorico();
    } catch (error) {
      toast.error('Erro ao limpar: ' + error.message);
    }
  };

  const handleAlteracaoMassa = async () => {
    const result = await Swal.fire({
      title: 'Alteração em Massa',
      html: `
        <p>Isso irá alterar a senha de <strong>TODAS as ${bases.length} bases</strong>.</p>
        <p>Este processo pode demorar vários minutos.</p>
        <p style="color: #dc2626; font-weight: 600;">Tem certeza que deseja continuar?</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, executar',
      cancelButtonText: 'Cancelar',
      width: 600,
    });

if (!result.isConfirmed) return;
    setLoading(true);
    try {
      const resultado = await solicitarMassa();
      toast.success(`Concluído!\n\nSucessos: ${resultado.sucesso}\nErros: ${resultado.erro}`);
      carregarHistorico();
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const historicoFiltrado = historico.filter((item) =>
    item.cliente?.toLowerCase().includes(filtro.toLowerCase()) ||
    item.solicitante?.toLowerCase().includes(filtro.toLowerCase())
  );

  const basesFiltradas = bases.filter((item) =>
    item.empresa?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Painel Administrativo</h1>
        <p style={styles.subtitle}>
          Bem-vindo, <strong>{user?.name}</strong>
        </p>
      </div>

      {/* ABAS */}
      <div style={styles.tabs}>
        <button
          onClick={() => setAbaAtiva('historico')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'historico' ? styles.tabActive : {}),
          }}
        >
          Histórico ({historico.length})
        </button>
        <button
          onClick={() => setAbaAtiva('bases')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'bases' ? styles.tabActive : {}),
          }}
        >
          Bases ({bases.length})
        </button>
        <button
          onClick={() => setAbaAtiva('massa')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'massa' ? styles.tabActive : {}),
          }}
        >
          Execução em Massa
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={styles.tabContent}>
        {/* ABA: HISTÓRICO */}
        {abaAtiva === 'historico' && (
          <div>
            <div style={styles.actionsBar}>
              <input
                type="text"
                placeholder="Filtrar por cliente ou solicitante..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                style={styles.searchInput}
              />
              <div style={styles.actionsButtons}>
                <button onClick={carregarHistorico} disabled={loading} style={styles.btnPrimary}>
                  Atualizar
                </button>
              </div>
            </div>

            {loading ? (
              <div style={styles.loading}>Carregando...</div>
            ) : historicoFiltrado.length === 0 ? (
              <div style={styles.empty}>Nenhuma solicitação encontrada</div>
            ) : (
              <div style={styles.table}>
                <div style={styles.tableHeader}>
                  <div style={{ width: '150px', flexShrink: 0 }}>Cliente</div>
                  <div style={{ width: '280px', flexShrink: 0 }}>Usuário</div>
                  <div style={{ width: '150px', flexShrink: 0 }}>Senha Antiga</div>
                  <div style={{ width: '150px', flexShrink: 0 }}>Senha Nova</div>
                  <div style={{ width: '180px', flexShrink: 0 }}>Solicitante</div>
                  <div style={{ width: '160px', flexShrink: 0 }}>Data/Hora</div>
                </div>
                {historicoFiltrado.map((item, idx) => (
                  <div key={idx} style={styles.tableRow}>
                    <div style={{ width: '150px', flexShrink: 0, ...styles.tableCell }} title={item.cliente}>
                      {item.cliente}
                    </div>
                    <div style={{ width: '280px', flexShrink: 0, ...styles.tableCell }} title={item.usuario}>
                      {item.usuario}
                    </div>
                    <div style={{ 
                      width: '150px',
                      flexShrink: 0,
                      fontFamily: 'monospace', 
                      background: '#fee2e2', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      ...styles.tableCell 
                    }} title={item.senha_antiga}>
                      {item.senha_antiga || '-'}
                    </div>
                    <div style={{ 
                      width: '150px',
                      flexShrink: 0,
                      fontFamily: 'monospace', 
                      background: '#d1fae5', 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      ...styles.tableCell 
                    }} title={item.senha}>
                      {item.senha}
                    </div>
                    <div style={{ width: '180px', flexShrink: 0, ...styles.tableCell }} title={item.solicitante}>
                      {item.solicitante}
                    </div>
                    <div style={{ width: '160px', flexShrink: 0, fontSize: '13px', color: '#666', ...styles.tableCell }} title={item.data_hora}>
                      {item.data_hora}
                    </div>
                  </div>
                ))}

              </div>
            )}

            <div style={styles.totalBadge}>
              Total: <strong>{historicoFiltrado.length}</strong> registros
            </div>
          </div>
        )}

        {/* ABA: BASES CADASTRADAS */}
        {abaAtiva === 'bases' && (
          <div>
            <div style={styles.actionsBar}>
              <input
                type="text"
                placeholder="Filtrar por empresa..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                style={styles.searchInput}
              />
              <button onClick={carregarBases} disabled={loading} style={styles.btnPrimary}>
                {loading ? 'Carregando...' : 'Recarregar Bases'}
              </button>
            </div>

            <div style={styles.infoBox}>
              <strong>Informação:</strong> As bases são carregadas do arquivo Excel localizado em data/bases.xlsx. 
              Para adicionar/editar bases, edite o arquivo Excel e clique em Recarregar Bases.
            </div>

            {basesFiltradas.length === 0 ? (
              <div style={styles.empty}>Nenhuma base encontrada</div>
            ) : (
              <div style={styles.tableContainer}>
                <div style={styles.tableWrapper}>
                  <div style={styles.tableHeader}>
                    <div style={{ width: '180px', flexShrink: 0 }}>Empresa</div>
                    <div style={{ width: '350px', flexShrink: 0 }}>URL</div>
                    <div style={{ width: '280px', flexShrink: 0 }}>Usuário</div>
                    {user?.role === 'admin' && <div style={{ width: '140px', flexShrink: 0 }}>Senha Atual</div>}
                  </div>
                  {basesFiltradas.map((base, idx) => (
                    <div key={idx} style={styles.tableRow}>
                      <div style={{ width: '180px', flexShrink: 0, fontWeight: '600', ...styles.tableCell }} title={base.empresa}>
                        {base.empresa}
                      </div>
                      <div style={{ width: '350px', flexShrink: 0, fontSize: '13px', ...styles.tableCell }} title={base.url}>
                        {base.url}
                      </div>
                      <div style={{ width: '280px', flexShrink: 0, ...styles.tableCell }} title={base.usuario}>
                        {base.usuario}
                      </div>
                      {user?.role === 'admin' && (
                        <div style={{ width: '140px', flexShrink: 0, fontFamily: 'monospace', fontSize: '12px', ...styles.tableCell }} title={base.senha}>
                          {base.senha || '(não disponível)'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.totalBadge}>
              Total: <strong>{basesFiltradas.length}</strong> bases
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2.5rem 3rem',
    maxWidth: '1400px',
    background: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    borderBottom: '2px solid #e5e7eb',
  },
  tab: {
  padding: '12px 20px',
  background: 'transparent',
  border: 'none',
  borderBottomWidth: '3px',  
  borderBottomStyle: 'solid',
  borderBottomColor: 'transparent',
  color: '#666',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '14px',
  transition: 'all 0.2s',
},
tabActive: {
  color: '#047857',
  borderBottomColor: '#047857', 
},
  tabContent: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  actionsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  actionsButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  searchInput: {
    padding: '10px 16px',
    border: '2px solid #d0d7e0',
    borderRadius: '8px',
    fontSize: '14px',
    flex: '1',
    minWidth: '300px',
  },
  btnPrimary: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
    btnDanger: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '18px',
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '16px',
    color: '#999',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    marginBottom: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  tableWrapper: {
    minWidth: '1010px', // largura mínima da tabela
  },
  table: {
    display: 'block',
    overflowX: 'auto', 
    overflowY: 'visible',
  },
  tableHeader: {
    display: 'flex',
    gap: '1rem',
    padding: '12px 16px',
    background: '#f0f9ff',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '14px',
    color: '#047857',
    minWidth: '1200px', 
  },
  tableRow: {
    display: 'flex',
    gap: '1rem',
    padding: '12px 16px',
    background: '#fafafa',
    borderRadius: '8px',
    fontSize: '14px',
    alignItems: 'center',
    transition: 'background 0.2s',
    minWidth: '1200px',  
  },
  tableCell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,  
  },
  totalBadge: {
    marginTop: '1.5rem',
    padding: '12px',
    background: '#f0f9ff',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#047857',
  },
  infoBox: {
    padding: '1rem',
    background: '#e0f2fe',
    border: '2px solid #0284c7',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '14px',
    color: '#0c4a6e',
  },
  warningBox: {
    padding: '1.5rem',
    background: '#fef3c7',
    border: '3px solid #f59e0b',
    borderRadius: '12px',
    marginBottom: '2rem',
    textAlign: 'center',
  },
  massaInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  massaCard: {
    padding: '1.5rem',
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    textAlign: 'center',
  },
  btnMassaExec: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
  },
};

export default PainelAdmin;

