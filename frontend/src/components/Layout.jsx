// src/components/Layout.jsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

function Layout({ user, onLogout }) {
  console.log('User completo no Layout:', user);
  console.log('URL da foto:', user?.foto);
  
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems = [
    { path: '/solicitar', label: 'Solicitar Senha', icon: '/icons/senha.png' },
    { path: '/acesso-rapido', label: 'Acesso Rápido', icon: '/icons/acesso.png' },
    { path: '/dashboard', label: 'Dashboard', icon: '/icons/dashboard.png' },
    ...(user?.role === 'admin' ? [
      { path: '/admin', label: 'Painel Admin', icon: '/icons/admin.png' },
      { path: '/agendamentos', label: 'Agendamentos', icon: '/icons/agendamentos.png' },
      { path: '/logs', label: 'Logs de Atividades', icon: '/icons/log.png' },
    ] : []),
    { path: '/usuarios', label: 'Usuários', icon: '/icons/usuarios.png' },
    { path: '/sobre', label: 'Sobre', icon: '/icons/sobre.png' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR COLAPSÁVEL */}
      <div
        style={{
          ...styles.sidebar,
          width: sidebarCollapsed ? '70px' : '260px',
          transition: 'width 0.3s ease',
        }}
      >
        {/* LOGO + TOGGLE */}
        <div style={styles.header}>
          {!sidebarCollapsed && (
            <img
              src="https://a2wplataforma.com.br/wp-content/themes/a2w/images/svg/logo-2.svg"
              alt="A2W"
              style={{ height: '35px' }}
            />
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={styles.toggleBtn}
            title={sidebarCollapsed ? 'Expandir' : 'Recolher'}
          >
            {sidebarCollapsed ? '☰' : '◁'}
          </button>
        </div>

        {/* USER INFO */}
        {!sidebarCollapsed && (
          <div style={styles.userInfo}>
            <div style={styles.userProfile}>
              <img 
                src={user?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=047857&color=fff&size=128`}
                alt={user?.name}
                style={styles.userAvatar}
                onError={(e) => {
                  console.log('Erro ao carregar foto:', user?.foto);
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=047857&color=fff&size=128`;
                }}
              />
              <div style={styles.userDetails}>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>{user?.name}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                  {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quando colapsado, mostrar só o avatar pequeno */}
        {sidebarCollapsed && (
          <div style={styles.userInfoCollapsed}>
            <img 
              src={user?.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=047857&color=fff&size=128`}
              alt={user?.name}
              style={styles.userAvatarSmall}
              title={user?.name}
            />
          </div>
        )}
        {/* MENU */}
        <nav style={styles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                ...styles.navItem,
                ...(location.pathname === item.path ? styles.navItemActive : {}),
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              }}
              title={sidebarCollapsed ? item.label : ''}
            >
              <img 
                src={item.icon} 
                alt="" 
                style={styles.navIcon}
              />
              {!sidebarCollapsed && <span style={{ marginLeft: '12px' }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* LOGOUT */}
        <button
          onClick={onLogout}
          style={{
            ...styles.logoutBtn,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}
          title={sidebarCollapsed ? 'Sair' : ''}
        >
          <img 
            src="/icons/sair.png" 
            alt="" 
            style={styles.navIcon}
          />
          {!sidebarCollapsed && <span style={{ marginLeft: '12px' }}>Sair</span>}
        </button>
      </div>

      {/* CONTEÚDO DAS PÁGINAS */}
      <div style={{ flex: 1, background: '#f5f5f5', overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}

  const styles = {
  sidebar: {
    background: 'linear-gradient(180deg, #047857 0%, #065f46 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 0.8rem',
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    padding: '0 0.5rem',
  },
  toggleBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: 'white',
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  userInfo: {
    padding: '1rem 0.8rem',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },
  userProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  userAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '3px solid rgba(255,255,255,0.3)',
    objectFit: 'cover',
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userInfoCollapsed: {
    display: 'flex',
    justifyContent: 'center',
    padding: '0.8rem 0',
    marginBottom: '1.5rem',
  },
  userAvatarSmall: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    objectFit: 'cover',
    cursor: 'pointer',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  navItem: {
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.25)',
    fontWeight: '700',
  },
  logoutBtn: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  navIcon: {
    width: '20px',
    height: '20px',
    filter: 'brightness(0) invert(1)',
    transition: 'all 0.2s',
  },
};

export default Layout;
