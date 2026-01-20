// src/pages/ReversaoSenhas.jsx
import { useState, useEffect } from 'react';
import { listarReversoesPendentes, executarReversaoManual, historicoReversoes, getConfigReversao, atualizarConfigReversao } from '../services/api';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

function ReversaoSenhas({ user }) {
  const [pendentes, setPendentes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('pendentes');
  const [horarioReversao, setHorarioReversao] = useState('19:00');
  const [configReversao, setConfigReversao] = useState({ ativa: true, horario: '19:00' });

  const carregarDados = async () => {
    try {
      const [dataPendentes, dataHistorico, dataConfig] = await Promise.all([
        listarReversoesPendentes(),
        historicoReversoes(),
        getConfigReversao()
      ]);
      
      setPendentes(dataPendentes.pendentes || []);
      setHistorico(dataHistorico.reversoes || []);
      setHorarioReversao(dataPendentes.horario_reversao || '19:00');
      setConfigReversao(dataConfig);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  useEffect(() => {
    carregarDados();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarDados, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExecutarReversao = async () => {
    const result = await Swal.fire({
      title: 'Executar Reversão Manual?',
      html: `
        <p>Isso irá <strong>reverter TODAS as ${pendentes.length} senhas</strong> alteradas hoje para suas senhas antigas.</p>
        <p style="color: #dc2626; font-weight: 600;">Esta operação pode demorar vários minutos!</p>
        <p>Normalmente isso é feito automaticamente às ${horarioReversao}.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, reverter agora',
      cancelButtonText: 'Cancelar',
      width: 600,
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const resultado = await executarReversaoManual();
      toast.success(`Reversão concluída!\n\nSucessos: ${resultado.sucesso}\nErros: ${resultado.erro}`);
      carregarDados();
    } catch (error) {
      toast.error('Erro ao executar reversão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReversao = async () => {
    const novoStatus = !configReversao.ativa;
    
    const result = await Swal.fire({
      title: novoStatus ? 'Ativar Reversão Automática?' : 'Desativar Reversão Automática?',
      text: novoStatus 
        ? 'As senhas serão revertidas automaticamente às 19h todos os dias.'
        : 'As senhas NÃO serão mais revertidas automaticamente. Você terá que fazer manualmente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: novoStatus ? '#047857' : '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: novoStatus ? 'Ativar' : 'Desativar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await atualizarConfigReversao({ ativa: novoStatus });
      toast.success(`Reversão automática ${novoStatus ? 'ATIVADA' : 'DESATIVADA'}!`);
      carregarDados();
    } catch (error) {
      toast.error('Erro ao atualizar configuração: ' + error.message);
    }
  };

  const calcularTempoRestante = () => {
    const agora = new Date();
    const [hora, minuto] = horarioReversao.split(':');
    const reversao = new Date();
    reversao.setHours(parseInt(hora), parseInt(minuto), 0, 0);
    
    if (reversao < agora) {
      reversao.setDate(reversao.getDate() + 1);
    }
    
    const diff = reversao - agora;
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${horas}h ${minutos}min`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Reversão de Senhas</h1>
          <p style={styles.subtitle}>
            Controle e agendamento da reversão automática (19h)
          </p>
        </div>
        {pendentes.length > 0 && (
          <button onClick={handleExecutarReversao} disabled={loading} style={styles.btnDanger}>
            {loading ? 'Revertendo...' : 'Reverter Agora'}
          </button>
        )}
      </div>

      {/* CARDS DE INFORMAÇÃO */}
      <div style={styles.cardsGrid}>
        <div style={styles.infoCard}>
          <div style={styles.cardValue}>{horarioReversao}</div>
          <div style={styles.cardLabel}>Horário agendado</div>
        </div>

        <div style={styles.infoCard}>
          <div style={styles.cardValue}>{pendentes.length}</div>
          <div style={styles.cardLabel}>Senhas para reverter hoje</div>
        </div>

        <div style={styles.infoCard}>
          <div style={styles.cardValue}>{calcularTempoRestante()}</div>
          <div style={styles.cardLabel}>Tempo restante</div>
        </div>

        <div style={styles.infoCard}>
          <div style={styles.cardValue}>{historico.length}</div>
          <div style={styles.cardLabel}>Reversões históricas</div>
        </div>
      </div>

      {/* ABAS */}
      <div style={styles.tabs}>
        <button
          onClick={() => setAbaAtiva('pendentes')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'pendentes' ? styles.tabActive : {}),
          }}
        >
          Pendentes Hoje ({pendentes.length})
        </button>
        <button
          onClick={() => setAbaAtiva('historico')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'historico' ? styles.tabActive : {}),
          }}
        >
          Histórico de Reversões
        </button>
        <button
          onClick={() => setAbaAtiva('config')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'config' ? styles.tabActive : {}),
          }}
        >
          Configuração
        </button>
      </div>

      {/* CONTEÚDO */}
      <div style={styles.tabContent}>
        {/* ABA: PENDENTES */}
        {abaAtiva === 'pendentes' && (
          <div>
            <div style={styles.warningBox}>
              <strong>Como funciona:</strong> Todas as senhas alteradas durante o dia serão 
              automaticamente revertidas às <strong>{horarioReversao}</strong> para suas senhas anteriores. 
              Isso garante que as credenciais voltem ao estado original após o expediente.
            </div>

            {pendentes.length === 0 ? (
              <div style={styles.empty}>
                Nenhuma reversão pendente para hoje. Todas as senhas estão em seu estado original.
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <div style={styles.tableWrapper}>
                  <div style={styles.tableHeader}>
                    <div style={{ width: '150px', flexShrink: 0 }}>Cliente</div>
                    <div style={{ width: '280px', flexShrink: 0 }}>Usuário</div>
                    <div style={{ width: '140px', flexShrink: 0 }}>Senha Atual (Nova)</div>
                    <div style={{ width: '140px', flexShrink: 0 }}>Reverter Para</div>
                    <div style={{ width: '150px', flexShrink: 0 }}>Alterada em</div>
                    <div style={{ width: '150px', flexShrink: 0 }}>Solicitante</div>
                  </div>
                  {pendentes.map((item, idx) => (
                    <div key={idx} style={styles.tableRow}>
                      <div style={{ width: '150px', flexShrink: 0, fontWeight: '600', ...styles.tableCell }} title={item.cliente}>
                        {item.cliente}
                      </div>
                      <div style={{ width: '280px', flexShrink: 0, ...styles.tableCell }} title={item.usuario}>
                        {item.usuario}
                      </div>
                      <div style={{ 
                        width: '140px',
                        flexShrink: 0,
                        fontFamily: 'monospace',
                        background: '#d1fae5',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        ...styles.tableCell
                      }} title={item.senha_nova}>
                        {item.senha_nova}
                      </div>
                      <div style={{ 
                        width: '140px',
                        flexShrink: 0,
                        fontFamily: 'monospace',
                        background: '#fee2e2',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        ...styles.tableCell
                      }} title={item.senha_antiga}>
                        {item.senha_antiga || '(não disponível)'}
                      </div>
                      <div style={{ width: '150px', flexShrink: 0, fontSize: '13px', ...styles.tableCell }} title={item.data_hora}>
                        {item.data_hora}
                      </div>
                      <div style={{ width: '150px', flexShrink: 0, ...styles.tableCell }} title={item.solicitante}>
                        {item.solicitante}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: HISTÓRICO */}
        {abaAtiva === 'historico' && (
          <div>
            {historico.length === 0 ? (
              <div style={styles.empty}>Nenhuma reversão executada ainda.</div>
            ) : (
              <div>
                <p>Histórico de reversões executadas anteriormente.</p>
              </div>
            )}
          </div>
        )}

        {/* ABA: CONFIGURAÇÃO */}
        {abaAtiva === 'config' && (
          <div>
            <h3 style={styles.sectionTitle}>Configuração do Agendamento</h3>
            
            <div style={styles.configCard}>
              <div style={styles.configItem}>
                <label style={styles.configLabel}>Status da Reversão Automática:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    ...styles.statusBadge,
                    background: configReversao.ativa ? '#d1fae5' : '#fee2e2',
                    borderColor: configReversao.ativa ? '#047857' : '#dc2626',
                    color: configReversao.ativa ? '#065f46' : '#991b1b',
                  }}>
                    {configReversao.ativa ? 'ATIVA' : 'DESATIVADA'}
                  </div>
                  <button onClick={handleToggleReversao} style={styles.btnToggle}>
                    {configReversao.ativa ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
                <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                  {configReversao.ativa 
                    ? 'As senhas serão revertidas automaticamente às 19h' 
                    : 'Reversão automática desativada - você terá que reverter manualmente'}
                </small>
              </div>

              <div style={styles.configItem}>
                <label style={styles.configLabel}>Horário de Reversão Automática:</label>
                <input
                  type="time"
                  value={configReversao.horario}
                  style={styles.configInput}
                  disabled
                />
                <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
                  O horário está configurado no agendador do sistema (Task Scheduler/Cron)
                </small>
              </div>

              <div style={styles.configInfo}>
                <h4>Informações do Script</h4>
                <ul style={{ lineHeight: '1.8' }}>
                  <li><strong>Local:</strong> backend/scripts/reverter_senhas_19h.py</li>
                                    <li><strong>Execução:</strong> Automática via Task Scheduler (Windows)</li>
                  <li><strong>Função:</strong> Reverter todas as senhas do dia</li>
                  <li><strong>Log:</strong> backend/data/logs/reversao_YYYYMMDD.txt</li>
                  <li><strong>Status:</strong> {configReversao.ativa ? 'Ativo' : 'Desativado'}</li>
                </ul>
              </div>
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
  btnDanger: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  infoCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '32px',
    marginBottom: '0.5rem',
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '0.3rem',
  },
  cardLabel: {
    fontSize: '13px',
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
  warningBox: {
    padding: '1rem',
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '14px',
    color: '#92400e',
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
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  tableWrapper: {
    minWidth: '1010px',
  },
  tableHeader: {
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
  },
  tableCell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1.5rem',
  },
  configCard: {
    background: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
  },
  configItem: {
    marginBottom: '1.5rem',
  },
  configLabel: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151',
  },
  configInput: {
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    width: '200px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    border: '2px solid',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '14px',
  },
  btnToggle: {
    padding: '8px 16px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
  },
  configInfo: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: '#e0f2fe',
    border: '2px solid #0284c7',
    borderRadius: '8px',
  },
};

export default ReversaoSenhas;
