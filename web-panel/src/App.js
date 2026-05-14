import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SOCKET_URL = 'http://localhost:5000';

function App() {
  const [calledTickets, setCalledTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [nextTickets, setNextTickets] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('ticket_called', (ticket) => {
      setCurrentTicket(ticket);
      addToCalledTickets(ticket);
    });

    socket.on('queue_update', (queue) => {
      setNextTickets(queue.slice(0, 5));
    });

    return () => socket.disconnect();
  }, []);

  const addToCalledTickets = (ticket) => {
    setCalledTickets((prev) => [ticket, ...prev.slice(0, 4)]);
  };

  return (
    <div className="panel">
      <div className="current-section">
        <div className="label">ATENDENDO</div>
        <div className="current-ticket">
          {currentTicket ? (
            <>
              <div className="ticket-number">{currentTicket.number}</div>
              <div className="ticket-service">{currentTicket.serviceType}</div>
              <div className="counter">Guichê 1</div>
            </>
          ) : (
            <div className="empty">Aguardando...</div>
          )}
        </div>
      </div>

      <div className="next-section">
        <div className="label">PRÓXIMAS SENHAS</div>
        <div className="next-tickets">
          {nextTickets.map((ticket, index) => (
            <div key={ticket._id} className="next-item">
              <span className="position">{index + 1}º</span>
              <span className="number">{ticket.number}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="history-section">
        <div className="label">CHAMADAS RECENTES</div>
        <div className="history">
          {calledTickets.map((ticket, index) => (
            <div key={`${ticket._id}-${index}`} className="history-item">
              {ticket.number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
