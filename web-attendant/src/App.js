import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api, markSession, ROLE_LABELS, formatLocation, SOCKET_URL } from './api';
import Login from './components/Login';
import Welcome from './components/Welcome';
import UserAdmin from './components/UserAdmin';
import TeamList from './components/TeamList';
import Reports from './components/Reports';
import ServiceTimes from './components/ServiceTimes';
import QueueReset from './components/QueueReset';
import Connections from './components/Connections';
import SystemStatus from './components/SystemStatus';
import './App.css';

// Abas do painel e os perfis que veem cada uma. O supervisor (liderança) só consulta:
// não cadastra usuários, não zera filas e não chama senhas.
const STAFF = ['admin', 'attendant', 'doctor'];
const MANAGERS = ['admin', 'supervisor'];
const TABS = [
  { id: 'attendance', label: 'Atendimento', roles: STAFF },
  { id: 'team', label: 'Equipe', roles: MANAGERS },
  { id: 'users', label: 'Usuários', roles: ['admin'] },
  { id: 'reports', label: 'Relatórios', roles: MANAGERS },
  { id: 'service-times', label: 'Tempos de atendimento', roles: MANAGERS },
  { id: 'queues', label: 'Filas', roles: ['admin'] },
  { id: 'connections', label: 'Conectados', roles: MANAGERS },
  { id: 'status', label: 'Status', roles: MANAGERS },
];

// Aba aberta logo após o login
const DEFAULT_VIEW = { admin: 'users', supervisor: 'connections' };
const defaultView = (role) => DEFAULT_VIEW[role] || 'attendance';

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [view, setView] = useState('attendance');

  // Restaurar a sessão do cookie (se ainda for válida)
  useEffect(() => {
    api
      .get('/auth/me')
      .then((response) => {
        markSession(true);
        setUser(response.data);
        setView(defaultView(response.data.role));
      })
      .catch(() => markSession(false))
      .finally(() => setCheckingSession(false));
  }, []);

  // Encerrar a sessão quando o token expirar
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response &&
          error.response.status === 401 &&
          !error.config.url.includes('/auth/')
        ) {
          markSession(false);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const handleLogin = (loggedUser) => {
    markSession(true);
    setUser(loggedUser);
    setView(defaultView(loggedUser.role));
  };

  // Registra o usuário como conectado enquanto o painel estiver aberto
  useEffect(() => {
    if (!user) return undefined;
    // withCredentials envia o cookie da sessão, que identifica o usuário no backend
    const socket = io(SOCKET_URL, { withCredentials: true });
    socket.on('connect', () => socket.emit('identify', { type: 'attendant' }));
    return () => socket.disconnect();
  }, [user]);

  const logout = () => {
    api
      .post('/auth/logout')
      .catch(() => {})
      .finally(() => {
        markSession(false);
        setUser(null);
      });
  };

  if (checkingSession) {
    return <div className="loading">Carregando…</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const location = formatLocation(user);
  const tabs = TABS.filter((tab) => tab.roles.includes(user.role));
  const currentView = tabs.some((tab) => tab.id === view) ? view : tabs[0].id;

  return (
    <div className="container">
      <header className="header">
        <h1>🎫 Painel de Atendimento</h1>
        <div className="header-user">
          <span>
            {user.name} · {ROLE_LABELS[user.role]}
            {location && ` · ${location}`}
          </span>
          <button onClick={logout} className="btn btn-link">
            Sair
          </button>
        </div>
        {tabs.length > 1 && (
          <nav className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={currentView === tab.id ? 'tab is-active' : 'tab'}
                onClick={() => setView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {currentView === 'users' ? (
        <UserAdmin currentUser={user} onCurrentUserChange={setUser} />
      ) : currentView === 'team' ? (
        <TeamList currentUser={user} />
      ) : currentView === 'reports' ? (
        <Reports />
      ) : currentView === 'service-times' ? (
        <ServiceTimes />
      ) : currentView === 'queues' ? (
        <QueueReset />
      ) : currentView === 'connections' ? (
        <Connections />
      ) : currentView === 'status' ? (
        <SystemStatus />
      ) : (
        <Welcome user={user} />
      )}
    </div>
  );
}

export default App;
