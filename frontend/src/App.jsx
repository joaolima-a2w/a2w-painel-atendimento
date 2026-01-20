// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Layout from './components/Layout'
import SolicitarSenha from './pages/SolicitarSenha'
import AcessoRapido from './pages/AcessoRapido';
import PainelAdmin from './pages/PainelAdmin'
import GerenciarUsuarios from './pages/GerenciarUsuarios'
import Agendamentos from './pages/Agendamentos'
import Sobre from './pages/Sobre'
import LogsAtividades from './pages/LogsAtividades';
import PrivateRoute from './components/PrivateRoute'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './styles/sweetalert-custom.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('user_data')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
    }
    setLoading(false)
  }, [])

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('user_data', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user_data')
    localStorage.removeItem('basic_auth')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ fontSize: '20px', color: '#047857', fontWeight: '600' }}>Carregando...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route
          path="/login"
          element={!user ? <Login onLogin={login} /> : <Navigate to="/" />}
        />


        {/* ROTAS COM SIDEBAR */}
        <Route
          path="/"
          element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={logout} />
            </PrivateRoute>
          }
        >

          <Route
            path="logs"
            element={user?.role === 'admin' ? <LogsAtividades user={user} /> : <Navigate to="/solicitar" />}
          />
          <Route path="acesso-rapido" element={<AcessoRapido user={user} />} />
          <Route index element={<Navigate to="/solicitar" replace />} />
          <Route path="solicitar" element={<SolicitarSenha user={user} />} />
          <Route path="dashboard" element={<iframe src="/A2W-Dashboard.html" style={{ width: '100%', height: 'calc(100vh - 4px)', border: 'none' }} />} />

          {/* ROTAS ADMIN */}
          <Route
            path="admin"
            element={user?.role === 'admin' ? <PainelAdmin user={user} /> : <Navigate to="/solicitar" />}
          />
          <Route
            path="agendamentos"
            element={user?.role === 'admin' ? <Agendamentos user={user} /> : <Navigate to="/solicitar" />}
          />

          {/* OUTRAS ROTAS */}
          <Route path="usuarios" element={<GerenciarUsuarios user={user} />} />
          <Route path="sobre" element={<Sobre />} />
        </Route>

        {/* ROTA CORINGA */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </BrowserRouter>
  )
}

export default App
