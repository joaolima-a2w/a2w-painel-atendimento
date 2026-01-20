// src/pages/Agendamentos.jsx
import { useState, useEffect } from 'react';
import { 
  listarAgendamentos, 
  criarAgendamento, 
  atualizarAgendamento, 
  deletarAgendamento,
  toggleAgendamento,
  listarReversoesPendentes,
  executarReversaoManual,
  solicitarMassa,
  listarSolicitacoes,
  getConfigReversao,
  atualizarConfigReversao
} from '../services/api';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

function Agendamentos({ user }) {
  const [agendamentos, setAgendamentos] = useState([]);
  const [pendentes, setPendentes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('agendamentos');
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({});
  const [configReversao, setConfigReversao] = useState({ ativa: true, horario: '19:00' });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [dataAgendamentos, dataPendentes, dataHistorico, dataConfig] = await Promise.all([
        listarAgendamentos(),
        listarReversoesPendentes().catch(() => ({ pendentes: [] })),
        listarSolicitacoes().catch(() => ({ solicitacoes: [] })),
        getConfigReversao().catch(() => ({ ativa: true, horario: '19:00' }))
      ]);
      
      setAgendamentos(dataAgendamentos.agendamentos || []);
      setPendentes(dataPendentes.pendentes || []);
      
      // Filtrar histórico para exec massa e reversões
      const todasSolicitacoes = dataHistorico.solicitacoes || [];
      const execucoes = todasSolicitacoes.filter(s => 
        s.status === 'revertida' || s.observacao?.includes('massa')
      );
      setHistorico(execucoes);
      
      setConfigReversao(dataConfig);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCriar = async () => {
    if (!formData.nome || !formData.tipo || !formData.data_hora) {
      toast.warning('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await criarAgendamento(formData);
      toast.success('Agendamento criado com sucesso!');
      setCriando(false);
      setFormData({});
      carregarDados();
    } catch (error) {
      toast.error('Erro ao criar: ' + error.message);
    }
  };

  const handleEditar = (agendamento) => {
    setEditando(agendamento.id);
    setFormData({
      nome: agendamento.nome,
      tipo: agendamento.tipo,
      data_hora: agendamento.data_hora,
      recorrencia: agendamento.recorrencia,
    });
  };

  const handleSalvarEdicao = async () => {
    try {
      await atualizarAgendamento(editando, formData);
      toast.success('Agendamento atualizado!');
      setEditando(null);
      setFormData({});
      carregarDados();
    } catch (error) {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  };

  const handleDeletar = async (id) => {
    const result = await Swal.fire({
      title: 'Deletar agendamento?',
      text: 'Esta ação não pode ser desfeita.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await deletarAgendamento(id);
      toast.success('Agendamento deletado!');
      carregarDados();
    } catch (error) {
      toast.error('Erro ao deletar: ' + error.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      const result = await toggleAgendamento(id);
      toast.success(result.ativo ? 'Agendamento ativado!' : 'Agendamento pausado!');
      carregarDados();
    } catch (error) {
      toast.error('Erro: ' + error.message);
    }
  };

  const handleExecutarMassa = async () => {
    const result = await Swal.fire({
      title: 'Executar Alteração em Massa?',
      html: `
        <p>Isso irá alterar a senha de <strong>TODAS as bases</strong> cadastradas.</p>
        <p style="color: #dc2626; font-weight: 600;">Esta operação pode demorar vários minutos!</p>
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
      carregarDados();
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecutarReversao = async () => {
    const result = await Swal.fire({
      title: 'Executar Reversão Manual?',
      html: `
        <p>Isso irá <strong>reverter TODAS as ${pendentes.length} senhas</strong> alteradas hoje.</p>
        <p style="color: #dc2626; font-weight: 600;">Esta operação pode demorar vários minutos!</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, reverter',
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
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReversaoAuto = async () => {
    const novoStatus = !configReversao.ativa;
    
    const result = await Swal.fire({
      title: novoStatus ? 'Ativar Reversão Automática?' : 'Desativar Reversão Automática?',
      text: novoStatus 
        ? 'As senhas serão revertidas automaticamente às 19h todos os dias.'
        : 'As senhas NÃO serão mais revertidas automaticamente.',
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
      toast.error('Erro: ' + error.message);
    }
  };

  const getTipoLabel = (tipo) => {
    return tipo === 'execucao_massa' ? 'Execução em Massa' : 'Reversão de Senhas';
  };

  const getRecorrenciaLabel = (rec) => {
    const labels = {
      'unico': 'Única',
      'diario': 'Diário',
      'semanal': 'Semanal',
      'mensal': 'Mensal',
    };
    return labels[rec] || rec;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Agendamentos e Automação</h1>
          <p style={styles.subtitle}>
            Gerencie execuções automáticas, reversões e agendamentos
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setCriando(true); setFormData({ recorrencia: 'unico' }); }} style={styles.btnPrimary}>
            Novo Agendamento
          </button>
        )}
      </div>

      {/* ABAS */}
      <div style={styles.tabs}>
        <button
          onClick={() => setAbaAtiva('agendamentos')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'agendamentos' ? styles.tabActive : {}),
          }}
        >
          Agendamentos ({agendamentos.length})
        </button>
        <button
          onClick={() => setAbaAtiva('pendentes')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'pendentes' ? styles.tabActive : {}),
          }}
        >
          Pendentes Hoje ({pendentes.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setAbaAtiva('executar')}
            style={{
              ...styles.tab,
              ...(abaAtiva === 'executar' ? styles.tabActive : {}),
            }}
          >
            Execução Manual
          </button>
        )}
        <button
          onClick={() => setAbaAtiva('historico')}
          style={{
            ...styles.tab,
            ...(abaAtiva === 'historico' ? styles.tabActive : {}),
          }}
        >
          Histórico ({historico.length})
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={styles.tabContent}>
        {/* ABA: AGENDAMENTOS */}
        {abaAtiva === 'agendamentos' && (
          <div>
            {loading ? (
              <div style={styles.loading}>⏳ Carregando...</div>
            ) : agendamentos.length === 0 ? (
              <div style={styles.empty}>
                <div>Nenhum agendamento configurado ainda.</div>
                {isAdmin && (
                  <button onClick={() => setCriando(true)} style={{ ...styles.btnPrimary, marginTop: '1rem' }}>
                    Criar Primeiro Agendamento
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.grid}>
                {agendamentos.map((ag) => (
                  <div key={ag.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={styles.cardTitle}>{ag.nome}</h3>
                        <div style={{
                          ...styles.badge,
                          background: ag.ativo ? '#d1fae5' : '#fee2e2',
                          color: ag.ativo ? '#065f46' : '#991b1b',
                        }}>
                          {ag.ativo ? 'Ativo' : 'Pausado'}
                        </div>
                      </div>
                      <div style={styles.cardType}>{getTipoLabel(ag.tipo)}</div>
                    </div>

                    <div style={styles.cardBody}>
                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Próxima execução:</span>
                        <span style={styles.infoValue}>{ag.proxima_execucao}</span>
                      </div>

                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Recorrência:</span>
                        <span style={styles.infoValue}>{getRecorrenciaLabel(ag.recorrencia)}</span>
                      </div>

                      {ag.ultima_execucao && (
                        <div style={styles.infoRow}>
                          <span style={styles.infoLabel}>Última execução:</span>
                          <span style={styles.infoValue}>{ag.ultima_execucao}</span>
                        </div>
                      )}

                      <div style={styles.infoRow}>
                        <span style={styles.infoLabel}>Criado por:</span>
                        <span style={styles.infoValue}>{ag.criado_por}</span>
                      </div>
                    </div>

                    <div style={styles.cardFooter}>
                      <button 
                        onClick={() => handleToggle(ag.id)} 
                        style={{
                          ...styles.btnSmall,
                          background: ag.ativo ? '#f59e0b' : '#047857',
                        }}
                      >
                                                {ag.ativo ? 'Pausar' : 'Ativar'}
                      </button>
                      
                      {isAdmin && (
                        <>
                          <button onClick={() => handleEditar(ag)} style={styles.btnEdit}>
                            Editar
                          </button>
                          <button onClick={() => handleDeletar(ag.id)} style={styles.btnDelete}>
                            Deletar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: PENDENTES HOJE */}
        {abaAtiva === 'pendentes' && (
          <div>
            <div style={styles.infoBox}>
              <strong>Reversões Pendentes:</strong> Senhas alteradas hoje que serão revertidas às {configReversao.horario}.
            </div>

            {pendentes.length === 0 ? (
              <div style={styles.empty}>
                Nenhuma reversão pendente para hoje.
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <div style={styles.tableWrapper}>
                  <div style={styles.tableHeader}>
                    <div style={{ width: '150px', flexShrink: 0 }}>Cliente</div>
                    <div style={{ width: '280px', flexShrink: 0 }}>Usuário</div>
                    <div style={{ width: '140px', flexShrink: 0 }}>Senha Atual</div>
                    <div style={{ width: '140px', flexShrink: 0 }}>Reverter Para</div>
                    <div style={{ width: '150px', flexShrink: 0 }}>Alterada em</div>
                  </div>
                  {pendentes.map((item, idx) => (
                    <div key={idx} style={styles.tableRow}>
                      <div style={{ width: '150px', flexShrink: 0, fontWeight: '600', ...styles.tableCell }}>
                        {item.cliente}
                      </div>
                      <div style={{ width: '280px', flexShrink: 0, ...styles.tableCell }}>
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
                      }}>
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
                      }}>
                        {item.senha_antiga || '-'}
                      </div>
                      <div style={{ width: '150px', flexShrink: 0, fontSize: '13px', ...styles.tableCell }}>
                        {item.data_hora}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: EXECUÇÃO MANUAL */}
        {abaAtiva === 'executar' && isAdmin && (
          <div>
            <div style={styles.executionGrid}>
              {/* CARD EXECUÇÃO EM MASSA */}
              <div style={styles.executionCard}>
                <h3 style={styles.executionTitle}>Execução em Massa</h3>
                <p style={styles.executionDesc}>
                  Altera a senha de TODAS as bases cadastradas de uma só vez.
                </p>
                <button onClick={handleExecutarMassa} disabled={loading} style={styles.btnDanger}>
                  {loading ? 'Executando...' : 'Executar Agora'}
                </button>
              </div>

              {/* CARD REVERSÃO MANUAL */}
              <div style={styles.executionCard}>
                <h3 style={styles.executionTitle}>Reversão Manual</h3>
                <p style={styles.executionDesc}>
                  Reverte todas as senhas alteradas hoje para as senhas anteriores.
                </p>
                <button 
                  onClick={handleExecutarReversao} 
                  disabled={loading || pendentes.length === 0}
                  style={{
                    ...styles.btnWarning,
                    opacity: pendentes.length === 0 ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Revertendo...' : `Reverter ${pendentes.length} Senhas`}
                </button>
              </div>
            </div>

            {/* CONFIGURAÇÃO REVERSÃO AUTOMÁTICA */}
            <div style={styles.configCard}>
              <h3 style={styles.sectionTitle}>Reversão Automática (19h)</h3>
              
              <div style={styles.configRow}>
                <div>
                  <div style={styles.configLabel}>Status:</div>
                  <div style={{
                    ...styles.statusBadge,
                    background: configReversao.ativa ? '#d1fae5' : '#fee2e2',
                    borderColor: configReversao.ativa ? '#047857' : '#dc2626',
                    color: configReversao.ativa ? '#065f46' : '#991b1b',
                  }}>
                    {configReversao.ativa ? 'ATIVA' : 'DESATIVADA'}
                  </div>
                </div>
                <button onClick={handleToggleReversaoAuto} style={styles.btnToggle}>
                  {configReversao.ativa ? 'Desativar' : 'Ativar'}
                </button>
              </div>

              <small style={{ color: '#666', display: 'block', marginTop: '1rem' }}>
                {configReversao.ativa 
                  ? 'As senhas serão revertidas automaticamente às 19h todos os dias' 
                  : 'Reversão automática desativada - você terá que reverter manualmente'}
              </small>
            </div>
          </div>
        )}

        {/* ABA: HISTÓRICO */}
        {abaAtiva === 'historico' && (
          <div>
            {historico.length === 0 ? (
              <div style={styles.empty}>Nenhuma execução no histórico.</div>
            ) : (
              <div style={styles.tableContainer}>
                <div style={styles.tableWrapper}>
                  <div style={styles.tableHeader}>
                    <div style={{ width: '200px', flexShrink: 0 }}>Tipo</div>
                    <div style={{ width: '180px', flexShrink: 0 }}>Cliente</div>
                    <div style={{ width: '180px', flexShrink: 0 }}>Executado por</div>
                    <div style={{ width: '150px', flexShrink: 0 }}>Data/Hora</div>
                    <div style={{ width: '120px', flexShrink: 0 }}>Status</div>
                  </div>
                  {historico.map((item, idx) => (
                    <div key={idx} style={styles.tableRow}>
                      <div style={{ width: '200px', flexShrink: 0, ...styles.tableCell }}>
                        {item.status === 'revertida' ? 'Reversão' : 'Exec. Massa'}
                      </div>
                      <div style={{ width: '180px', flexShrink: 0, fontWeight: '600', ...styles.tableCell }}>
                        {item.cliente}
                      </div>
                      <div style={{ width: '180px', flexShrink: 0, ...styles.tableCell }}>
                        {item.solicitante}
                      </div>
                      <div style={{ width: '150px', flexShrink: 0, fontSize: '13px', ...styles.tableCell }}>
                        {item.data_hora}
                      </div>
                      <div style={{ width: '120px', flexShrink: 0 }}>
                        <span style={{
                          padding: '4px 8px',
                          background: '#d1fae5',
                          color: '#065f46',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          Sucesso
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL CRIAR */}
      {criando && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Novo Agendamento</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nome do Agendamento *</label>
              <input
                type="text"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                style={styles.input}
                placeholder="Ex: Reversão Diária 19h"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo *</label>
              <select
                value={formData.tipo || ''}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                style={styles.input}
              >
                <option value="">Selecione o tipo</option>
                <option value="execucao_massa">Execução em Massa</option>
                <option value="reversao">Reversão de Senhas</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data e Hora *</label>
              <input
                type="datetime-local"
                value={formData.data_hora?.replace(' ', 'T') || ''}
                onChange={(e) => setFormData({ ...formData, data_hora: e.target.value.replace('T', ' ') })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Recorrência</label>
              <select
                value={formData.recorrencia || 'unico'}
                onChange={(e) => setFormData({ ...formData, recorrencia: e.target.value })}
                style={styles.input}
              >
                <option value="unico">Execução Única</option>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleCriar} style={styles.btnSave}>
                Criar Agendamento
              </button>
              <button onClick={() => { setCriando(false); setFormData({}); }} style={styles.btnCancel}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editando && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Editar Agendamento</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nome</label>
              <input
                type="text"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data e Hora</label>
              <input
                type="datetime-local"
                value={formData.data_hora?.replace(' ', 'T') || ''}
                onChange={(e) => setFormData({ ...formData, data_hora: e.target.value.replace('T', ' ') })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Recorrência</label>
              <select
                value={formData.recorrencia || 'unico'}
                onChange={(e) => setFormData({ ...formData, recorrencia: e.target.value })}
                style={styles.input}
              >
                <option value="unico">Execução Única</option>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleSalvarEdicao} style={styles.btnSave}>
                Salvar
              </button>
              <button onClick={() => { setEditando(null); setFormData({}); }} style={styles.btnCancel}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
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
    btnPrimary: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '1.5rem',
    background: '#f0f9ff',
    borderBottom: '2px solid #e5e7eb',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#047857',
    margin: 0,
  },
  cardType: {
    fontSize: '14px',
    color: '#666',
    marginTop: '0.5rem',
    fontWeight: '600',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  cardBody: {
    padding: '1.5rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.8rem',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: '13px',
    color: '#333',
    fontWeight: '500',
  },
  cardFooter: {
    padding: '1rem 1.5rem',
    background: '#fafafa',
    display: 'flex',
    gap: '0.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  btnSmall: {
    flex: 1,
    padding: '8px 12px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  btnEdit: {
    flex: 1,
    padding: '8px 12px',
    background: '#0284c7',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
  },
  btnDelete: {
    flex: 1,
    padding: '8px 12px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
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
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  tableWrapper: {
    minWidth: '820px',
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
  executionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  executionCard: {
    background: '#f9fafb',
    padding: '2rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    textAlign: 'center',
  },
  executionIcon: {
    fontSize: '48px',
    marginBottom: '1rem',
  },
  executionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1rem',
  },
  executionDesc: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  btnDanger: {
    width: '100%',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
  btnWarning: {
    width: '100%',
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
  configCard: {
    background: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1rem',
  },
  configRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    marginBottom: '0.5rem',
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
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalContent: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.2rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  },
  btnSave: {
    flex: 1,
    padding: '12px',
    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
  btnCancel: {
    flex: 1,
    padding: '12px',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
  },
};

export default Agendamentos;


