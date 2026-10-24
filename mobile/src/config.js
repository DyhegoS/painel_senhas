// Configuração do totem em mobile/.env (veja mobile/.env.example):
//   EXPO_PUBLIC_BACKEND_URL=http://<IP do servidor>:5000
//   EXPO_PUBLIC_TOTEM_TOKEN=<mesmo TOTEM_TOKEN do backend, se configurado>
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BACKEND_URL) {
  console.warn(
    'EXPO_PUBLIC_BACKEND_URL não definido em mobile/.env — usando http://localhost:5000, ' +
      'que só funciona no navegador do próprio servidor'
  );
}

export const SOCKET_URL = (BACKEND_URL || 'http://localhost:5000').replace(/\/+$/, '');
export const API_URL = `${SOCKET_URL}/api`;

// Enviado em toda geração de senha; vazio quando o backend não exige token de totem
export const TOTEM_HEADERS = process.env.EXPO_PUBLIC_TOTEM_TOKEN
  ? { 'X-Totem-Token': process.env.EXPO_PUBLIC_TOTEM_TOKEN }
  : {};
