import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5000`;
const COUNTER_NUMBER = '1';
const AUDIO_BASE = `${process.env.PUBLIC_URL}/audio`;

function App() {
  const [calledTickets, setCalledTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [nextTickets, setNextTickets] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const audioContextRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const announcementTimerRef = useRef(null);
  const audioEnabledRef = useRef(false);

  const playBeep = useCallback(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setAudioMessage('Este navegador não oferece suporte ao som.');
      return;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const context = audioContextRef.current;
      if (context.state !== 'running') {
        context.resume().catch((error) => {
          console.error('Erro ao ativar o áudio do painel:', error);
          setAudioMessage('Não foi possível ativar o áudio neste navegador.');
        });
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.18, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.25);
    } catch (error) {
      console.error('Erro ao reproduzir o som do painel:', error);
      setAudioMessage('Não foi possível reproduzir o som neste navegador.');
    }
  }, []);

  const playTicketAudio = useCallback((ticket) => {
    const [prefix, digits] = String(ticket.number).split('-');
    const audioPaths = [
      `${AUDIO_BASE}/senha.mp3`,
      ...prefix
        .toUpperCase()
        .split('')
        .map((letter) => `${AUDIO_BASE}/letras/${letter.toLowerCase()}.mp3`),
      ...(digits || '').split('').map((digit) => `${AUDIO_BASE}/numeros/${digit}.mp3`),
      `${AUDIO_BASE}/dirigir%20se.mp3`,
      `${AUDIO_BASE}/numeros/${COUNTER_NUMBER}.mp3`,
    ];
    const player = audioPlayerRef.current || new Audio();
    audioPlayerRef.current = player;
    player.pause();
    player.onended = null;
    player.onerror = null;
    player.currentTime = 0;

    let currentIndex = 0;
    const playNext = () => {
      if (currentIndex >= audioPaths.length) {
        player.onended = null;
        return;
      }

      const path = audioPaths[currentIndex];
      currentIndex += 1;
      player.src = path;
      player.onended = playNext;
      player.onerror = () => {
        player.onended = null;
        console.error('Erro ao carregar o áudio da chamada:', path);
        setAudioMessage(`Não foi possível carregar o áudio ${decodeURIComponent(path.split('/').pop())}.`);
      };
      player.play().catch((error) => {
        player.onended = null;
        console.error('Erro ao reproduzir o áudio da chamada:', error);
        setAudioMessage('Não foi possível reproduzir o áudio da chamada.');
      });
    };

    setAudioMessage('');
    playNext();
  }, []);

  const enableAudio = () => {
    audioEnabledRef.current = true;
    setAudioEnabled(true);
    setAudioMessage('');
    playBeep();
  };

  const addToCalledTickets = useCallback((ticket) => {
    setCalledTickets((prev) => [ticket, ...prev.slice(0, 4)]);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('ticket_called', (ticket) => {
      setCurrentTicket(ticket);
      addToCalledTickets(ticket);
      if (audioEnabledRef.current) {
        playBeep();
        window.clearTimeout(announcementTimerRef.current);
        announcementTimerRef.current = window.setTimeout(() => playTicketAudio(ticket), 300);
      }
    });

    socket.on('queue_update', (queue) => {
      setNextTickets(queue.slice(0, 5));
    });

    return () => socket.disconnect();
  }, [addToCalledTickets, playBeep, playTicketAudio]);

  useEffect(
    () => () => {
      window.clearTimeout(announcementTimerRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((error) => {
          console.error('Erro ao encerrar o áudio do painel:', error);
        });
      }
    },
    []
  );

  return (
    <div className="panel">
      <div className="current-section">
        <div className="label">ATENDENDO</div>
        <div className="audio-control">
          <button type="button" onClick={enableAudio}>
            {audioEnabled ? 'Som e voz ativados' : 'Ativar som e voz'}
          </button>
          {audioMessage && <span role="status">{audioMessage}</span>}
        </div>
        <div className="current-ticket">
          {currentTicket ? (
            <>
              <div className="ticket-number">{currentTicket.number}</div>
              <div className="ticket-service">{currentTicket.serviceType}</div>
              <div className="counter">Guichê {COUNTER_NUMBER}</div>
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
