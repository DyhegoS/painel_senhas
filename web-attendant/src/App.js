import React, { useState, useEffect } from 'react';
import { api, getToken, setToken, ROLE_LABELS, formatLocation } from './api';
import Login from './components/Login';
import AttendantPanel from './components/AttendantPanel';
import UserAdmin from './components/UserAdmin';
import TeamList from './components/TeamList';
import './App.css';

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
        <nav className="tabs">
          <button
            className={view === 'attendance' ? 'tab is-active' : 'tab'}
            onClick={() => setView('attendance')}
          >
            Atendimento
          </button>
          <button
            className={view === 'team' ? 'tab is-active' : 'tab'}
            onClick={() => setView('team')}
          >
            Equipe
          </button>
          {user.role === 'admin' && (
            <button
              className={view === 'users' ? 'tab is-active' : 'tab'}
              onClick={() => setView('users')}
            >
              Usuários
            </button>
          )}
        </nav>
      </header>

      {view === 'users' && user.role === 'admin' ? (
        <UserAdmin currentUser={user} onCurrentUserChange={setUser} />
      ) : view === 'team' ? (
        <TeamList currentUser={user} />
      ) : (
        <AttendantPanel />
      )}
    </div>
  );
}

export default App;
