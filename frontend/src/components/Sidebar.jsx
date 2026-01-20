import { NavLink } from 'react-router-dom'

function Sidebar({ user, onLogout }) {
  const menuItems = user?.role === 'admin' ? [
    { path: '/solicitar', label: 'Solicitar Senha' },
    { path: '/admin', label: 'Painel Admin' },
    { path: '/dashboard', label: 'Dashboard A2W' },
    { path: '/sobre', label: 'Sobre' }
  ] : [
    { path: '/solicitar', label: 'Solicitar Senha' },
    { path: '/dashboard', label: 'Dashboard A2W' },
    { path: '/sobre', label: 'Sobre' }
  ]

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <img 
          src="https://a2wplataforma.com.br/wp-content/themes/a2w/images/svg/logo-2.svg" 
          alt="Logo" 
          style={styles.logo} 
        />
        <h2 style={styles.title}>Gerador de Senhas</h2>
      </div>

      <div style={styles.userInfo}>
        <div style={styles.userName}>👤 {user?.name}</div>
        <div style={styles.userRole}>Perfil: {user?.role?.toUpperCase()}</div>
      </div>

      <nav style={styles.nav}>
        {menuItems.map(item => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {})
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button onClick={onLogout} style={styles.logoutBtn}>
      Sair
      </button>

      <div style={styles.footer}>
        <small>v2.0 - A2W Plataforma</small>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '280px',
    background: 'linear-gradient(180deg, #1a7a0a 0%, #239B11 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    padding: '30px 20px',
    position: 'sticky',
    top: 0,
    height: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  logo: {
    width: '80px',
    marginBottom: '15px',
    filter: 'brightness(0) invert(1)'
  },
  title: {
    fontSize: '20px',
    fontWeight: '700'
  },
  userInfo: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'center'
  },
  userName: {
    fontWeight: '600',
    marginBottom: '5px'
  },
  userRole: {
    fontSize: '13px',
    opacity: 0.8
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: 'auto'
  },
  navLink: {
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: 'white',
    transition: 'all 0.3s',
    fontSize: '15px',
    fontWeight: '500'
  },
  navLinkActive: {
    background: 'rgba(255, 255, 255, 0.2)',
    fontWeight: '700'
  },
  logoutBtn: {
    padding: '12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s'
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    opacity: 0.7
  }
}

export default Sidebar
