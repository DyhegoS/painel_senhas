import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken, ROLE_LABELS, formatLocation, SOCKET_URL } from './api';
import Login from './components/Login';
import Welcome from './components/Welcome';
import UserAdmin from './components/UserAdmin';
import TeamList from './components/TeamList';
import Reports from './components/Reports';
import QueueReset from './components/QueueReset';
import Connections from './components/Connections';
import SystemStatus from './components/SystemStatus';
import './App.css';

// Abas do painel; as marcadas com admin só aparecem para o administrador
const TABS = [
  { id: 'attendance', label: 'Atendimento' },
  { id: 'team', label: 'Equipe', admin: true },
  { id: 'users', label: 'Usuários', admin: true },
  { id: 'reports', label: 'Relatórios', admin: true },
  { id: 'queues', label: 'Filas', admin: true },
  { id: 'connections', label: 'Conectados', admin: true },
  { id: 'status', label: 'Status', admin: true },
];

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()));
  const [view, setView] = useState('attendance');

  // Restaurar sessão salva
  useEffect(() => {
    if (!getToken()) return;
    api
      .get('/auth/me')
      .then((response) => {
        setUser(response.data);
        setView(response.data.role === 'admin' ? 'users' : 'attendance');
      })
      .catch(() => setToken(null))
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
          !error.config.url.includes('/auth/login')
        ) {
          setToken(null);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  const handleLogin = (token, loggedUser) => {
    if (token) setToken(token);
    setUser(loggedUser);
    setView(loggedUser.role === 'admin' ? 'users' : 'attendance');
  };

  // Registra o usuário como conectado enquanto o painel estiver aberto
  useEffect(() => {
    if (!user) return undefined;
    const socket = io(SOCKET_URL);
    socket.on('connect', () => socket.emit('identify', { type: 'attendant', token: getToken() }));
    return () => socket.disconnect();
  }, [user]);

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  if (checkingSession) {
    return <div className="loading">Carregando…</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const location = formatLocation(user);
  const tabs = TABS.filter((tab) => !tab.admin || user.role === 'admin');
  const currentView = tabs.some((tab) => tab.id === view) ? view : 'attendance';

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
