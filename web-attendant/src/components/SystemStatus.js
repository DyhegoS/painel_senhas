import React, { useState, useEffect, useCallback } from 'react';
import { api, errorMessage, formatDuration } from '../api';

const REFRESH_INTERVAL_MS = 10000;

function StatusItem({ ok, warning, label, value, detail }) {
  const state = ok ? 'is-ok' : warning ? 'is-warning' : 'is-error';
  return (
    <div className={`status-item ${state}`}>
      <span className="status-dot" />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  );
}

function SystemStatus() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await api.get('/admin/status');
      setStatus(response.data);
      setUpdatedAt(new Date());
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Servidor não respondeu'));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const timer = window.setInterval(fetchStatus, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchStatus]);

  const c = status && status.connections;
  const t = status && status.tickets;

  return (
    <div className="admin-page">
      <div className="panel-card">
        <div className="team-header">
          <h2>Status do sistema</h2>
          <span className="team-count">
            {updatedAt && `Atualizado às ${updatedAt.toLocaleTimeString('pt-BR')}`}
          </span>
        </div>

        <div className="status-grid">
          <StatusItem
            ok={Boolean(status) && !error}
            label="Servidor"
            value={status && !error ? 'Online' : 'Sem resposta'}
            detail={
              status &&
              `Ligado há ${formatDuration(status.server.uptimeSeconds)} · Node ${
                status.server.nodeVersion
              } · ${status.server.memoryMb} MB`
            }
          />
          <StatusItem
            ok={status && status.database.ok}
            label="Banco de dados"
            value={status ? status.database.state : '—'}
            detail={status && status.database.ok && `Resposta em ${status.database.latencyMs} ms`}
          />
          <StatusItem
            ok={c && c.panel > 0}
            label="Painel de chamada (TV)"
            value={c ? `${c.panel} conectado(s)` : '—'}
            detail={c && c.panel === 0 && 'Nenhum painel recebendo as chamadas'}
          />
          <StatusItem
            ok={c && c.totem > 0}
            label="Totem"
            value={c ? `${c.totem} conectado(s)` : '—'}
            detail={c && c.totem === 0 && 'Nenhum totem com o app aberto'}
          />
          <StatusItem
            ok={c && c.printer > 0}
            label="Impressora"
            value={c ? `${c.printer} conectada(s)` : '—'}
            detail={c && c.printer === 0 && 'As senhas não estão sendo impressas'}
          />
          <StatusItem
            ok
            label="Atendentes"
            value={c ? `${c.attendant + c.acionador} tela(s) aberta(s)` : '—'}
            detail={c && `${c.acionador} acionador(es) de senha`}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>

      {t && (
        <div className="stat-grid">
          <div className="stat-card">
            <span>Geradas hoje</span>
            <strong>{t.generatedToday}</strong>
          </div>
          <div className="stat-card is-success">
            <span>Atendidas hoje</span>
            <strong>{t.attendedToday}</strong>
          </div>
          <div className="stat-card is-warning">
            <span>Aguardando agora</span>
            <strong>{t.waiting}</strong>
          </div>
          <div className="stat-card">
            <span>Última senha gerada</span>
            <strong>{t.lastTicket ? t.lastTicket.number : '—'}</strong>
            {t.lastTicket && (
              <small>{new Date(t.lastTicket.createdAt).toLocaleString('pt-BR')}</small>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SystemStatus;
