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
// Atendimentos acima deste tempo aparecem destacados (possível esquecimento de finalizar)
const LONG_SERVICE_SECONDS = 30 * 60;

function Connections() {
  const [connections, setConnections] = useState([]);
  const [inService, setInService] = useState([]);
  // Diferença entre o relógio do servidor e o deste computador
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchConnections = useCallback(async () => {
    try {
      const [connectionsResponse, inServiceResponse] = await Promise.all([
        api.get('/admin/connections'),
        api.get('/admin/in-service'),
      ]);
      setConnections(connectionsResponse.data);
      setInService(inServiceResponse.data.tickets);
      setClockOffset(new Date(inServiceResponse.data.serverTime).getTime() - Date.now());
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Erro ao carregar as conexões'));
    }
  }, []);

  useEffect(() => {
    fetchConnections();
    const timer = window.setInterval(fetchConnections, REFRESH_INTERVAL_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearInterval(timer);
      window.clearInterval(clock);
    };
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
  const serverNow = now + clockOffset;

  return (
    <div className="admin-page">
      <div className="panel-card">
        <div className="team-header">
          <h2>Em atendimento agora</h2>
          <span className="team-count">{inService.length} atendimento(s)</span>
        </div>
        <div className="table-scroll">
          <table className="report-table">
            <thead>
              <tr>
                <th>Atendente</th>
                <th>Local</th>
                <th>Senha</th>
                <th>Serviço</th>
                <th>Chamada às</th>
                <th>Tempo de atendimento</th>
              </tr>
            </thead>
            <tbody>
              {inService.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-message">
                    Ninguém em atendimento no momento
                  </td>
                </tr>
              )}
              {inService.map((ticket) => {
                const elapsed = Math.max(0, (serverNow - new Date(ticket.calledAt)) / 1000);
                return (
                  <tr key={ticket._id}>
                    <td>
                      <strong>{ticket.attendant.name}</strong>
                      {ticket.attendant.role && (
                        <small> · {ROLE_LABELS[ticket.attendant.role]}</small>
                      )}
                    </td>
                    <td>{formatLocation(ticket.attendant) || '—'}</td>
                    <td>
                      <strong>{ticket.number}</strong>
                    </td>
                    <td>{ticket.serviceType}</td>
                    <td>
                      {new Date(ticket.calledAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td
                      className={elapsed > LONG_SERVICE_SECONDS ? 'elapsed-long' : ''}
                      title={
                        elapsed > LONG_SERVICE_SECONDS
                          ? 'Atendimento longo: verifique se não faltou finalizar'
                          : undefined
                      }
                    >
                      {formatDuration(elapsed)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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
                  <td>{formatDuration((serverNow - new Date(since)) / 1000)}</td>
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
                  <td>{formatDuration((serverNow - new Date(d.connectedAt)) / 1000)}</td>
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
