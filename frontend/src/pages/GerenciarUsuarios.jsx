// src/pages/GerenciarUsuarios.jsx
import { useState, useEffect } from 'react';
import { listarUsuarios, atualizarUsuario, criarUsuario, deletarUsuario, uploadAvatar } from '../services/api';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

function GerenciarUsuarios({ user }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(null);
  const [criando, setCriando] = useState(false);
  const [formData, setFormData] = useState({});
  const [previewFoto, setPreviewFoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await listarUsuarios();
      setUsuarios(data);
    } catch (error) {
      toast.error('Erro ao carregar usuários: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande! Máximo 5MB');
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewFoto(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload para servidor
    setUploading(true);
    try {
      const result = await uploadAvatar(file);
      setFormData({ ...formData, foto: result.url });
      toast.success('Foto enviada com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar foto: ' + error.message);
      setPreviewFoto(null);
    } finally {
      setUploading(false);
    }
  };

  const handleEditar = (usuario) => {
    setEditando(usuario.username);
    setFormData({
      name: usuario.name,
      email: usuario.email,
      foto: usuario.foto,
      role: usuario.role,
      nova_senha: '',
    });
    setPreviewFoto(null);
  };

  const handleSalvar = async () => {
    try {
      await atualizarUsuario(editando, formData);
      toast.success('Usuário atualizado com sucesso!');
      setEditando(null);
      setFormData({});
      setPreviewFoto(null);
      carregarUsuarios();
    } catch (error) {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  };

  const handleCriar = async () => {
    if (!formData.username) {
      toast.warning('Username é obrigatório');
      return;
    }
    if (!formData.senha) {
      toast.warning('Senha é obrigatória');
      return;
    }
    try {
      await criarUsuario(formData);
      toast.success('Usuário criado com sucesso!');
      setCriando(false);
      setFormData({});
      setPreviewFoto(null);
      carregarUsuarios();
    } catch (error) {
      toast.error('Erro ao criar: ' + error.message);
    }
  };

  const handleDeletar = async (username) => {
    const result = await Swal.fire({
      title: 'Deletar usuário?',
      text: `Tem certeza que deseja deletar "${username}"? Esta ação não pode ser desfeita.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;

    try {
      await deletarUsuario(username);
      toast.success('Usuário deletado!');
      carregarUsuarios();
    } catch (error) {
      toast.error('Erro ao deletar: ' + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Gerenciar Usuários</h1>
        {isAdmin && (
          <button onClick={() => { setCriando(true); setFormData({ role: 'user' }); setPreviewFoto(null); }} style={styles.btnPrimary}>
            Novo Usuário
          </button>
        )}
      </div>

      {loading ? (
        <div style={styles.loading}>Carregando...</div>
      ) : (
        <div style={styles.grid}>
          {usuarios.map((usuario) => (
            <div key={usuario.username} style={styles.card}>
              <div style={styles.cardHeader}>
                <img
                  src={usuario.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.name)}&background=047857&color=fff&size=128`}
                  alt={usuario.name}
                  style={styles.avatar}
                />
                <div style={styles.userInfo}>
                  <div style={styles.userName}>{usuario.name}</div>
                  <div style={styles.userUsername}>@{usuario.username}</div>
                  <div style={styles.userRole}>
                    {usuario.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </div>
                </div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.infoItem}>
                  <strong>Email:</strong> {usuario.email || '(não informado)'}
                </div>
              </div>

              <div style={styles.cardFooter}>
                <button onClick={() => handleEditar(usuario)} style={styles.btnEdit}>
                  Editar
                </button>
                {isAdmin && usuario.username !== user.username && (
                  <button onClick={() => handleDeletar(usuario.username)} style={styles.btnDelete}>
                    Deletar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {editando && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Editar Usuário: @{editando}</h2>

            {/* FOTO COM UPLOAD */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Foto de Perfil</label>
              
              {(previewFoto || formData.foto) && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <img
                    src={previewFoto || formData.foto}
                    alt="Preview"
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #047857',
                    }}
                  />
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={styles.input}
                disabled={uploading}
              />
              
              {uploading && (
                <small style={{ color: '#f59e0b', display: 'block', marginTop: '0.5rem' }}>
                  ⏳ Enviando foto...
                </small>
              )}
              
              <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
                JPG, PNG ou GIF (máx 5MB)
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Completo</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
              />
            </div>

            {isAdmin && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Perfil</label>
                <select
                  value={formData.role || 'user'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={styles.input}
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>Nova Senha (deixe vazio para manter)</label>
              <input
                type="password"
                value={formData.nova_senha || ''}
                onChange={(e) => setFormData({ ...formData, nova_senha: e.target.value })}
                style={styles.input}
                placeholder="Digite a nova senha"
              />
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleSalvar} style={styles.btnSave}>
                Salvar
              </button>
              <button onClick={() => { setEditando(null); setFormData({}); setPreviewFoto(null); }} style={styles.btnCancel}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {criando && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h2 style={styles.modalTitle}>Criar Novo Usuário</h2>

            {/* FOTO COM UPLOAD */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Foto de Perfil</label>
              
              {(previewFoto || formData.foto) && (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <img
                    src={previewFoto || formData.foto}
                    alt="Preview"
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #047857',
                    }}
                  />
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={styles.input}
                disabled={uploading}
              />
              
              {uploading && (
                <small style={{ color: '#f59e0b', display: 'block', marginTop: '0.5rem' }}>
                  Enviando foto...
                </small>
              )}
              
              <small style={{ color: '#666', display: 'block', marginTop: '0.5rem' }}>
                JPG, PNG ou GIF (máx 5MB)
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Username *</label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={styles.input}
                placeholder="joao.silva"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Nome Completo *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Senha *</label>
              <input
                type="password"
                value={formData.senha || ''}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil</label>
              <select
                value={formData.role || 'user'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={styles.input}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleCriar} style={styles.btnSave}>
                Criar Usuário
              </button>
              <button onClick={() => { setCriando(false); setFormData({}); setPreviewFoto(null); }} style={styles.btnCancel}>
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
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '18px',
    color: '#666',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#f0f9ff',
  },
  avatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: '3px solid #047857',
    objectFit: 'cover',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#047857',
  },
  userUsername: {
    fontSize: '13px',
    color: '#666',
    marginTop: '2px',
  },
  userRole: {
    fontSize: '12px',
    marginTop: '4px',
    color: '#047857',
    fontWeight: '600',
  },
  cardBody: {
    padding: '1rem 1.5rem',
  },
  infoItem: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '0.5rem',
  },
  cardFooter: {
    padding: '1rem 1.5rem',
    display: 'flex',
    gap: '0.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  btnEdit: {
    flex: 1,
    padding: '8px 16px',
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
    padding: '8px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
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

export default GerenciarUsuarios;

