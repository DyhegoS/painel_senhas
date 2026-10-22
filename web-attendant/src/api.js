import axios from 'axios';

export const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5000`;
export const API_URL = process.env.REACT_APP_API_URL || `${SOCKET_URL}/api`;

const TOKEN_KEY = 'painel_senhas_token';

export const api = axios.create({ baseURL: API_URL });

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    // Sem armazenamento disponível: a sessão dura até recarregar a página
  }
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

setToken(getToken());

// Extrai a mensagem de erro enviada pela API
export function errorMessage(error, fallback) {
  return (error.response && error.response.data && error.response.data.error) || fallback;
}

export const ROLE_LABELS = {
  admin: 'Administrador',
  attendant: 'Atendente',
  doctor: 'Médico',
};

export const LOCATION_TYPES = ['Guichê', 'Consultório', 'Sala'];

export function formatLocation(user) {
  if (!user || !user.locationNumber) return '';
  return `${user.locationType} ${user.locationNumber}`;
}
