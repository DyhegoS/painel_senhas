import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Os ajustes do totem (servidor, token e PIN) ficam salvos no próprio aparelho e são
// alterados pela tela de ajustes. As variáveis de mobile/.env servem só como valor inicial:
//   EXPO_PUBLIC_BACKEND_URL=http://<IP do servidor>
//   EXPO_PUBLIC_TOTEM_TOKEN=<mesmo TOTEM_TOKEN do backend, se configurado>
const STORAGE_KEY = 'totem_settings';

const DEFAULTS = {
  serverUrl: process.env.EXPO_PUBLIC_BACKEND_URL || '',
  totemToken: process.env.EXPO_PUBLIC_TOTEM_TOKEN || '',
  pin: '',
};

// Geração da senha aguarda a impressora (até ~8 s no backend)
export const REQUEST_TIMEOUT_MS = 15000;

// Aceita "192.168.0.10", "192.168.0.10:5000" ou a URL completa
export function normalizeServerUrl(url) {
  const value = String(url || '')
    .trim()
    .replace(/\/+$/, '');
  if (value && !/^https?:\/\//i.test(value)) return `http://${value}`;
  return value;
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setSettings({ ...DEFAULTS, ...(raw ? JSON.parse(raw) : {}) }))
      .catch(() => setSettings(DEFAULTS));
  }, []);

  const save = useCallback(
    async (changes) => {
      const next = { ...settings, ...changes };
      next.serverUrl = normalizeServerUrl(next.serverUrl);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSettings(next);
    },
    [settings]
  );

  const value = useMemo(() => {
    if (!settings) return null;
    const serverUrl = normalizeServerUrl(settings.serverUrl);
    return {
      ...settings,
      serverUrl,
      socketUrl: serverUrl,
      apiUrl: `${serverUrl}/api`,
      // Enviado em toda geração de senha; vazio quando o backend não exige token de totem
      totemHeaders: settings.totemToken ? { 'X-Totem-Token': settings.totemToken } : {},
      save,
    };
  }, [settings, save]);

  // Enquanto lê os ajustes salvos, não mostra nada (leva milissegundos)
  if (!value) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
