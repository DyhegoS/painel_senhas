// Endereço do backend. Configure em mobile/.env:
//   EXPO_PUBLIC_BACKEND_URL=http://<IP do PC>:5000
export const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.15.5:5000';
export const API_URL = `${SOCKET_URL}/api`;
