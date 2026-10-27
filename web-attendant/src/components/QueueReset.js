import React, { useState, useEffect, useCallback } from 'react';
import { api, errorMessage } from '../api';

function QueueReset() {
  const [summary, setSummary] = useState([]);
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [resetNumbering, setResetNumbering] = useState(true);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await api.get('/tickets/queue/summary');
      setSummary(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Erro ao carregar as filas') });
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const totalWaiting = summary.reduce((sum, s) => sum + s.waiting, 0);
  const target = summary.find((s) => s._id === serviceTypeId);
  const targetLabel = target ? `a fila ${target.name}` : 'todas as filas';

  const reset = async () => {
    const numberingText = resetNumbering ? ' e reiniciar a numeração em 001' : '';
    if (
      !window.confirm(
        `Zerar ${targetLabel}${numberingText}? As senhas aguardando serão canceladas.`
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await api.post('/admin/queues/reset', {
        serviceTypeId: serviceTypeId || undefined,
        resetNumbering,
      });
      const { cancelled } = response.data;
      setMessage({
        type: 'success',
        text: `Filas zeradas: ${cancelled} senha(s) cancelada(s)${
          resetNumbering ? ', numeração reiniciada' : ''
        }.`,
      });
      fetchSummary();
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage(error, 'Erro ao zerar as filas') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="panel-card">
        <h2>Zerar filas</h2>
        <p className="report-note">
          Cancela as senhas que ainda estão aguardando ou em chamada. Use, por exemplo, no fim do
          expediente. As senhas canceladas continuam aparecendo nos relatórios. Todo dia à
          meia-noite o sistema faz isso automaticamente e reinicia a numeração em 001.
        </p>

        <div className="user-form reset-form">
          <label>
            Fila
            <select value={serviceTypeId} onChange={(e) => setServiceTypeId(e.target.value)}>
              <option value="">Todas as filas ({totalWaiting} aguardando)</option>
              {summary.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.prefix} · {s.name} ({s.waiting} aguardando)
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={resetNumbering}
              onChange={(e) => setResetNumbering(e.target.checked)}
            />
            Reiniciar a numeração (a próxima senha volta para 001)
          </label>
          <button className="btn btn-danger" onClick={reset} disabled={busy}>
            {busy ? 'Zerando…' : `Zerar ${targetLabel}`}
          </button>
          {message && (
            <p className={message.type === 'error' ? 'form-error' : 'form-success'}>
              {message.text}
            </p>
          )}
        </div>
      </div>

      <div className="panel-card">
        <h2>Situação atual</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Fila</th>
              <th>Aguardando</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s._id}>
                <td>
                  <strong>{s.prefix}</strong> {s.name}
                </td>
                <td>{s.waiting}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default QueueReset;
