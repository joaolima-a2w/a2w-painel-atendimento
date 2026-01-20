// src/pages/Login.jsx
import { useState } from 'react'
import { login as loginAPI } from '../services/api'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await loginAPI(username, password)
      onLogin(user)
    } catch (err) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img 
            src="https://a2wplataforma.com.br/wp-content/themes/a2w/images/svg/logo-2.svg" 
            alt="A2W Logo" 
            style={styles.logo} 
          />
        </div>
        
        <h1 style={styles.title}>Painel A2W</h1>
        <p style={styles.subtitle}>Entre com suas credenciais</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Digite seu usuário"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Digite sua senha"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>Desenvolvido para A2W Plataforma</p>
        </div>
      </div>
    </div>
  )
}


const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f9b4c 0%, #0b803d 40%, #065f46 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '3rem 2.5rem',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '440px',
  },
  logoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '2rem',
    background: 'linear-gradient(135deg, #0f9b4c 0%, #0b803d 40%, #065f46 100%)',
    padding: '1.5rem',
    borderRadius: '12px',
  },
  logo: {
    height: '60px',
    width: 'auto',
    maxWidth: '100%',
  },

  title: {
    fontSize: '26px',
    marginBottom: '0.5rem',
    color: '#047857',
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666',
    marginBottom: '2rem',
    textAlign: 'center',
    fontSize: '15px',
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '14px',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'center',
    border: '2px solid #fca5a5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    transition: 'all 0.2s',
    outline: 'none',
    fontFamily: 'inherit',
  },
  button: {
    width: '100%',
    padding: '16px',
    background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '0.5rem',
    boxShadow: '0 4px 14px rgba(4, 120, 87, 0.4)',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  footer: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: 0,
  },
}

export default Login
