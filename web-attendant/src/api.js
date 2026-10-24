import axios from 'axios';

export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5000`;
export const API_URL = process.env.REACT_APP_API_URL || `${SOCKET_URL}/api`;

// A sessão fica num cookie httpOnly definido pelo backend (a página não tem acesso ao token).
// No localStorage fica só um aviso, sem segredo, para as outras janelas (acionador)
// perceberem login e logout.
export const SESSION_KEY = 'painel_senhas_session';
const LEGACY_TOKEN_KEY = 'painel_senhas_token';

export const api = axios.create({ baseURL: API_URL, withCredentials: true });

export function markSession(active) {
  try {
    if (active) localStorage.setItem(SESSION_KEY, String(Date.now()));
    else localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // Sem armazenamento disponível: as outras janelas descobrem o logout no próximo erro 401
  }
}

// Versões anteriores guardavam o token aqui: remove para não deixá-lo exposto
try {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
} catch (error) {
  // Sem armazenamento disponível
}

// Extrai a mensagem de erro enviada pela API
export function errorMessage(error, fallback) {
  return (error.response && error.response.data && error.response.data.error) || fallback;
}

export const ROLE_LABELS = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  attendant: 'Atendente',
  doctor: 'Médico',
};

export const LOCATION_TYPES = ['Guichê', 'Consultório', 'Sala'];

export function formatLocation(user) {
  if (!user || !user.locationNumber) return '';
  return `${user.locationType} ${user.locationNumber}`;
}

// Duração em segundos no formato 1h 05min, 12min 30s ou 45s
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

// Data local no formato AAAA-MM-DD (para os campos de data)
export function toInputDate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 10);
}

// Período de dias inteiros (fuso deste computador) nos parâmetros que a API espera
export function dayRangeParams(startDate, endDate) {
  return {
    start: new Date(`${startDate}T00:00:00`).toISOString(),
    end: new Date(`${endDate}T23:59:59.999`).toISOString(),
  };
}

export const CLIENT_TYPE_LABELS = {
  attendant: 'Painel de atendimento',
  acionador: 'Acionador de senhas',
  panel: 'Painel de chamada (TV)',
  totem: 'Totem',
  customer: 'Tela da senha (totem)',
  printer: 'Impressora',
  unknown: 'Não identificado',
};
