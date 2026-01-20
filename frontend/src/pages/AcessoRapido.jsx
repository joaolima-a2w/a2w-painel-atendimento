// src/pages/AcessoRapido.jsx
import { useState, useEffect } from 'react';
import { getBases, verificarAgente, loginViaAgente } from '../services/api';
import { toast } from 'react-toastify';
import './SolicitarSenha.css';

function AcessoRapido({ user }) {
  const [bases, setBases] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agenteAtivo, setAgenteAtivo] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    carregarBases();
    verificarAgenteDesktop();
    
    const interval = setInterval(verificarAgenteDesktop, 10000);
    return () => clearInterval(interval);
  }, []);

  const carregarBases = async () => {
    try {
      const data = await getBases();
      setBases(data);
    } catch (error) {
      toast.error('Erro ao carregar bases: ' + error.message);
    }
  };

  const verificarAgenteDesktop = async () => {
    const ativo = await verificarAgente();
    setAgenteAtivo(ativo);
  };

  const handleLoginAutomaticoA2W = async () => {
    if (!empresaSelecionada) {
      toast.warning('Selecione uma empresa');
      return;
    }

    if (!agenteAtivo) {
      toast.error('Agente desktop não está rodando! Execute iniciar_agente.bat primeiro.');
      return;
    }

    setLoading(true);
    try {
      await loginViaAgente(
        empresaSelecionada.url,
        empresaSelecionada.usuario,
        empresaSelecionada.senha,
        empresaSelecionada.empresa
      );
      
      toast.success('Navegador abrindo com login automático!', { autoClose: 3000 });
      
    } catch (error) {
      toast.error('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarCredenciais = () => {
    if (!empresaSelecionada) {
      toast.warning('Selecione uma empresa');
      return;
    }

    const texto = `URL: ${empresaSelecionada.url}\nUsuário: ${empresaSelecionada.usuario}\nSenha: ${empresaSelecionada.senha}`;
    
    navigator.clipboard.writeText(texto).then(() => {
      toast.success('Credenciais copiadas!');
    }).catch(() => {
      toast.error('Erro ao copiar');
    });
  };

  const handleEmpresaChange = (e) => {
    const empresa = bases.find((b) => b.empresa === e.target.value);
    setEmpresaSelecionada(empresa);
    setMostrarSenha(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Acesso Rápido aos Sistemas</h1>
        <p style={styles.subtitle}>Login automático com agente desktop</p>
      </div>

      {agenteAtivo ? (
        <div style={styles.agenteAtivo}>
          <div>
            <strong style={{ color: '#047857' }}>Agente Desktop: ATIVO</strong>
            <div style={{ fontSize: '13px', color: '#065f46' }}>
              Login 100% automático disponível
            </div>
          </div>
        </div>
      ) : (
        <div style={styles.agenteInativo}>
          <div>
            <strong style={{ color: '#991b1b' }}>Agente Desktop: INATIVO</strong>
            <div style={{ fontSize: '13px', color: '#991b1b', marginTop: '0.3rem' }}>
              Para login automático, execute o .bat
            </div>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Selecione o Sistema</h2>

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
              <h3 style={styles.infoTitle}>Informações do Sistema</h3>
              
              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>URL:</span>
                  <span style={styles.infoValue}>{empresaSelecionada.url}</span>
                </div>

                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>Usuário:</span>
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
                      Mostrar senha
                    </label>
                    <span style={styles.infoValue}>
                      {mostrarSenha ? (empresaSelecionada.senha || '-') : '************'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.actionsGrid}>
              <button
                onClick={handleLoginAutomaticoA2W}
                disabled={loading || !agenteAtivo}
                style={{
                  ...styles.btnSuccess,
                  opacity: (loading || !agenteAtivo) ? 0.5 : 1,
                  cursor: (loading || !agenteAtivo) ? 'not-allowed' : 'pointer',
                }}
                title={!agenteAtivo ? 'Inicie o agente desktop primeiro' : ''}
              >
                {loading ? 'Abrindo...' : 'Login Automático'}
              </button>

              <button
                onClick={handleCopiarCredenciais}
                style={styles.btnSecondary}
                disabled={loading}
              >
                Copiar Credenciais
              </button>
            </div>

            <div style={styles.infoMessage}>
              <strong>Como funciona:</strong>
              <ul style={{ textAlign: 'left', marginTop: '0.5rem', lineHeight: '1.8' }}>
                <li><strong>Login Automático:</strong> Abre navegador e faz login sozinho (requer agente desktop ativo)</li>
                <li><strong>Copiar Credenciais:</strong> Copia URL, usuário e senha</li>
              </ul>
            </div>
          </>
        )}
      </div>
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
  agenteAtivo: {
    padding: '1rem',
    background: '#d1fae5',
    border: '2px solid #047857',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  agenteInativo: {
    padding: '1rem',
    background: '#fee2e2',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    marginBottom: '1.5rem',
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
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  btnSuccess: {
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
  },
  btnSecondary: {
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '16px',
    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
  },
  infoMessage: {
    padding: '1rem',
    background: '#e0f2fe',
    border: '2px solid #0284c7',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0c4a6e',
  },
};

export default AcessoRapido;
