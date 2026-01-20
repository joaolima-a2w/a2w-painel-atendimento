// src/pages/LogsAtividades.jsx
import { useState, useEffect } from 'react';
import { getBases } from '../services/api';
import { toast } from 'react-toastify';

function LogsAtividades({ user }) {
  const [logs, setLogs] = useState([]);
  const [bases, setBases] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, requests: 0, responses: 0, sessoes: 0 });

  useEffect(() => {
    carregarBases();
  }, []);

  const carregarBases = async () => {
    try {
      const data = await getBases();
      setBases(data);
    } catch (error) {
      console.error('Erro ao carregar bases:', error);
    }
  };

  const carregarLogs = async () => {
    if (!empresaSelecionada) {
      toast.warning('Selecione uma empresa');
      return;
    }

    setLoading(true);
    try {
      const basicAuth = localStorage.getItem('basic_auth');
      const response = await fetch(`http://192.168.0.190:8000/logs/atividades/${empresaSelecionada}`, {
        headers: { 'Authorization': `Basic ${basicAuth}` }
      });

      if (!response.ok) throw new Error('Erro ao carregar logs');

      const data = await response.json();
      const logsData = data.logs || [];
      
      setLogs(logsData);
      
      // Calcular estatísticas
      setStats({
        total: logsData.length,
        requests: logsData.filter(l => l.tipo === 'request').length,
        responses: logsData.filter(l => l.tipo === 'response').length,
        sessoes: logsData.filter(l => l.tipo === 'sessao_iniciada').length
      });
      
      toast.success(`${logsData.length} eventos carregados`);
    } catch (error) {
      toast.error('Erro ao carregar logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    if (logs.length === 0) {
      toast.warning('Nenhum log para exportar');
      return;
    }

    const csv = [
      ['Timestamp', 'Empresa', 'Tipo', 'Method', 'URL', 'Status'].join(','),
      ...logsFiltrados.map(log => [
        log.timestamp,
        log.empresa,
        log.tipo,
        log.method || '',
        log.url || '',
        log.status || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${empresaSelecionada}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success('CSV exportado!');
  };

  const logsFiltrados = filtroTipo === 'todos' 
    ? logs 
    : logs.filter(log => log.tipo === filtroTipo);

  const getTipoLabel = (tipo) => {
    const labels = {
      'request': 'Request',
      'response': 'Response',
      'sessao_iniciada': 'Sessão Iniciada',
      'sessao_encerrada': 'Sessão Encerrada',
      'navegacao': 'Navegação',
    };
    return labels[tipo] || tipo;
  };

  const getTipoCor = (tipo) => {
    const cores = {
      'request': '#0284c7',
      'response': '#10b981',
      'sessao_iniciada': '#047857',
      'sessao_encerrada': '#dc2626',
    };
    return cores[tipo] || '#6b7280';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Logs de Atividades</h1>
          <p style={styles.subtitle}>
            Monitoramento de sessões e requisições dos sistemas
          </p>
        </div>
        {logs.length > 0 && (
          <button onClick={exportarCSV} style={styles.btnExport}>
            Exportar CSV
          </button>
        )}
      </div>

      {/* CARDS DE ESTATÍSTICAS */}
      {logs.length > 0 && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={styles.statLabel}>Total de Eventos</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.requests}</div>
            <div style={styles.statLabel}>Requests</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.responses}</div>
            <div style={styles.statLabel}>Responses</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statValue}>{stats.sessoes}</div>
            <div style={styles.statLabel}>Sessões</div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Filtros</h2>
        
        <div style={styles.filtersGrid}>
          <div style={styles.filterItem}>
            <label style={styles.label}>Empresa *</label>
            <select
              value={empresaSelecionada}
              onChange={(e) => setEmpresaSelecionada(e.target.value)}
              style={styles.select}
            >
              <option value="">Selecione uma empresa</option>
              {bases.map((base) => (
                <option key={base.empresa} value={base.empresa}>
                  {base.empresa}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>Tipo de Evento</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={styles.select}
            >
              <option value="todos">Todos</option>
              <option value="sessao_iniciada">Sessões Iniciadas</option>
              <option value="sessao_encerrada">Sessões Encerradas</option>
              <option value="request">Requests HTTP</option>
              <option value="response">Responses HTTP</option>
            </select>
          </div>

          <div style={styles.filterItem}>
            <label style={styles.label}>&nbsp;</label>
            <button
              onClick={carregarLogs}
              disabled={loading}
              style={{
                ...styles.btnPrimary,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Carregando...' : 'Buscar Logs'}
            </button>
          </div>
        </div>
      </div>

      {/* TABELA DE LOGS */}
      {logs.length > 0 && (
        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h3 style={styles.cardTitle}>
              Eventos Capturados ({logsFiltrados.length})
            </h3>
          </div>

          <div style={styles.tableContainer}>
            <div style={styles.tableWrapper}>
              <div style={styles.tableHeaderRow}>
                <div style={{ width: '160px', flexShrink: 0 }}>Timestamp</div>
                <div style={{ width: '180px', flexShrink: 0 }}>Tipo</div>
                <div style={{ width: '100px', flexShrink: 0 }}>Method</div>
                <div style={{ width: '80px', flexShrink: 0 }}>Status</div>
                <div style={{ flex: 1 }}>URL</div>
              </div>

              {logsFiltrados.map((log, idx) => (
                <div key={idx} style={styles.tableRow}>
                  <div style={{ width: '160px', flexShrink: 0, fontSize: '13px', ...styles.tableCell }}>
                    {log.timestamp}
                  </div>
                  <div style={{ width: '180px', flexShrink: 0, ...styles.tableCell }}>
                    <span style={{
                      padding: '4px 10px',
                      background: getTipoCor(log.tipo) + '20',
                      color: getTipoCor(log.tipo),
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}>
                      {getTipoLabel(log.tipo)}
                    </span>
                  </div>
                  <div style={{ width: '100px', flexShrink: 0, ...styles.tableCell }}>
                    {log.method || '-'}
                  </div>
                  <div style={{ width: '80px', flexShrink: 0, ...styles.tableCell }}>
                    {log.status ? (
                      <span style={{
                        color: log.status < 400 ? '#047857' : '#dc2626',
                        fontWeight: '600',
                      }}>
                        {log.status}
                      </span>
                    ) : '-'}
                  </div>
                  <div style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace', ...styles.tableCell }} title={log.url}>
                    {log.url || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 && !loading && empresaSelecionada && (
        <div style={styles.empty}>
          Nenhum log encontrado para esta empresa
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '2.5rem 3rem',
    maxWidth: '1600px',
    background: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  btnExport: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '0.5rem',
  },
  statLabel: {
    fontSize: '13px',
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  card: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '2rem',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1rem',
    margin: 0,
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  filterItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#333',
    marginBottom: '0.5rem',
  },
  select: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  btnPrimary: {
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  tableWrapper: {
    minWidth: '900px',
  },
  tableHeaderRow: {
    display: 'flex',
    gap: '1rem',
    padding: '12px 16px',
    background: '#f0f9ff',
    fontWeight: '700',
    fontSize: '14px',
    color: '#047857',
  },
    tableRow: {
    display: 'flex',
    gap: '1rem',
    padding: '12px 16px',
    background: '#fafafa',
    fontSize: '14px',
    alignItems: 'center',
    borderTop: '1px solid #e5e7eb',
    transition: 'background 0.2s',
  },
  tableCell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  empty: {
    textAlign: 'center',
    padding: '4rem',
    fontSize: '16px',
    color: '#999',
    background: 'white',
    borderRadius: '12px',
  },
};

export default LogsAtividades;
