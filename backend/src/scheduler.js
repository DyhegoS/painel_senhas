const { startNewDay } = require('./controllers/adminController');
const { getQueue } = require('./controllers/ticketController');
const { DEFAULT_TIMEZONE } = require('./time');

// Confere a virada do dia a cada minuto em vez de agendar um único disparo à meia-noite:
// continua certo se o computador hibernar, se o relógio for ajustado ou se o servidor
// estiver desligado à meia-noite (nesse caso o reinício acontece ao ligar).
const CHECK_INTERVAL_MS = 60 * 1000;

function scheduleDailyReset(io) {
  if (process.env.AUTO_RESET === 'false') {
    console.log('ℹ Reinício automático das filas à meia-noite desativado (AUTO_RESET=false)');
    return null;
  }

  let running = false;
  const check = async () => {
    if (running) return;
    running = true;
    try {
      const { cancelled, servicesReset } = await startNewDay();
      if (cancelled > 0 || servicesReset > 0) {
        console.log(
          `🌙 Novo dia: ${cancelled} senha(s) pendente(s) cancelada(s), ` +
            `numeração reiniciada em ${servicesReset} serviço(s)`
        );
        if (io) {
          io.emit('queue_update', await getQueue());
          // Painéis da TV limpam a senha atual e as últimas chamadas do dia anterior
          io.emit('new_day');
        }
      }
    } catch (error) {
      console.error('✗ Erro no reinício automático das filas:', error.message);
    } finally {
      running = false;
    }
  };

  console.log(`🌙 Filas e numeração reiniciam automaticamente à meia-noite (${DEFAULT_TIMEZONE})`);
  check();
  const timer = setInterval(check, CHECK_INTERVAL_MS);
  timer.unref();
  return timer;
}

module.exports = { scheduleDailyReset };
