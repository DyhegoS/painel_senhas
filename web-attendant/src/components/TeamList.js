import React, { useState, useEffect } from 'react';
import { api, errorMessage, ROLE_LABELS, formatLocation } from '../api';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'attendant', label: 'Atendentes' },
  { value: 'doctor', label: 'Médicos' },
  { value: 'admin', label: 'Administradores' },
];

function TeamList({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/users/directory')
      .then((response) => setUsers(response.data))
      .catch((err) => setError(errorMessage(err, 'Erro ao carregar a equipe')));
  }, []);

  const term = search.trim().toLowerCase();
  const visibleUsers = users.filter(
    (user) =>
      (filter === 'all' || user.role === filter) &&
      (!term ||
        user.name.toLowerCase().includes(term) ||
        formatLocation(user).toLowerCase().includes(term))
  );
  const activeCount = users.filter((user) => user.active).length;

  return (
    <div className="main-content team-content">
      <div className="panel-card">
        <div className="team-header">
          <h2>Equipe cadastrada</h2>
          <span className="team-count">
            {users.length} usuários · {activeCount} ativos
          </span>
        </div>

        <div className="team-filters">
          <input
            type="search"
            placeholder="Buscar por nome ou local"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="filter-buttons">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                className={filter === option.value ? 'chip is-active' : 'chip'}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="team-grid">
          {visibleUsers.length === 0 ? (
            <p className="empty-message">Nenhum usuário encontrado</p>
          ) : (
            visibleUsers.map((user) => (
              <div key={user._id} className={user.active ? 'team-card' : 'team-card is-inactive'}>
                <div className={`team-avatar role-${user.role}`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <strong>
                    {user.name}
                    {user._id === currentUser._id && ' (você)'}
                  </strong>
                  <span>{ROLE_LABELS[user.role]}</span>
                  <span>{formatLocation(user) || 'Sem local definido'}</span>
                </div>
                <span className={user.active ? 'status-badge' : 'status-badge is-off'}>
                  {user.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamList;
