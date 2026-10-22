import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || `http://${window.location.hostname}:5000`;
const COUNTER_NUMBER = '1';
const AUDIO_BASE = `${process.env.PUBLIC_URL}/audio`;
const PLACE_NAME = process.env.REACT_APP_PLACE_NAME || 'Sala de Espera';
const LOGO_URL = process.env.REACT_APP_LOGO_URL || '';
const HIGHLIGHT_DURATION_MS = 8000;

// Local informado pelo usuário que chamou a senha (padrão: Guichê do painel)
const locationOf = (ticket) => ({
  type: ticket.locationType || 'Guichê',
  number: ticket.locationNumber || COUNTER_NUMBER,
});

function App() {
  const [calledTickets, setCalledTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [nextTickets, setNextTickets] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [callKey, setCallKey] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const highlightTimerRef = useRef(null);
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
      ...locationOf(ticket)
        .number.split('')
        .map((digit) => `${AUDIO_BASE}/numeros/${digit}.mp3`),
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
        setAudioMessage(
          `Não foi possível carregar o áudio ${decodeURIComponent(path.split('/').pop())}.`
        );
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
    setCalledTickets((prev) => [ticket, ...prev.slice(0, 5)]);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('ticket_called', (ticket) => {
      setCurrentTicket(ticket);
      addToCalledTickets(ticket);
      setCallKey((key) => key + 1);
      setIsHighlighted(true);
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(
        () => setIsHighlighted(false),
        HIGHLIGHT_DURATION_MS
      );
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(announcementTimerRef.current);
      window.clearTimeout(highlightTimerRef.current);
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

  const recentTickets = calledTickets.slice(1);
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <div className="panel">
      <header className="panel-header">
        <div className="brand">
          {LOGO_URL && !logoFailed && (
            <img className="brand-logo" src={LOGO_URL} alt="" onError={() => setLogoFailed(true)} />
          )}
          <span className="brand-name">{PLACE_NAME}</span>
        </div>
        <div className="clock">
          <span className="clock-time">{time}</span>
          <span className="clock-date">{date}</span>
        </div>
      </header>

      <main className={`current-section${isHighlighted ? ' is-calling' : ''}`}>
        <div className="audio-control">
          <button type="button" onClick={enableAudio} className={audioEnabled ? 'is-on' : ''}>
            {audioEnabled ? 'Som e voz ativados' : 'Ativar som e voz'}
          </button>
          {audioMessage && <span role="status">{audioMessage}</span>}
        </div>
        {currentTicket ? (
          <div key={callKey} className="current-ticket">
            <div className="label">Senha</div>
            <div className="ticket-number">{currentTicket.number}</div>
            {currentTicket.serviceType && (
              <div className="ticket-service">{currentTicket.serviceType}</div>
            )}
            <div className="counter">
              {locationOf(currentTicket).type} <strong>{locationOf(currentTicket).number}</strong>
            </div>
          </div>
        ) : (
          <div className="current-ticket">
            <div className="empty">Aguardando chamada…</div>
          </div>
        )}
      </main>

      <aside className="history-section">
        <div className="label">Últimas chamadas</div>
        <ol className="history">
          {recentTickets.length === 0 && <li className="history-empty">Nenhuma chamada ainda</li>}
          {recentTickets.map((ticket, index) => (
            <li key={`${ticket._id}-${index}`} className="history-item">
              <span className="number">{ticket.number}</span>
              <span className="counter">
                {locationOf(ticket).type} {locationOf(ticket).number}
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <footer className="next-section">
        <div className="label">Próximas</div>
        <div className="next-tickets">
          {nextTickets.length === 0 ? (
            <span className="next-empty">Sem senhas na fila</span>
          ) : (
            nextTickets.map((ticket) => (
              <span key={ticket._id} className="next-item">
                {ticket.number}
              </span>
            ))
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
