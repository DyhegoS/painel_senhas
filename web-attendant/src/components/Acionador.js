import React, { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, errorMessage, formatLocation, SESSION_KEY, SOCKET_URL } from '../api';
import '../App.css';
import './Acionador.css';

const REFRESH_INTERVAL_MS = 30000;
// Opção "qualquer fila": o backend chama 80+ e preferenciais antes das demais
const ANY_QUEUE = 'any';

// Junta todas as filas num só resumo, para a opção "qualquer fila"
function anyQueueSummary(summary) {
  const oldest = summary
    .map((s) => s.oldestCreatedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0];
  return {
    _id: undefined,
    name: null,
    waiting: summary.reduce((sum, s) => sum + s.waiting, 0),
    oldestCreatedAt: oldest || null,
  };
}

// Tempo decorrido desde uma data (espera na fila, duração do atendimento), no formato 00:00:00
function formatElapsed(since, now) {
  if (!since) return '--:--:--';
  const seconds = Math.max(0, Math.floor((now - new Date(since)) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3.6 3.1-6 7-6s7 2.4 7 6H2Zm15.5 0c0-2.1-.8-3.9-2.2-5.2.5-.1 1.1-.2 1.7-.2 3.3 0 6 2 6 5.4H17.5Z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-13h-2v6l5 3 1-1.7-4-2.3V7Z" />
  </svg>
);

const CallIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 4 12h5v6h6v-6h5l-8-9ZM8 20h8v2H8v-2Z" />
  </svg>
);

function Acionador() {
  const [user, setUser] = useState(null);
  const [loggedOut, setLoggedOut] = useState(false);
  const [tab, setTab] = useState('chamada');
  const [summary, setSummary] = useState([]);
  const [selectedId, setSelectedId] = useState(ANY_QUEUE);
  const [current, setCurrent] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Diferença entre o relógio do servidor e o deste computador (os horários vêm do servidor)
  const [clockOffset, setClockOffset] = useState(0);
  const [showNumberCall, setShowNumberCall] = useState(false);
  const [numberServiceId, setNumberServiceId] = useState('');
  const [number, setNumber] = useState('');

  const handleError = useCallback((error, fallback) => {
    if (error.response && error.response.status === 401) {
      setLoggedOut(true);
      return;
    }
    // A senha deixou de estar em atendimento (ex.: filas zeradas): libera o acionador
    if (error.response && error.response.status === 409) setCurrent(null);
    setMessage(errorMessage(error, fallback));
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get('/tickets/queue/summary');
      setSummary(response.data);
      const firstId = response.data.length > 0 ? response.data[0]._id : '';
      setNumberServiceId((id) => id || firstId);
    } catch (error) {
      handleError(error, 'Erro ao carregar as filas');
    }
  }, [handleError]);

  useEffect(() => {
    document.title = 'Acionador de senhas';
    if (loggedOut) return undefined;

    api
      .get('/auth/me')
      .then((response) => setUser(response.data))
      .catch((error) => handleError(error, 'Erro ao carregar o usuário'));
    api
      .get('/tickets/current')
      .then((response) => setCurrent(response.data.ticket))
      .catch((error) => handleError(error, 'Erro ao carregar o atendimento'));
    fetchSummary();

    const sentAt = Date.now();
    api
      .get('/health')
      .then((response) => {
        const receivedAt = Date.now();
        setClockOffset(new Date(response.data.timestamp).getTime() - (sentAt + receivedAt) / 2);
      })
      .catch(() => {});

    const socket = io(SOCKET_URL, { withCredentials: true });
    socket.on('connect', () => socket.emit('identify', { type: 'acionador' }));
    socket.on('queue_update', fetchSummary);

    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const refresh = window.setInterval(fetchSummary, REFRESH_INTERVAL_MS);
    return () => {
      socket.disconnect();
      window.clearInterval(clock);
      window.clearInterval(refresh);
    };
  }, [loggedOut, fetchSummary, handleError]);

  // Saiu (ou entrou de novo) no painel de atendimento na janela principal
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === SESSION_KEY || event.key === null) setLoggedOut(!event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const run = async (request, fallback) => {
    setBusy(true);
    setMessage('');
    try {
      return await request();
    } catch (error) {
      handleError(error, fallback);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const callNext = (service) =>
    run(async () => {
      const response = await api.post('/tickets/call', { serviceTypeId: service._id });
      if (response.data.ticket === null) {
        setMessage(
          service.name
            ? `Nenhum paciente aguardando em ${service.name}`
            : 'Nenhum paciente aguardando'
        );
        return;
      }
      setCurrent(response.data);
    }, 'Erro ao chamar a senha');

  const callByNumber = (event) => {
    event.preventDefault();
    run(async () => {
      const response = await api.post('/tickets/call-number', {
        serviceTypeId: numberServiceId,
        number,
      });
      setCurrent(response.data);
      setNumber('');
      setShowNumberCall(false);
    }, 'Erro ao chamar a senha');
  };

  const recall = () =>
    run(() => api.post(`/tickets/${current._id}/recall`), 'Erro ao rechamar a senha');

  const closeTicket = (action, fallback) =>
    run(async () => {
      await api.post(`/tickets/${current._id}/${action}`);
      setCurrent(null);
    }, fallback);

  if (loggedOut) {
    return (
      <div className="acionador">
        <header className="acionador-header">🎫 Painel de Senhas</header>
        <div className="acionador-body acionador-center">
          <p>Sessão encerrada. Entre no painel de atendimento e abra o acionador novamente.</p>
          <button className="btn btn-secondary" onClick={() => window.close()}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const selected =
    selectedId === ANY_QUEUE ? anyQueueSummary(summary) : summary.find((s) => s._id === selectedId);
  const location = formatLocation(user);
  const serverNow = now + clockOffset;

  return (
    <div className="acionador">
      <header className="acionador-header">
        🎫 Painel de Senhas
        {user && (
          <span className="acionador-user">
            {user.name}
            {location && ` · ${location}`}
          </span>
        )}
      </header>

      {current ? (
        <div className="acionador-body acionador-center">
          <div className="acionador-label">Em atendimento</div>
          <div className="acionador-ticket">{current.number}</div>
          <div className="acionador-service">{current.serviceType}</div>
          <div className="acionador-elapsed" title="Tempo desde a chamada">
            <ClockIcon />
            <span className="acionador-label">Tempo de atendimento</span>
            <output className="acionador-timer">
              {formatElapsed(current.calledAt, serverNow)}
            </output>
          </div>
          <div className="acionador-actions">
            <button className="btn btn-secondary" onClick={recall} disabled={busy}>
              🔊 Rechamar
            </button>
            <button
              className="btn btn-success"
              onClick={() => closeTicket('finish', 'Erro ao finalizar o atendimento')}
              disabled={busy}
            >
              ✓ Finalizar atendimento
            </button>
            <button
              className="btn btn-danger"
              onClick={() => closeTicket('absent', 'Erro ao marcar paciente ausente')}
              disabled={busy}
            >
              ✗ Paciente ausente
            </button>
          </div>
          {message && <p className="acionador-message">{message}</p>}
        </div>
      ) : (
        <>
          <nav className="acionador-tabs">
            <button
              className={tab === 'chamada' ? 'is-active' : ''}
              onClick={() => setTab('chamada')}
            >
              Chamada
            </button>
            <button className={tab === 'filas' ? 'is-active' : ''} onClick={() => setTab('filas')}>
              Filas
            </button>
          </nav>

          {tab === 'chamada' ? (
            <div className="acionador-body">
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                aria-label="Serviço"
              >
                <option value={ANY_QUEUE}>Qualquer fila (80+ e preferenciais primeiro)</option>
                {summary.map((service) => (
                  <option key={service._id} value={service._id}>
                    {service.name}
                  </option>
                ))}
              </select>

              <div className="acionador-stats">
                <span title="Pacientes aguardando">
                  <PeopleIcon />
                  <output>{selected ? selected.waiting : 0}</output>
                </span>
                <span title="Maior tempo de espera">
                  <ClockIcon />
                  <output className="acionador-timer">
                    {formatElapsed(selected && selected.oldestCreatedAt, serverNow)}
                  </output>
                </span>
              </div>

              <button
                className="acionador-call"
                onClick={() => callNext(selected)}
                disabled={busy || !selected}
                title="Chamar próxima senha"
              >
                <CallIcon />
                <span>Chamar próxima</span>
              </button>

              <button
                className="btn btn-link acionador-toggle"
                onClick={() => setShowNumberCall((show) => !show)}
              >
                {showNumberCall ? '▾' : '▸'} Chamar senha pelo número
              </button>

              {showNumberCall && (
                <form className="acionador-number" onSubmit={callByNumber}>
                  <select
                    value={numberServiceId}
                    onChange={(event) => setNumberServiceId(event.target.value)}
                    aria-label="Serviço da senha"
                  >
                    {summary.map((service) => (
                      <option key={service._id} value={service._id}>
                        {service.prefix} · {service.name}
                      </option>
                    ))}
                  </select>
                  <div className="acionador-number-row">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Nº da senha"
                      value={number}
                      onChange={(event) => setNumber(event.target.value.replace(/\D/g, ''))}
                      required
                    />
                    <button className="btn btn-primary" type="submit" disabled={busy || !number}>
                      Chamar
                    </button>
                  </div>
                </form>
              )}

              {message && <p className="acionador-message">{message}</p>}
            </div>
          ) : (
            <div className="acionador-body">
              <table className="acionador-queues">
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th title="Pacientes aguardando">
                      <PeopleIcon />
                    </th>
                    <th title="Maior tempo de espera">
                      <ClockIcon />
                    </th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {summary.map((service) => (
                    <tr key={service._id}>
                      <td>{service.name}</td>
                      <td className="num">{service.waiting}</td>
                      <td className="num">{formatElapsed(service.oldestCreatedAt, serverNow)}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => callNext(service)}
                          disabled={busy || service.waiting === 0}
                        >
                          Chamar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {message && <p className="acionador-message">{message}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Acionador;
