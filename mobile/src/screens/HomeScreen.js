import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import { io } from 'socket.io-client';

import { API_URL, SOCKET_URL, TOTEM_HEADERS } from '../config';

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
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  // Mantém o totem visível no status do sistema
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('connect', () => socket.emit('identify', { type: 'totem' }));
    return () => socket.disconnect();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${API_URL}/services`);
      setServices(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      setLoading(false);
    }
  };

  // Bloqueia novos toques enquanto a senha é gerada (evita duas senhas num toque duplo)
  const generateTicket = async (serviceId) => {
    if (generating) return;
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API_URL}/tickets/generate`,
        { serviceTypeId: serviceId },
        { headers: TOTEM_HEADERS }
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
      <View style={styles.header}>
        <Text style={styles.headerText}>Escolha o atendimento</Text>
      </View>

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
});
