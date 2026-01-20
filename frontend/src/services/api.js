import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  timeout: 90000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========================================
// INTERCEPTOR PARA AUTENTICAÇÃO (HTTP BASIC)
// ========================================
api.interceptors.request.use(
  (config) => {
    const basicToken = localStorage.getItem("basic_auth");
    if (basicToken) {
      config.headers.Authorization = `Basic ${basicToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de resposta para tratar erros globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("basic_auth");
      localStorage.removeItem("user_data");
      // opcional: redirecionar
      // window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ========================================
// AUTENTICAÇÃO (backend real)
// ========================================

export const login = async (username, password) => {
  try {
    const response = await api.post("/login", { username, password });

    // monta Basic e salva
    const basicToken = btoa(`${username}:${password}`);
    localStorage.setItem("basic_auth", basicToken);

    // salva dados do usuário (name, username, role, FOTO)
    localStorage.setItem("user_data", JSON.stringify(response.data));

    console.log("✅ Login bem-sucedido:", response.data);
    console.log("🖼️ Foto recebida:", response.data.foto);
    return response.data;
  } catch (error) {
    console.error(
      "❌ Erro no login:",
      error.response?.data?.detail || error.message
    );
    throw new Error(
      error.response?.data?.detail || "Usuário ou senha incorretos"
    );
  }
};

export const logout = () => {
  localStorage.removeItem("user_data");
  localStorage.removeItem("basic_auth");
  console.log("👋 Logout realizado");
};

export const isAuthenticated = () => {
  return localStorage.getItem("user_data") !== null;
};

export const getCurrentUser = () => {
  const userData = localStorage.getItem("user_data");
  return userData ? JSON.parse(userData) : null;
};

// ========================================
// ENDPOINTS DA API
// ========================================

export const getInfo = async () => {
  const response = await api.get("/");
  return response.data;
};

export const getHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export const getBases = async () => {
  try {
    const response = await api.get('/bases');
    console.log('Bases carregadas:', response.data.total, 'registros');
    return response.data.bases || []; // ← retorna o array 'bases'
  } catch (error) {
    console.error('rro ao buscar bases:', error);
    throw new Error(
      error.response?.data?.detail || 
      'Não foi possível carregar as bases do sistema'
    );
  }
};

export const solicitarSenha = async (dados) => {
  try {
    console.log("📤 Enviando solicitação:", dados.cliente);
    const response = await api.post("/solicitar", dados);
    console.log("✅ Senha gerada com sucesso");
    return response.data;
  } catch (error) {
    console.error(
      "❌ Erro ao solicitar senha:",
      error.response?.data?.detail || error.message
    );
    throw new Error(
      error.response?.data?.detail || "Erro ao processar solicitação"
    );
  }
};

export const listarSolicitacoes = async () => {
  try {
    const basicToken = localStorage.getItem("basic_auth");
    console.log("basic_auth:", basicToken); // só pra conferir

    const response = await api.get("/listar", {
      headers: basicToken ? { Authorization: `Basic ${basicToken}` } : {},
    });

    console.log(`✅ Solicitações listadas: ${response.data.total} registros`);
    return response.data;
  } catch (error) {
    console.error("❌ Erro ao listar solicitações:", error);
    throw new Error(
      error.response?.data?.detail || "Erro ao carregar histórico"
    );
  }
};

export const buscarSolicitacao = async (id) => {
  try {
    const response = await api.get(`/solicitacao/${id}`);
    return response.data.solicitacao;
  } catch (error) {
    console.error(`❌ Erro ao buscar solicitação ${id}:`, error);
    throw new Error(
      error.response?.data?.detail || "Solicitação não encontrada"
    );
  }
};

export const limparSolicitacoes = async () => {
  try {
    console.log("🗑️ Limpando solicitações...");
    const response = await api.delete("/limpar");
    console.log("✅ Solicitações limpas com sucesso");
    return response.data;
  } catch (error) {
    console.error("❌ Erro ao limpar solicitações:", error);
    throw new Error(
      error.response?.data?.detail || "Erro ao limpar solicitações"
    );
  }
};

export const solicitarMassa = async () => {
  try {
    console.log("🚨 Iniciando alteração em massa...");
    const response = await api.post("/solicitar-massa");
    console.log(
      `✅ Alteração em massa concluída: ${response.data.sucesso} sucessos, ${response.data.erro} erros`
    );
    return response.data;
  } catch (error) {
    console.error("❌ Erro na alteração em massa:", error);
    throw new Error(
      error.response?.data?.detail || "Erro ao processar alteração em massa"
    );
  }
};
// ========================================
// REVERSÃO DE SENHAS
// ========================================

export const listarReversoesPendentes = async () => {
  try {
    const response = await api.get('/reversao/pendentes');
    return response.data;
  } catch (error) {
    console.error('Erro ao listar reversões pendentes:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao carregar reversões pendentes'
    );
  }
};

export const executarReversaoManual = async () => {
  try {
    const response = await api.post('/reversao/executar');
    return response.data;
  } catch (error) {
    console.error('Erro ao executar reversão:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao executar reversão'
    );
  }
};

export const historicoReversoes = async () => {
  try {
    const response = await api.get('/reversao/historico');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar histórico de reversões:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao buscar histórico'
    );
  }
};
export const getConfigReversao = async () => {
  try {
    const response = await api.get('/reversao/config');
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar config:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao buscar configuração'
    );
  }
};

export const atualizarConfigReversao = async (dados) => {
  try {
    const response = await api.put('/reversao/config', dados);
    return response.data;
  } catch (error) {
    console.error('Erro ao atualizar config:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao atualizar configuração'
    );
  }
};

// ========================================
// AGENDAMENTOS
// ========================================

export const listarAgendamentos = async () => {
  try {
    const response = await api.get('/agendamentos');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao listar agendamentos:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao carregar agendamentos'
    );
  }
};

export const criarAgendamento = async (dados) => {
  try {
    const response = await api.post('/agendamentos', dados);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao criar agendamento:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao criar agendamento'
    );
  }
};

export const atualizarAgendamento = async (id, dados) => {
  try {
    const response = await api.put(`/agendamentos/${id}`, dados);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao atualizar agendamento:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao atualizar agendamento'
    );
  }
};

export const deletarAgendamento = async (id) => {
  try {
    const response = await api.delete(`/agendamentos/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao deletar agendamento'
    );
  }
};

export const toggleAgendamento = async (id) => {
  try {
    const response = await api.post(`/agendamentos/${id}/toggle`);
    return response.data;
  } catch (error) {
    console.error('Erro ao toggle agendamento:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao alternar agendamento'
    );
  }
};


// ========================================
// GERENCIAMENTO DE USUÁRIOS
// ========================================

export const uploadAvatar = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao enviar foto'
    );
  }
};


export const listarUsuarios = async () => {
  try {
    const response = await api.get('/usuarios');
    return response.data.usuarios;
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao carregar usuários'
    );
  }
};

export const atualizarUsuario = async (username, dados) => {
  try {
    const response = await api.put(`/usuarios/${username}`, dados);
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao atualizar usuário'
    );
  }
};

export const criarUsuario = async (dados) => {
  try {
    const response = await api.post('/usuarios', dados);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao criar usuário'
    );
  }
};

export const deletarUsuario = async (username) => {
  try {
    const response = await api.delete(`/usuarios/${username}`);
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao deletar usuário'
    );
  }
};
// ========================================
// AGENTE DESKTOP
// ========================================

export const verificarAgente = async () => {
  try {
    const response = await fetch('http://localhost:5555/ping', {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // timeout 2s
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const loginViaAgente = async (url, usuario, senha, empresa) => {
  try {
    const response = await fetch('http://localhost:5555/auto-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, usuario, senha, empresa })
    });
    
    if (!response.ok) throw new Error('Erro no agente');
    
    return await response.json();
  } catch (error) {
    throw new Error('Agente desktop não está rodando');
  }
};
// ========================================
// FUNÇÕES AUXILIARES
// ========================================


export const acessarA2W = async (empresa) => {
  try {
    const response = await api.post('/acesso-a2w', { empresa });
    return response.data;
  } catch (error) {
    console.error('Erro ao acessar A2W:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao fazer login automático'
    );
  }
};
export const gerarAcessoRapido = async (empresa) => {
  try {
    const response = await api.post('/acesso-rapido', { empresa });
    return response.data;
  } catch (error) {
    console.error('Erro ao gerar acesso:', error);
    throw new Error(
      error.response?.data?.detail || 'Erro ao gerar acesso rápido'
    );
  }
};

export const formatarDataHora = (dataHora) => {
  try {
    const data = new Date(dataHora);
    return data.toLocaleString("pt-BR");
  } catch {
    return dataHora;
  }
};

export const extrairMensagemErro = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.message) {
    return error.message;
  }
  return "Erro desconhecido ao processar requisição";
};


export default api;
