// src/pages/SolicitarSenha.jsx
import { useState, useEffect } from 'react';
import { getBases, solicitarSenha } from '../services/api';
import './SolicitarSenha.css';
import { toast } from 'react-toastify';

function SolicitarSenha({ user }) {
  const [bases, setBases] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    carregarBases();
  }, []);

  const carregarBases = async () => {
    try {
      const data = await getBases();
      setBases(data);
    } catch (error) {
      toast.error('Erro ao carregar bases: ' + error.message);
    }
  };

  const handleSolicitar = async () => {
    if (!empresaSelecionada) {
      toast.warning('Selecione uma empresa');
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const res = await solicitarSenha({
        cliente: empresaSelecionada.empresa,
        usuario: empresaSelecionada.usuario,
        base: empresaSelecionada.url,
        observacao,
        solicitante: user.name,
        ip_solicitante: 'web',
      });

      setResultado(res);
      setObservacao('');
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaChange = (e) => {
    const empresa = bases.find((b) => b.empresa === e.target.value);
    setEmpresaSelecionada(empresa);
    setMostrarSenha(false);
    setResultado(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Sistema de Gestão de Senhas</h1>
        <p style={styles.subtitle}>
          Solicite a alteração de senha com automação Playwright.
        </p>
      </div>

      {/* CARD DE SELEÇÃO */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Nova Solicitação</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Empresa *</label>
          <select
            onChange={handleEmpresaChange}
            value={empresaSelecionada?.empresa || ''}
            className="custom-select"
            disabled={loading}
          >
            <option value="">Selecione uma empresa</option>
            {bases.map((base) => (
              <option key={base.empresa} value={base.empresa}>
                {base.empresa}
              </option>
            ))}
          </select>
        </div>

        {empresaSelecionada && (
          <>
            <div style={styles.infoBox}>
              <h3 style={styles.infoTitle}>Informações da empresa selecionada</h3>
              
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>URL:</span>
                  <span style={styles.infoValue}>{empresaSelecionada.url}</span>
                </div>

                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Usuário atual:</span>
                  <span style={styles.infoValue}>{empresaSelecionada.usuario}</span>
                </div>

                {isAdmin && (
                  <div style={styles.infoItem}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={mostrarSenha}
                        onChange={(e) => setMostrarSenha(e.target.checked)}
                        style={styles.checkbox}
                      />
                      Mostrar senha atual
                    </label>
                    <span style={styles.infoValue}>
                      {mostrarSenha
                        ? empresaSelecionada.senha || '(não disponível)'
                        : '************'}
                    </span>
                  </div>
                )}

                {!isAdmin && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoLabel}>Senha atual:</span>
                    <span style={styles.infoValue}>(Oculta - apenas Admin)</span>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Observação</label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Informações adicionais sobre a alteração (opcional)"
                style={styles.textarea}
                disabled={loading}
              />
            </div>

            <div style={styles.warningBox}>
              <strong>ATENÇÃO:</strong> Ao clicar no botão abaixo, o sistema irá automaticamente 
              entrar no sistema do cliente e alterar a senha. Aguarde o processo finalizar.
            </div>

            <button
              onClick={handleSolicitar}
              disabled={loading}
              style={{
                ...styles.btnPrimary,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Processando automação (1-2 min)...' : 'GERAR E ALTERAR SENHA'}
            </button>
          </>
        )}
      </div>

      {/* CARD DE RESULTADO */}
      {resultado && (
        <div style={styles.resultCard}>
          <div
            style={{
              ...styles.resultHeader,
              background: resultado.automacao?.sucesso
                ? (resultado.reutilizada 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'  // Laranja se reutilizada
                    : 'linear-gradient(135deg, #047857 0%, #065f46 100%)')  // Verde se nova
                : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            }}
          >
            <h3 style={{ margin: 0, color: 'white', fontSize: '20px' }}>
              {resultado.automacao?.sucesso 
                ? (resultado.reutilizada 
                    ? 'Senha já foi gerada hoje!' 
                    : 'Senha alterada com sucesso!')
                : 'Erro na automação'}
            </h3>
          </div>


          <div style={styles.resultBody}>
            {/* Aviso de reutilização */}
            {resultado.reutilizada && (
              <div style={styles.reuseWarning}>
               <strong>Atenção:</strong> Esta senha já foi alterada hoje. 
                Para evitar conflitos, estamos retornando a mesma senha gerada anteriormente.
                <br />
                <small>Mensagem: {resultado.automacao?.mensagem}</small>
              </div>
            )}
            <div style={styles.resultGrid}>
              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Empresa:</span>
                <span style={styles.resultValue}>{resultado.cliente || empresaSelecionada.empresa}</span>
              </div>

              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Usuário:</span>
                <span style={styles.resultValue}>{resultado.usuario || empresaSelecionada.usuario}</span>
              </div>

              <div style={styles.resultItem}>
                <span style={styles.resultLabel}>Data/Hora:</span>
                <span style={styles.resultValue}>{resultado.data_hora || new Date().toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div style={styles.senhaBox}>
              <div style={styles.senhaLabel}>{resultado.reutilizada ? 'Senha do dia:' : 'Nova Senha:'}</div>
              <div style={styles.senhaValue}>{resultado.senha}</div>
            </div>

            {resultado.automacao?.sucesso ? (
              resultado.reutilizada ? (
              <div style={styles.infoMessage}>
                Nenhuma alteração foi realizada. A senha atual é a mesma gerada anteriormente hoje.
              </div>
            ) : (
              <div style={styles.successMessage}>
                A senha já foi alterada automaticamente no sistema. Você já pode usar as novas credenciais!
              </div>
            )
            ) : (
              <div style={styles.errorMessage}>
                ATENÇÃO: A automação falhou. Altere a senha manualmente no sistema!
                <br />
                <strong>Motivo:</strong> {resultado.automacao?.mensagem || 'Erro desconhecido'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '2.5rem 3rem',
    maxWidth: '1200px',
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
  card: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginBottom: '2rem',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1.5rem',
  },
  formGroup: {
    marginBottom: '1.5rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    fontSize: '14px',
    color: '#333',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #d0d7e0',
    borderRadius: '8px',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  infoBox: {
    background: '#f0f9ff',
    border: '2px solid #0284c7',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1rem',
    marginTop: 0,
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  infoLabel: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#555',
  },
  infoValue: {
    fontSize: '14px',
    color: '#333',
    fontFamily: 'monospace',
    background: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
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
  btnPrimary: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(4, 120, 87, 0.3)',
  },
    resultCard: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  },
  resultHeader: {
    padding: '1.5rem',
    textAlign: 'center',
  },
  resultBody: {
    padding: '2rem',
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  resultItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  resultLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  resultValue: {
    fontSize: '15px',
    color: '#333',
    fontWeight: '600',
  },
  senhaBox: {
    background: '#f0f9ff',
    border: '3px solid #047857',
    borderRadius: '12px',
    padding: '1.5rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  senhaLabel: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '0.5rem',
  },
  senhaValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#047857',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  copyBox: {
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  copyText: {
    background: 'white',
    padding: '1rem',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    lineHeight: '1.6',
    margin: '0.5rem 0 0 0',
    overflow: 'auto',
    border: '1px solid #e5e7eb',
  },
  successMessage: {
    padding: '1rem',
    background: '#d1fae5',
    border: '2px solid #047857',
    borderRadius: '8px',
    color: '#065f46',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorMessage: {
    padding: '1rem',
    background: '#fee2e2',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
  },
  reuseWarning: {
    padding: '1rem',
    background: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '1.6',
  },
  senhaAntigaBox: {
    background: '#fee2e2',
    border: '2px solid #dc2626',
    borderRadius: '12px',
    padding: '1rem',
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  senhaAntigaLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: '0.3rem',
    textTransform: 'uppercase',
  },
  senhaAntigaValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#991b1b',
    fontFamily: 'monospace',
    letterSpacing: '1px',
  },
  infoMessage: {
    padding: '1rem',
    background: '#e0f2fe',
    border: '2px solid #0284c7',
    borderRadius: '8px',
    color: '#0c4a6e',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
  },
};

export default SolicitarSenha;

