import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.50.8:5000';

export default function TicketScreen({ route, navigation }) {
  const { ticket } = route.params;
  const [status, setStatus] = useState(ticket.status);
  const [position, setPosition] = useState(ticket.position);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Conectado ao servidor');
    });

    socket.on('ticket_status_update', (data) => {
      if (data.ticketId === ticket._id) {
        setStatus(data.status);
        setPosition(data.position);
      }
    });

    return () => socket.disconnect();
  }, [ticket._id]);

  const getStatusMessage = () => {
    switch (status) {
      case 'waiting':
        return 'Aguardando atendimento';
      case 'called':
        return 'Sua senha foi chamada!';
      case 'attended':
        return 'Atendimento concluído';
      case 'cancelled':
        return 'Senha cancelada';
      default:
        return 'Status desconhecido';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'called':
        return '#ff6b00';
      case 'attended':
        return '#28a745';
      case 'cancelled':
        return '#dc3545';
      default:
        return '#0066cc';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      <Text style={styles.label}>Sua Senha</Text>
      <Text style={styles.ticketNumber}>{ticket.number}</Text>

      <View style={styles.statusContainer}>
        <Text style={styles.statusMessage}>{getStatusMessage()}</Text>
        {status === 'waiting' && <Text style={styles.position}>Posição na fila: {position}</Text>}
      </View>

      {ticket.printStatus === 'printed' && (
        <Text style={styles.printMessage}>Retire seu papel na impressora abaixo</Text>
      )}
      {(ticket.printStatus === 'error' || ticket.printStatus === 'no_printer') && (
        <Text style={styles.printMessage}>
          Não foi possível imprimir. Anote sua senha ou procure a recepção.
        </Text>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  label: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
  },
  ticketNumber: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  statusContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 20,
    marginBottom: 40,
    width: '100%',
  },
  statusMessage: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  position: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
  },
  printMessage: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#0066cc',
    fontSize: 16,
    fontWeight: '600',
  },
});
