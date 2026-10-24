import React, { useState, useEffect, useCallback } from 'react';
import {
  api,
  dayRangeParams,
  errorMessage,
  formatDuration,
  ROLE_LABELS,
  toInputDate,
} from '../api';

const STATUS_LABELS = { attended: 'Atendida', absent: 'Ausente' };

const formatTime = (date) =>
  date
    ? new Date(date).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

// Baixa as linhas como CSV (separado por ";" para abrir direto no Excel em português)
function downloadCsv(filename, header, rows) {
  const escape = (value) =>
    `"${String(value === null || value === undefined ? '' : value).replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Tempos de atendimento por atendente: da chamada da senha até a finalização
function ServiceTimes() {
  const today = toInputDate(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [attendantId, setAttendantId] = useState('');
  const [team, setTeam] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/users/directory')
      .then((response) => setTeam(response.data))
      .catch(() => {});
  }, []);

  const generate = useCallback(
    async (selectedId = attendantId) => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/admin/service-times', {
          params: {
            ...dayRangeParams(startDate, endDate),
            attendantId: selectedId || undefined,
          },
        });
        setReport(response.data);
      } catch (err) {
        setError(errorMessage(err, 'Erro ao gerar o relatório'));
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, attendantId]
  );

  useEffect(() => {
    generate();
    // Gera o relatório do dia ao abrir a aba; depois só ao clicar em "Gerar" ou num atendente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event) => {
    event.preventDefault();
    generate();
  };

  const selectAttendant = (id) => {
    setAttendantId(id);
    generate(id);
  };

  const rows = report ? report.byAttendant : [];
  const totals = rows.reduce(
    (sum, a) => ({
      attended: sum.attended + a.attended,
      absent: sum.absent + a.absent,
      totalService: sum.totalService + a.totalService,
    }),
    { attended: 0, absent: 0, totalService: 0 }
  );
  const selectedName = attendantId && rows[0] ? rows[0].name : '';

  const exportSummary = () =>
    downloadCsv(
      `tempos-atendimento_${startDate}_${endDate}.csv`,
      [
        'Atendente',
        'Local',
        'Atendidas',
        'Ausentes',
        'Tempo total (s)',
        'Média (s)',
        'Mínimo (s)',
        'Máximo (s)',
      ],
      rows.map((a) => [
        a.name,
        a.location,
        a.attended,
        a.absent,
        Math.round(a.totalService),
        a.avgService === null ? '' : Math.round(a.avgService),
        a.minService === null ? '' : Math.round(a.minService),
        a.maxService === null ? '' : Math.round(a.maxService),
      ])
    );

  const exportTickets = () =>
    downloadCsv(
      `atendimentos_${selectedName}_${startDate}_${endDate}.csv`,
      [
        'Senha',
        'Serviço',
        'Situação',
        'Gerada',
        'Chamada',
        'Finalizada',
        'Espera (s)',
        'Atendimento (s)',
      ],
      report.tickets.map((t) => [
        t.number,
        t.serviceType,
        STATUS_LABELS[t.status] || t.status,
        formatTime(t.createdAt),
        formatTime(t.calledAt),
        formatTime(t.attendedAt),
        t.waitSeconds === null ? '' : Math.round(t.waitSeconds),
        t.serviceSeconds === null ? '' : Math.round(t.serviceSeconds),
      ])
    );

  return (
    <div className="admin-page">
      <div className="panel-card">
        <h2>Tempos de atendimento</h2>
        <p className="report-note">
          Tempo de cada atendimento: da chamada da senha até o atendente clicar em “Finalizar
          atendimento”. Considera os atendimentos finalizados no período.
        </p>
        <form className="report-filters" onSubmit={submit}>
          <label>
            Dia início
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label>
            Dia fim
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label>
            Atendente
            <select value={attendantId} onChange={(e) => setAttendantId(e.target.value)}>
              <option value="">Todos</option>
              {team.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} · {ROLE_LABELS[member.role]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Gerando…' : 'Gerar relatório'}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </div>

      {report && (
        <>
          <div className="stat-grid">
            <div className="stat-card is-success">
              <span>Atendimentos</span>
              <strong>{totals.attended}</strong>
            </div>
            <div className="stat-card is-warning">
              <span>Ausentes</span>
              <strong>{totals.absent}</strong>
            </div>
            <div className="stat-card">
              <span>Tempo total</span>
              <strong>{formatDuration(totals.totalService)}</strong>
            </div>
            <div className="stat-card">
              <span>Média por atendimento</span>
              <strong>
                {formatDuration(totals.attended ? totals.totalService / totals.attended : null)}
              </strong>
            </div>
          </div>

          <div className="panel-card">
            <div className="card-header">
              <h2>Por atendente</h2>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={exportSummary}
                disabled={rows.length === 0}
              >
                Exportar CSV
              </button>
            </div>
            {!attendantId && rows.length > 0 && (
              <p className="report-note">Clique num atendente para ver cada atendimento.</p>
            )}
            <div className="table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Atendente</th>
                    <th>Local</th>
                    <th>Atendidas</th>
                    <th>Ausentes</th>
                    <th>Tempo total</th>
                    <th>Média</th>
                    <th>Mais rápido</th>
                    <th>Mais longo</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-message">
                        Nenhum atendimento no período
                      </td>
                    </tr>
                  )}
                  {rows.map((a) => (
                    <tr
                      key={a._id}
                      className={attendantId ? '' : 'is-clickable'}
                      onClick={attendantId ? undefined : () => selectAttendant(a._id)}
                    >
                      <td>
                        <strong>{a.name}</strong>
                        {a.role && <small> · {ROLE_LABELS[a.role]}</small>}
                      </td>
                      <td>{a.location || '—'}</td>
                      <td>{a.attended}</td>
                      <td>{a.absent}</td>
                      <td>{formatDuration(a.totalService)}</td>
                      <td>{formatDuration(a.avgService)}</td>
                      <td>{formatDuration(a.minService)}</td>
                      <td>{formatDuration(a.maxService)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {report.tickets && (
            <div className="panel-card">
              <div className="card-header">
                <h2>Atendimentos{selectedName && ` de ${selectedName}`}</h2>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={exportTickets}
                    disabled={report.tickets.length === 0}
                  >
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    className="btn btn-link btn-small"
                    onClick={() => selectAttendant('')}
                  >
                    Ver todos os atendentes
                  </button>
                </div>
              </div>
              {report.truncated && (
                <p className="report-note">
                  Mostrando os {report.tickets.length} atendimentos mais recentes. Reduza o período
                  para ver todos.
                </p>
              )}
              <div className="table-scroll">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Senha</th>
                      <th>Serviço</th>
                      <th>Situação</th>
                      <th>Chamada</th>
                      <th>Finalizada</th>
                      <th>Espera</th>
                      <th>Atendimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.tickets.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-message">
                          Nenhum atendimento no período
                        </td>
                      </tr>
                    )}
                    {report.tickets.map((t) => (
                      <tr key={t._id}>
                        <td>
                          <strong>{t.number}</strong>
                        </td>
                        <td>{t.serviceType}</td>
                        <td>{STATUS_LABELS[t.status] || t.status}</td>
                        <td>{formatTime(t.calledAt)}</td>
                        <td>{formatTime(t.attendedAt)}</td>
                        <td>{formatDuration(t.waitSeconds)}</td>
                        <td>{formatDuration(t.serviceSeconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ServiceTimes;
