import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  errorMessage,
  formatDuration,
  formatLocation,
  ROLE_LABELS,
  CLIENT_TYPE_LABELS,
} from '../api';

const REFRESH_INTERVAL_MS = 10000;

function Connections() {
  const [connections, setConnections] = useState([]);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await api.get('/admin/connections');
      setConnections(response.data);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Erro ao carregar as conexões'));
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    const timer = window.setInterval(fetchConnections, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchConnections]);

  // Um usuário pode estar com o painel e o acionador abertos: agrupa por usuário
  const users = new Map();
  connections
    .filter((c) => c.user)
    .forEach((c) => {
      const entry = users.get(c.user._id) || { user: c.user, since: c.connectedAt, screens: [] };
      entry.screens.push(CLIENT_TYPE_LABELS[c.type] || c.type);
      if (new Date(c.connectedAt) < new Date(entry.since)) entry.since = c.connectedAt;
      users.set(c.user._id, entry);
    });
  const devices = connections.filter((c) => !c.user);
  const now = Date.now();

  return (
    <div className="admin-page">
      <div className="panel-card">
        <div className="team-header">
          <h2>Usuários conectados</h2>
          <span className="team-count">
            {users.size} usuário(s)
            {updatedAt && ` · atualizado às ${updatedAt.toLocaleTimeString('pt-BR')}`}
          </span>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Local</th>
                <th>Telas abertas</th>
                <th>Conectado há</th>
              </tr>
            </thead>
            <tbody>
              {users.size === 0 && (
                <tr>
                  <td colSpan="5" className="empty-message">
                    Nenhum usuário conectado
                  </td>
                </tr>
              )}
              {Array.from(users.values()).map(({ user, since, screens }) => (
                <tr key={user._id}>
                  <td>
                    <strong>{user.name}</strong> <small>@{user.username}</small>
                  </td>
                  <td>{ROLE_LABELS[user.role]}</td>
                  <td>{formatLocation(user) || '—'}</td>
                  <td>{screens.join(', ')}</td>
                  <td>{formatDuration((now - new Date(since)) / 1000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel-card">
        <div className="team-header">
          <h2>Dispositivos conectados</h2>
          <span className="team-count">{devices.length} dispositivo(s)</span>
        </div>
        <div className="table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Endereço</th>
                <th>Conectado há</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 && (
                <tr>
                  <td colSpan="3" className="empty-message">
                    Nenhum dispositivo conectado
                  </td>
                </tr>
              )}
              {devices.map((d) => (
                <tr key={d.id}>
                  <td>{CLIENT_TYPE_LABELS[d.type] || d.type}</td>
                  <td>{d.ip ? d.ip.replace('::ffff:', '') : '—'}</td>
                  <td>{formatDuration((now - new Date(d.connectedAt)) / 1000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Connections;
