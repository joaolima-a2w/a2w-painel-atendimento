// src/pages/DashboardA2W.jsx
import { useState } from 'react';

function DashboardA2W() {
  const [abaAtiva, setAbaAtiva] = useState('clientes');

  const dashboards = {
    clientes: {
      titulo: 'Dashboard - Clientes (Power BI)',
      tipo: 'powerbi',
      url: '/A2W-Dashboard.html',
    },
    atendimento: {
      titulo: 'Dashboard - Atendimento',
      tipo: 'html',
      url: 'https://app.powerbi.com/view?r=eyJrIjoiMjc2NzZiZmEtNzdiZC00NTM1LWE0YjAtOTI3YTRjZTZkYmNjIiwidCI6IjNmN2NmYTQzLTg0NTgtNGE4Ny04ZjMwLTM1ZTE5MzNiMzJlNiJ9',
    },
  };

  return (
    <div style={styles.container}>
      {/* SUBMENU */}
      <div style={styles.submenu}>
        <button
          onClick={() => setAbaAtiva('clientes')}
          style={{
            ...styles.submenuBtn,
            ...(abaAtiva === 'clientes' ? styles.submenuBtnActive : {}),
          }}
        >
          Clientes
        </button>
        <button
          onClick={() => setAbaAtiva('atendimento')}
          style={{
            ...styles.submenuBtn,
            ...(abaAtiva === 'atendimento' ? styles.submenuBtnActive : {}),
          }}
        >
          Atendimento
        </button>
      </div>

      {/* DASHBOARD */}
      <div style={styles.dashboardContainer}>
        <h2 style={styles.dashboardTitle}>{dashboards[abaAtiva].titulo}</h2>
        
        <div style={styles.iframeWrapper}>
          <iframe 
            key={abaAtiva}  // ← Força reload ao trocar aba
            src={dashboards[abaAtiva].url}
            style={styles.iframe}
            title={dashboards[abaAtiva].titulo}
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f5',
  },
  submenu: {
    display: 'flex',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    background: 'white',
    borderBottom: '2px solid #e5e7eb',
  },
  submenuBtn: {
    padding: '12px 24px',
    background: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    color: '#666',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'all 0.2s',
  },
  submenuBtnActive: {
    color: '#047857',
    borderBottomColor: '#047857',
    background: '#f0f9ff',
  },
  dashboardContainer: {
    flex: 1,
    padding: '1.5rem',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  dashboardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#047857',
    marginBottom: '1rem',
  },
  iframeWrapper: {
    flex: 1,
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
};

export default DashboardA2W;
