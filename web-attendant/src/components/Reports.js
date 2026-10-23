import React, { useState, useEffect, useCallback } from 'react';
import { api, errorMessage, formatDuration } from '../api';

// Data local no formato AAAA-MM-DD (para os campos de data)
function toInputDate(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 10);
}

const percent = (part, total) => (total ? `${Math.round((part / total) * 100)}%` : '—');

function Reports() {
  const today = toInputDate(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/admin/reports', {
        params: {
          start: new Date(`${startDate}T00:00:00`).toISOString(),
          end: new Date(`${endDate}T23:59:59.999`).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setReport(response.data);
    } catch (err) {
      setError(errorMessage(err, 'Erro ao gerar o relatório'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    generate();
    // Gera o relatório do dia ao abrir a aba; depois só quando clicar em "Gerar"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (event) => {
    event.preventDefault();
    generate();
  };

  const totals = report && report.totals;
  const maxHour = report ? Math.max(1, ...report.peakHours.map((h) => h.generated)) : 1;
  const peak = report && report.peakHours.find((h) => h.generated === maxHour);

  return (
    <div className="admin-page">
      <div className="panel-card">
        <h2>Relatórios</h2>
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
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Gerando…' : 'Gerar relatório'}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </div>

      {totals && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span>Senhas geradas</span>
              <strong>{totals.generated}</strong>
            </div>
            <div className="stat-card is-success">
              <span>Atendidas</span>
              <strong>{totals.attended}</strong>
              <small>{percent(totals.attended, totals.generated)}</small>
            </div>
            <div className="stat-card is-warning">
              <span>Ausentes</span>
              <strong>{totals.absent}</strong>
              <small>{percent(totals.absent, totals.generated)}</small>
            </div>
            <div className="stat-card">
              <span>Canceladas</span>
              <strong>{totals.cancelled}</strong>
            </div>
            <div className="stat-card">
              <span>Não atendidas</span>
              <strong>{totals.pending}</strong>
            </div>
            <div className="stat-card">
              <span>Espera média</span>
              <strong>{formatDuration(totals.avgWait)}</strong>
            </div>
            <div className="stat-card">
              <span>Atendimento médio</span>
              <strong>{formatDuration(totals.avgService)}</strong>
            </div>
          </div>

          <div className="panel-card">
            <h2>Horários de pico</h2>
            {report.peakHours.length === 0 ? (
              <p className="empty-message">Nenhuma senha no período</p>
            ) : (
              <>
                <p className="report-note">
                  Maior movimento:{' '}
                  <strong>
                    {peak.hour}h às {peak.hour + 1}h
                  </strong>{' '}
                  com {peak.generated} senhas geradas.
                </p>
                <div className="hour-chart">
                  {report.peakHours.map((h) => (
                    <div
                      key={h.hour}
                      className={h.generated === maxHour ? 'hour-bar is-peak' : 'hour-bar'}
                      title={`${h.hour}h: ${h.generated} geradas, ${h.attended} atendidas`}
                    >
                      <span className="hour-value">{h.generated}</span>
                      <div
                        className="hour-fill"
                        style={{ height: `${(h.generated / maxHour) * 100}%` }}
                      />
                      <span className="hour-label">{h.hour}h</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="panel-card">
            <h2>Senhas por fila</h2>
            <div className="table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Geradas</th>
                    <th>Atendidas</th>
                    <th>Ausentes</th>
                    <th>Canceladas</th>
                    <th>Não atendidas</th>
                    <th>Espera média</th>
                    <th>Atendimento médio</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byService.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-message">
                        Nenhuma senha no período
                      </td>
                    </tr>
                  )}
                  {report.byService.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <strong>{s.prefix}</strong> {s.name}
                      </td>
                      <td>{s.generated}</td>
                      <td>{s.attended}</td>
                      <td>{s.absent}</td>
                      <td>{s.cancelled}</td>
                      <td>{s.pending}</td>
                      <td>{formatDuration(s.avgWait)}</td>
                      <td>{formatDuration(s.avgService)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel-card">
            <h2>Senhas por atendente</h2>
            <div className="table-scroll">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Atendente</th>
                    <th>Local</th>
                    <th>Atendidas</th>
                    <th>Ausentes</th>
                    <th>Atendimento médio</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byAttendant.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-message">
                        Nenhum atendimento no período
                      </td>
                    </tr>
                  )}
                  {report.byAttendant.map((a) => (
                    <tr key={a._id}>
                      <td>{a.name}</td>
                      <td>{a.location || '—'}</td>
                      <td>{a.attended}</td>
                      <td>{a.absent}</td>
                      <td>{formatDuration(a.avgService)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;
