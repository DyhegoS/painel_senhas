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

// Meia-noite de hoje no fuso informado (o servidor pode estar em UTC)
function startOfToday(timezone) {
  const now = new Date();
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

module.exports = { DEFAULT_TIMEZONE, validTimezone, startOfToday };
