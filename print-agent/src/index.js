// Agente de impressão: roda no Raspberry Pi ligado à impressora térmica do totem.
// Conecta ao backend via WebSocket e imprime cada senha gerada.

const fs = require('fs');
const { io } = require('socket.io-client');
const { buildTicket } = require('./escpos');

const BACKEND_URL = process.env.BACKEND_URL;
const PRINTER_DEVICE = process.env.PRINTER_DEVICE || '/dev/usb/lp0';
const PRINT_HEADER = process.env.PRINT_HEADER || 'PAINEL DE SENHAS';
const PRINT_FOOTER = process.env.PRINT_FOOTER || 'Aguarde ser chamado no painel';
// Deve ser igual ao PRINT_AGENT_TOKEN do .env do backend
const PRINT_AGENT_TOKEN = process.env.PRINT_AGENT_TOKEN || '';

async function printTicket(ticket) {
  const data = buildTicket(ticket, { header: PRINT_HEADER, footer: PRINT_FOOTER });
  await fs.promises.writeFile(PRINTER_DEVICE, data);
}

// `npm run test-print`: imprime uma senha de exemplo sem precisar do backend
if (process.argv.includes('--test')) {
  printTicket({ number: 'A-001', serviceType: 'Teste de Impressão', position: 1 })
    .then(() => console.log(`✓ Impressão de teste enviada para ${PRINTER_DEVICE}`))
    .catch((error) => {
      console.error(`✗ Erro ao imprimir em ${PRINTER_DEVICE}:`, error.message);
      process.exit(1);
    });
  return;
}

if (!BACKEND_URL) {
  console.error('✗ Defina BACKEND_URL (ex.: http://192.168.0.10:5000) no painel-print.service');
  process.exit(1);
}

const socket = io(BACKEND_URL, { reconnectionDelayMax: 10000 });

socket.on('connect', () => {
  socket.emit('identify', { type: 'printer', printerToken: PRINT_AGENT_TOKEN });
  console.log(`✓ Conectado ao backend ${BACKEND_URL}`);
});

socket.on('disconnect', (reason) => {
  console.log('✗ Desconectado do backend:', reason);
});

socket.on('connect_error', (error) => {
  console.error('✗ Erro ao conectar no backend:', error.message);
});

socket.on('print_ticket', async (ticket, ack) => {
  try {
    await printTicket(ticket);
    console.log('🖨️  Senha impressa:', ticket.number);
    if (ack) ack({ ok: true });
  } catch (error) {
    console.error(`✗ Erro ao imprimir ${ticket.number}:`, error.message);
    if (ack) ack({ ok: false, error: error.message });
  }
});
