import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { io } from 'socket.io-client';

import { useSettings, REQUEST_TIMEOUT_MS } from '../config';

// Sem servidor, tenta carregar os serviços de novo a cada intervalo
const RETRY_INTERVAL_MS = 10000;
// Segurar o título por este tempo abre os ajustes do totem
const SETTINGS_PRESS_MS = 3000;

// Cor do botão conforme o tipo de atendimento
const CARD_COLORS = {
  normal: { backgroundColor: '#e4e6e9', borderColor: '#c4c8cd' },
  idoso80: { backgroundColor: '#e3d7f5', borderColor: '#c3aee6' },
  preferencial: { backgroundColor: '#f8d4d4', borderColor: '#eaa9a9' },
};

function cardColor(service) {
  if (service.priority === 2) return CARD_COLORS.idoso80;
  if (service.priority === 1) return CARD_COLORS.preferencial;
  if (service.priority === 0) return CARD_COLORS.normal;
  const name = service.name.toLowerCase();
  if (name.includes('80+')) return CARD_COLORS.idoso80;
  if (name.includes('preferencial')) return CARD_COLORS.preferencial;
  return CARD_COLORS.normal;
}

export default function HomeScreen({ navigation }) {
  const { apiUrl, socketUrl, totemHeaders } = useSettings();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/services`, { timeout: REQUEST_TIMEOUT_MS });
      setServices(response.data);
      setOffline(false);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Servidor fora do ar: continua tentando sozinho até voltar
  useEffect(() => {
    if (!offline) return undefined;
    const timer = setInterval(fetchServices, RETRY_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [offline, fetchServices]);

  // Mantém o totem visível no status do sistema; ao reconectar, recarrega os serviços
  useEffect(() => {
    const socket = io(socketUrl);
    socket.on('connect', () => {
      socket.emit('identify', { type: 'totem' });
      fetchServices();
    });
    return () => socket.disconnect();
  }, [socketUrl, fetchServices]);

  // O botão "voltar" do Android não fecha o totem
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  // Bloqueia novos toques enquanto a senha é gerada (evita duas senhas num toque duplo)
  const generateTicket = async (serviceId) => {
    if (generating) return;
    setGenerating(true);
    try {
      const response = await axios.post(
        `${apiUrl}/tickets/generate`,
        { serviceTypeId: serviceId },
        { headers: totemHeaders, timeout: REQUEST_TIMEOUT_MS }
      );
      navigation.navigate('Ticket', { ticket: response.data });
    } catch (error) {
      console.error('Erro ao gerar senha:', error);
      Alert.alert('Não foi possível gerar a senha', 'Tente novamente ou procure a recepção.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        delayLongPress={SETTINGS_PRESS_MS}
        onLongPress={() => navigation.navigate('Settings')}
        style={styles.header}
      >
        <Text style={styles.headerText}>Escolha o atendimento</Text>
      </TouchableOpacity>

      {offline && (
        <View style={styles.offline}>
          <Text style={styles.offlineTitle}>Sem conexão com o servidor</Text>
          <Text style={styles.offlineText}>
            Tentando novamente… Se continuar, procure a recepção.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchServices}>
            <Text style={styles.retryText}>Tentar agora</Text>
          </TouchableOpacity>
        </View>
      )}

      {!offline && services.length === 0 && (
        <View style={styles.offline}>
          <Text style={styles.offlineTitle}>Nenhum tipo de atendimento disponível</Text>
          <Text style={styles.offlineText}>
            Cadastre os serviços no servidor e toque em atualizar.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchServices}>
            <Text style={styles.retryText}>Atualizar</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.servicesGrid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service._id}
            style={[styles.serviceCard, cardColor(service), generating && styles.disabled]}
            onPress={() => generateTicket(service._id)}
            disabled={generating}
          >
            <Text style={styles.servicePrefix}>{service.prefix}</Text>
            <Text style={styles.serviceName} numberOfLines={1}>
              {service.name}
            </Text>
            <Text style={styles.serviceDescription} numberOfLines={1}>
              {service.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#0066cc',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  serviceCard: {
    width: '49%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  servicePrefix: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: 2,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
    marginBottom: 2,
  },
  serviceDescription: {
    fontSize: 12,
    color: '#555',
  },
  disabled: {
    opacity: 0.5,
  },
  offline: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffe08a',
    borderWidth: 1,
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
    alignItems: 'center',
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#664d03',
  },
  offlineText: {
    fontSize: 14,
    color: '#664d03',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#0066cc',
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
