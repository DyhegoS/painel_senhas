// Datas no fuso do local de atendimento (o servidor pode estar em UTC)
const DEFAULT_TIMEZONE = process.env.REPORT_TIMEZONE || 'America/Sao_Paulo';

function validTimezone(timezone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return timezone;
  } catch (error) {
    return DEFAULT_TIMEZONE;
  }
}

// Meia-noite do dia de `now` no fuso informado (o servidor pode estar em UTC)
function startOfToday(timezone = DEFAULT_TIMEZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: validTimezone(timezone),
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const elapsedMs = ((get('hour') * 60 + get('minute')) * 60 + get('second')) * 1000;
  return new Date(now.getTime() - elapsedMs - now.getMilliseconds());
}

// Próxima meia-noite no fuso informado (26 h depois do início do dia já é o dia seguinte,
// mesmo em dias de 23 ou 25 h por horário de verão)
function nextMidnight(timezone = DEFAULT_TIMEZONE, now = new Date()) {
  const today = startOfToday(timezone, now);
  return startOfToday(timezone, new Date(today.getTime() + 26 * 60 * 60 * 1000));
}

module.exports = { DEFAULT_TIMEZONE, validTimezone, startOfToday, nextMidnight };
