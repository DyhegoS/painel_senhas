import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = 'http://192.168.50.8:5000/api';
const SOCKET_URL = 'http://192.168.50.8j:5000';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // home, ticket
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchServices();
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => newSocket.disconnect();
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

  const generateTicket = async (serviceId) => {
    try {
      const response = await axios.post(`${API_URL}/tickets/generate`, {
        serviceTypeId: serviceId,
      });
      setTicket(response.data);
      setCurrentScreen('ticket');

      if (socket) {
        socket.on('ticket_status_update', (data) => {
          if (data.ticketId === response.data._id) {
            setTicket((prev) => ({ ...prev, ...data }));
          }
        });
      }
    } catch (error) {
      console.error('Erro ao gerar senha:', error);
      alert('Erro ao gerar senha');
    }
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setTicket(null);
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p>Carregando...</p>
      </div>
    );
  }

  if (currentScreen === 'ticket' && ticket) {
    const statusColor = {
      waiting: '#0066cc',
      called: '#ff6b00',
      attended: '#28a745',
      cancelled: '#dc3545',
    }[ticket.status];

    return (
      <div style={[styles.container, { backgroundColor: statusColor }]}>
        <div style={styles.ticketContainer}>
          <p style={styles.label}>Sua Senha</p>
          <div style={styles.ticketNumber}>{ticket.number}</div>

          <div style={styles.statusContainer}>
            <p style={styles.statusText}>
              {ticket.status === 'waiting' && 'Aguardando atendimento'}
              {ticket.status === 'called' && 'Sua senha foi chamada!'}
              {ticket.status === 'attended' && 'Atendimento concluído'}
              {ticket.status === 'cancelled' && 'Senha cancelada'}
            </p>
            {ticket.status === 'waiting' && (
              <p style={styles.positionText}>Posição na fila: {ticket.position}</p>
            )}
          </div>

          <button onClick={handleBackToHome} style={styles.backButton}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>🎫 Gerador de Senhas</h1>
        <p>Escolha o tipo de atendimento</p>
      </div>

      <div style={styles.servicesGrid}>
        {services.map((service) => (
          <div
            key={service._id}
            style={styles.serviceCard}
            onClick={() => generateTicket(service._id)}
          >
            <div style={styles.servicePrefix}>{service.prefix}</div>
            <h3 style={styles.serviceName}>{service.name}</h3>
            <p style={styles.serviceDescription}>{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    color: '#333',
  },
  servicesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '30px',
    textAlign: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'all 0.3s ease',
    ':hover': {
      transform: 'translateY(-5px)',
      boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
    },
  },
  servicePrefix: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#0066cc',
    marginBottom: '10px',
  },
  serviceName: {
    fontSize: '20px',
    marginBottom: '10px',
    color: '#333',
  },
  serviceDescription: {
    fontSize: '14px',
    color: '#666',
  },
  ticketContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '15px',
    padding: '50px',
    maxWidth: '500px',
    margin: '50px auto',
    textAlign: 'center',
    color: '#fff',
  },
  label: {
    fontSize: '20px',
    marginBottom: '20px',
  },
  ticketNumber: {
    fontSize: '80px',
    fontWeight: 'bold',
    marginBottom: '40px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  statusContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '30px',
  },
  statusText: {
    fontSize: '20px',
    fontWeight: '600',
    margin: '0',
  },
  positionText: {
    fontSize: '16px',
    marginTop: '10px',
    margin: '0',
  },
  backButton: {
    backgroundColor: '#fff',
    color: '#0066cc',
    border: 'none',
    padding: '12px 30px',
    borderRadius: '25px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

export default App;
