import React, { useState, useEffect } from 'react';
import { api, errorMessage, ROLE_LABELS, LOCATION_TYPES, formatLocation } from '../api';

const EMPTY_FORM = {
  name: '',
  username: '',
  password: '',
  role: 'attendant',
  locationType: 'Guichê',
  locationNumber: '',
  active: true,
};

function UserAdmin({ currentUser, onCurrentUserChange }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Erro ao carregar usuários') });
    }
  };

  const updateField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setForm({ ...EMPTY_FORM, ...user, password: '' });
    setMessage(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = { ...form };
      if (editingId && !payload.password) delete payload.password;

      if (editingId) {
        const response = await api.put(`/users/${editingId}`, payload);
        if (editingId === currentUser._id) onCurrentUserChange(response.data);
        setMessage({ type: 'success', text: `Usuário ${response.data.name} atualizado` });
      } else {
        const response = await api.post('/users', payload);
        setMessage({ type: 'success', text: `Usuário ${response.data.name} criado` });
      }
      resetForm();
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Erro ao salvar usuário') });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await api.put(`/users/${user._id}`, { active: !user.active });
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Erro ao alterar usuário') });
    }
  };

  const removeUser = async (user) => {
    if (!window.confirm(`Remover o usuário ${user.name}? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/users/${user._id}`);
      if (editingId === user._id) resetForm();
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Erro ao remover usuário') });
    }
  };

  return (
    <div className="main-content admin-content">
      <form className="panel-card user-form" onSubmit={submit}>
        <h2>{editingId ? 'Editar usuário' : 'Novo usuário'}</h2>

        <label>
          Nome completo
          <input value={form.name} onChange={updateField('name')} required />
        </label>
        <label>
          Login
          <input
            value={form.username}
            onChange={updateField('username')}
            autoComplete="off"
            required
          />
        </label>
        <label>
          {editingId ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
          <input
            type="password"
            value={form.password}
            onChange={updateField('password')}
            autoComplete="new-password"
            minLength={6}
            required={!editingId}
          />
        </label>
        <label>
          Perfil
          <select value={form.role} onChange={updateField('role')}>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label>
            Local de atendimento
            <select value={form.locationType} onChange={updateField('locationType')}>
              {LOCATION_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            Número
            <input
              value={form.locationNumber}
              onChange={updateField('locationNumber')}
              inputMode="numeric"
              pattern="\d{0,3}"
              title="Até 3 dígitos"
              placeholder="Ex.: 3"
            />
          </label>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={form.active} onChange={updateField('active')} />
          Usuário ativo
        </label>

        {message && <div className={`form-${message.type}`}>{message.text}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {editingId ? 'Salvar alterações' : 'Criar usuário'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="panel-card">
        <h2>Usuários cadastrados</h2>
        <div className="user-list">
          {users.length === 0 ? (
            <p className="empty-message">Nenhum usuário cadastrado</p>
          ) : (
            users.map((user) => (
              <div key={user._id} className={user.active ? 'user-item' : 'user-item is-inactive'}>
                <div className="user-info">
                  <strong>{user.name}</strong>
                  <span>
                    @{user.username} · {ROLE_LABELS[user.role]}
                    {formatLocation(user) && ` · ${formatLocation(user)}`}
                    {!user.active && ' · Inativo'}
                  </span>
                </div>
                <div className="user-actions">
                  <button className="btn btn-small" onClick={() => startEdit(user)}>
                    Editar
                  </button>
                  {user._id !== currentUser._id && (
                    <>
                      <button className="btn btn-small" onClick={() => toggleActive(user)}>
                        {user.active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button className="btn btn-small btn-danger" onClick={() => removeUser(user)}>
                        Remover
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default UserAdmin;
