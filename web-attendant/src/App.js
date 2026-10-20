import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './App.css';

const API_URL = 'http://192.168.50.8:5000/api';
const SOCKET_URL = 'http://192.168.50.8:5000';

function App() {
  const [queue, setQueue] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [socket, setSocket] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('queue_update', (data) => {
      setQueue(data);
    });

    fetchQueue();

    return () => newSocket.disconnect();
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await axios.get(`${API_URL}/tickets/queue`);
      setQueue(response.data);
    } catch (error) {
      console.error('Erro ao buscar fila:', error);
    }
  };

  const callNextTicket = async () => {
    try {
      const response = await axios.post(`${API_URL}/tickets/call`, {
        attendantId: 'attendant_001',
      });

      const ticket = response.data.ticket === undefined ? response.data : response.data.ticket;
      if (!ticket) {
        setInfoMessage(response.data.message || 'Nenhuma senha na fila');
        return;
      }

      setCurrentTicket(ticket);
      socket.emit('ticket_called', ticket);
      setInfoMessage('');
      fetchQueue();
    } catch (error) {
      if (error.response && error.response.data) {
        setInfoMessage(
          error.response.data.error || error.response.data.message || 'Erro ao chamar próxima senha'
        );
      } else {
        setInfoMessage('Erro ao chamar próxima senha');
      }
      console.error('Erro ao chamar próxima senha:', error);
    }
  };

  const finishTicket = async () => {
    try {
      await axios.post(`${API_URL}/tickets/${currentTicket._id}/finish`);
      setCurrentTicket(null);
      socket.emit('ticket_finished', currentTicket);
      fetchQueue();
    } catch (error) {
      console.error('Erro ao finalizar atendimento:', error);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>🎫 Painel de Atendimento</h1>
      </header>

      <div className="main-content">
        <div className="current-ticket">
          <h2>Atendimento Atual</h2>
          {infoMessage && !currentTicket && <div className="info-message">{infoMessage}</div>}
          {currentTicket ? (
            <div className="ticket-display">
              <div className="ticket-number">{currentTicket.number}</div>
              <p className="ticket-service">{currentTicket.serviceType}</p>
              <button onClick={finishTicket} className="btn btn-success">
                ✓ Finalizar Atendimento
              </button>
            </div>
          ) : (
            <div className="no-ticket">
              <p>Nenhuma senha sendo atendida</p>
              <button onClick={callNextTicket} className="btn btn-primary btn-large">
                Chamar Próximo
              </button>
            </div>
          )}
        </div>

        <div className="queue-section">
          <h2>Fila de Espera</h2>
          <div className="queue-list">
            {queue.length === 0 ? (
              <p className="empty-message">Nenhuma senha na fila</p>
            ) : (
              queue.map((ticket, index) => (
                <div key={ticket._id} className="queue-item">
                  <span className="position">{index + 1}º</span>
                  <span className="ticket">{ticket.number}</span>
                  <span className="service">{ticket.serviceType}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
