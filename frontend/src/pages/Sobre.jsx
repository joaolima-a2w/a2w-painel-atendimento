// src/pages/Sobre.jsx
import { useState, useEffect } from 'react';
import { getHealth } from '../services/api';

function Sobre() {
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const verificarStatus = async () => {
    setLoading(true);
    try {
      const data = await getHealth();
      setApiStatus(data);
    } catch (error) {
      setApiStatus({ status: 'erro', automacao: 'indisponivel' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarStatus();
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Sobre o Sistema</h1>

      <div style={styles.section}>
        <h2 style={styles.subtitle}>Sistema de Gestão de Senhas v2.0</h2>

        <div style={styles.cards}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Funcionalidades</h3>
            <ul style={styles.list}>
              <li>Solicitação de senha com automação Playwright</li>
              <li>Alteração automática no sistema</li>
              <li>Painel administrativo completo</li>
              <li>Dashboard A2W integrado</li>
              <li>Histórico de alterações</li>
            </ul>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Tecnologias</h3>
            <ul style={styles.list}>
              <li>Frontend: React + Vite</li>
              <li>Backend: FastAPI</li>
              <li>Automação: Playwright</li>
              <li>Estilo: A2W Design System</li>
            </ul>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.subtitle}>Status do Sistema</h2>

        <div style={styles.statusGrid}>
          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>API Backend</h3>
            <div style={{
              ...styles.statusBadge,
              background: apiStatus?.status === 'ok' ? '#d1fae5' : '#fee2e2',
              color: apiStatus?.status === 'ok' ? '#065f46' : '#991b1b',
            }}>
              {apiStatus?.status === 'ok' ? 'Online' : 'Offline'}
            </div>
            <p style={styles.statusText}>
              Automação: <strong>{apiStatus?.automacao || 'verificando...'}</strong>
            </p>
          </div>

          <div style={styles.statusCard}>
            <h3 style={styles.statusTitle}>Informações da API</h3>
            <p style={styles.statusText}>Versão: <strong>2.1.0</strong></p>
            <p style={styles.statusText}>
              Automação: <strong>{apiStatus?.automacao === 'disponivel' ? 'Disponível' : 'Indisponível'}</strong>
            </p>
          </div>
        </div>

        <button onClick={verificarStatus} disabled={loading} style={styles.button}>
          {loading ? 'Verificando...' : 'Verificar Novamente'}
        </button>
      </div>

      <div style={styles.footer}>
        Desenvolvido para A2W Plataforma | 2026
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
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '2rem',
  },
  section: {
    marginBottom: '3rem',
  },
  subtitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#065f46',
    marginBottom: '1.5rem',
  },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  statusCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  statusTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '1rem',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '700',
    fontSize: '14px',
    marginBottom: '1rem',
  },
  statusText: {
    fontSize: '14px',
    color: '#666',
    margin: '0.5rem 0',
  },
  button: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '700',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  footer: {
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: '1px solid #ddd',
  },
};

export default Sobre;
