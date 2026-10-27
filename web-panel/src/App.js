import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

// Em produção o nginx serve o painel e encaminha /api e /socket.io para o backend
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === 'production'
    ? window.location.origin
    : `http://${window.location.hostname}:5000`);
const COUNTER_NUMBER = '1';
const AUDIO_BASE = `${process.env.PUBLIC_URL}/audio`;
const PLACE_NAME = process.env.REACT_APP_PLACE_NAME || 'Sala de Espera';
const LOGO_URL = process.env.REACT_APP_LOGO_URL || '';
// Fuso do relógio; sem configuração, usa o do computador
const TIMEZONE = process.env.REACT_APP_TIMEZONE || undefined;
const HIGHLIGHT_DURATION_MS = 8000;
// Senha atual + 5 no histórico
const CALLS_SHOWN = 6;
const CLOCK_SYNC_INTERVAL_MS = 10 * 60 * 1000;

// Local informado pelo usuário que chamou a senha (padrão: Guichê do painel)
const locationOf = (ticket) => ({
  type: ticket.locationType || 'Guichê',
  number: ticket.locationNumber || COUNTER_NUMBER,
});

const getJson = (path) =>
  fetch(`${SOCKET_URL}/api${path}`).then((response) =>
    response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))
  );

function App() {
  const [calledTickets, setCalledTickets] = useState([]);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [nextTickets, setNextTickets] = useState([]);
  // O navegador só bloqueia o som até a primeira interação (ou nunca, se configurado)
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioMessage, setAudioMessage] = useState('');
  const [clockOffset, setClockOffset] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [callKey, setCallKey] = useState(0);
  const [logoFailed, setLogoFailed] = useState(false);
  const highlightTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const announcementTimerRef = useRef(null);
  const liveCallsRef = useRef(0);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      const context = new AudioContextClass();
      // O aviso de som bloqueado acompanha o estado real do áudio
      context.onstatechange = () => setAudioBlocked(context.state === 'suspended');
      audioContextRef.current = context;
    }
    return audioContextRef.current;
  }, []);

  // Tenta liberar o áudio; o navegador só deixa sem interação se o autoplay estiver permitido
  const unlockAudio = useCallback(() => {
    const context = getAudioContext();
    if (!context) {
      setAudioMessage('Este navegador não oferece suporte ao som.');
      return;
    }
    if (context.state === 'running') {
      setAudioBlocked(false);
      return;
    }
    // Sem permissão, o resume() do Chrome fica pendente sem rejeitar: confere o estado depois
    context.resume().catch(() => {});
    window.setTimeout(() => setAudioBlocked(context.state === 'suspended'), 500);
  }, [getAudioContext]);

  const playBeep = useCallback(() => {
    const context = getAudioContext();
    if (!context) return;

    try {
      if (context.state !== 'running') {
        context.resume().catch(() => setAudioBlocked(true));
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
  }, [getAudioContext]);

  const playTicketAudio = useCallback((ticket) => {
    const [prefix, digits] = String(ticket.number).split('-');
    const location = locationOf(ticket);
    const audioPaths = [
      `${AUDIO_BASE}/senha.mp3`,
      ...prefix
        .toUpperCase()
        .split('')
        .map((letter) => `${AUDIO_BASE}/letras/${letter.toLowerCase()}.mp3`),
      ...(digits || '').split('').map((digit) => `${AUDIO_BASE}/numeros/${digit}.mp3`),
      location.type === 'Consultório'
        ? `${AUDIO_BASE}/consultorio.mp3`
        : `${AUDIO_BASE}/dirigir%20se.mp3`,
      ...String(location.number)
        .split('')
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
        if (error.name === 'NotAllowedError') {
          setAudioBlocked(true);
          return;
        }
        console.error('Erro ao reproduzir o áudio da chamada:', error);
        setAudioMessage('Não foi possível reproduzir o áudio da chamada.');
      });
    };

    setAudioMessage('');
    playNext();
  }, []);

  // Som sempre ativo: tenta liberar ao abrir e em qualquer toque, clique ou tecla
  // (inclusive do controle remoto da TV), sem precisar de botão
  useEffect(() => {
    unlockAudio();
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, unlockAudio, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, unlockAudio));
  }, [unlockAudio]);

  // Novas chamadas vão para o topo; uma rechamada sai da posição antiga (como no servidor)
  const addToCalledTickets = useCallback((ticket) => {
    setCalledTickets((prev) =>
      [ticket, ...prev.filter((t) => t._id !== ticket._id)].slice(0, CALLS_SHOWN)
    );
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('connect', () => socket.emit('identify', { type: 'panel' }));

    socket.on('ticket_called', (ticket) => {
      liveCallsRef.current += 1;
      setCurrentTicket(ticket);
      addToCalledTickets(ticket);
      setCallKey((key) => key + 1);
      setIsHighlighted(true);
      window.clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = window.setTimeout(
        () => setIsHighlighted(false),
        HIGHLIGHT_DURATION_MS
      );
      playBeep();
      window.clearTimeout(announcementTimerRef.current);
      announcementTimerRef.current = window.setTimeout(() => playTicketAudio(ticket), 300);
    });

    // A fila inclui senhas já chamadas; "Próximas" mostra só quem ainda aguarda
    const showQueue = (queue) => {
      setNextTickets(queue.filter((ticket) => ticket.status === 'waiting').slice(0, 5));
    };
    socket.on('queue_update', showQueue);

    // Ao abrir ou reconectar, restaura a tela a partir do servidor: assim todos os painéis
    // mostram o mesmo, mesmo depois de recarregar ou de uma queda de rede (sem tocar áudio)
    const loadRecentCalls = () => {
      const liveCallsAtStart = liveCallsRef.current;
      getJson(`/tickets/recent-calls?limit=${CALLS_SHOWN}`)
        .then((calls) => {
          // Chegou uma chamada ao vivo durante a consulta: busca de novo para não perdê-la
          if (liveCallsRef.current !== liveCallsAtStart) {
            loadRecentCalls();
            return;
          }
          setCalledTickets(calls);
          setCurrentTicket(calls[0] || null);
        })
        .catch((error) => console.error('Erro ao carregar as últimas chamadas:', error));
    };

    const loadQueue = () => {
      getJson('/tickets/queue')
        .then(showQueue)
        .catch((error) => console.error('Erro ao carregar a fila:', error));
    };

    socket.on('connect', loadRecentCalls);
    socket.on('connect', loadQueue);

    return () => socket.disconnect();
  }, [addToCalledTickets, playBeep, playTicketAudio]);

  // Relógio pela hora do servidor, para todos os painéis mostrarem a mesma hora
  useEffect(() => {
    const syncClock = () => {
      const sentAt = Date.now();
      getJson('/health')
        .then(({ timestamp }) => {
          const receivedAt = Date.now();
          // Desconta metade do tempo de ida e volta da requisição
          setClockOffset(new Date(timestamp).getTime() - (sentAt + receivedAt) / 2);
        })
        .catch((error) => console.error('Erro ao sincronizar o relógio:', error));
    };
    syncClock();
    const timer = window.setInterval(syncClock, CLOCK_SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date(Date.now() + clockOffset));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [clockOffset]);

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
  const time = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
  const date = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: TIMEZONE,
  });

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
        {(audioBlocked || audioMessage) && (
          <div className="audio-control" role="status">
            {audioBlocked && (
              <span>
                Som bloqueado pelo navegador: toque na tela ou pressione uma tecla para ativar.
              </span>
            )}
            {audioMessage && <span>{audioMessage}</span>}
          </div>
        )}
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
          {recentTickets.map((ticket) => (
            <li key={ticket._id} className="history-item">
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
