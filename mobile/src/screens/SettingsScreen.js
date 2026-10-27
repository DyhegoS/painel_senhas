import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';

import { useSettings, normalizeServerUrl } from '../config';

// Ajustes do totem. Acesso: segurar o título da tela inicial por 3 segundos.
// Com PIN definido, ele é pedido antes de mostrar os ajustes.
export default function SettingsScreen({ navigation }) {
  const settings = useSettings();
  const [unlocked, setUnlocked] = useState(!settings.pin);
  const [pinAttempt, setPinAttempt] = useState('');
  const [pinError, setPinError] = useState('');

  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [totemToken, setTotemToken] = useState(settings.totemToken);
  const [newPin, setNewPin] = useState('');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  const leave = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const checkPin = () => {
    if (pinAttempt === settings.pin) {
      setUnlocked(true);
    } else {
      setPinError('PIN incorreto');
      setPinAttempt('');
    }
  };

  const testConnection = async () => {
    const url = normalizeServerUrl(serverUrl);
    if (!url) {
      setMessage({ ok: false, text: 'Informe o endereço do servidor' });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      await axios.get(`${url}/api/health`, { timeout: 5000 });
      const services = await axios.get(`${url}/api/services`, { timeout: 5000 });
      setMessage({
        ok: true,
        text: `Conectado. ${services.data.length} tipo(s) de atendimento disponível(is).`,
      });
    } catch (error) {
      setMessage({
        ok: false,
        text: `Sem resposta de ${url}. Confira o IP e se o celular está na mesma rede Wi-Fi.`,
      });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    if (!normalizeServerUrl(serverUrl)) {
      setMessage({ ok: false, text: 'Informe o endereço do servidor' });
      return;
    }
    if (newPin && !/^\d{4,8}$/.test(newPin)) {
      setMessage({ ok: false, text: 'O PIN deve ter de 4 a 8 números' });
      return;
    }
    await settings.save({
      serverUrl,
      totemToken: totemToken.trim(),
      ...(newPin ? { pin: newPin } : {}),
    });
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  if (!unlocked) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Ajustes do totem</Text>
        <TextInput
          style={[styles.input, styles.pinInput]}
          value={pinAttempt}
          onChangeText={(value) => {
            setPinAttempt(value);
            setPinError('');
          }}
          onSubmitEditing={checkPin}
          placeholder="PIN"
          keyboardType="number-pad"
          secureTextEntry
          autoFocus
          maxLength={8}
        />
        {pinError ? <Text style={styles.error}>{pinError}</Text> : null}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.secondary]} onPress={leave}>
            <Text style={styles.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={checkPin}>
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Ajustes do totem</Text>

        <Text style={styles.label}>Endereço do servidor</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="Ex.: 192.168.0.10"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.hint}>
          IP do servidor Ubuntu. Sem porta quando o sistema roda pelo nginx (produção).
        </Text>

        <Text style={styles.label}>Token do totem</Text>
        <TextInput
          style={styles.input}
          value={totemToken}
          onChangeText={setTotemToken}
          placeholder="Deixe vazio se o servidor não exigir"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Text style={styles.hint}>Igual ao TOTEM_TOKEN do deploy/.env no servidor.</Text>

        <Text style={styles.label}>
          {settings.pin ? 'Novo PIN dos ajustes' : 'PIN dos ajustes'}
        </Text>
        <TextInput
          style={styles.input}
          value={newPin}
          onChangeText={setNewPin}
          placeholder={settings.pin ? 'Deixe vazio para manter o atual' : '4 a 8 números'}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
        />
        {!settings.pin && (
          <Text style={styles.hint}>
            Recomendado: sem PIN, qualquer pessoa que segurar o título abre esta tela.
          </Text>
        )}

        {message && (
          <Text style={[styles.message, message.ok ? styles.ok : styles.error]}>
            {message.text}
          </Text>
        )}

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.secondary]}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color="#0066cc" />
            ) : (
              <Text style={styles.secondaryText}>Testar conexão</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={save}>
            <Text style={styles.buttonText}>Salvar</Text>
          </TouchableOpacity>
        </View>

        {settings.serverUrl ? (
          <TouchableOpacity style={styles.cancel} onPress={leave}>
            <Text style={styles.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 24,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c4c8cd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
  },
  pinInput: {
    width: 200,
    textAlign: 'center',
    letterSpacing: 6,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  message: {
    fontSize: 15,
    marginTop: 16,
  },
  ok: {
    color: '#1e7e34',
  },
  error: {
    color: '#c82333',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  button: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    marginHorizontal: 6,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0066cc',
  },
  secondaryText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '600',
  },
  cancel: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
});
