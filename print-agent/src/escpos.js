// Geração de comandos ESC/POS para impressoras térmicas Epson (TM-T20X, 80mm)

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  init: [ESC, 0x40],
  codePagePortuguese: [ESC, 0x74, 3], // PC860 (Português)
  alignLeft: [ESC, 0x61, 0],
  alignCenter: [ESC, 0x61, 1],
  boldOn: [ESC, 0x45, 1],
  boldOff: [ESC, 0x45, 0],
  sizeNormal: [GS, 0x21, 0x00],
  sizeDouble: [GS, 0x21, 0x11],
  sizeHuge: [GS, 0x21, 0x55], // 6x largura, 6x altura
  feedAndCut: [GS, 0x56, 66, 3], // avança 3 linhas e corta parcialmente
};

// Mapeamento Unicode -> code page PC860 para os caracteres acentuados do português
const CP860 = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ã: 0x84, à: 0x85, Á: 0x86, ç: 0x87,
  ê: 0x88, Ê: 0x89, è: 0x8a, Í: 0x8b, Ô: 0x8c, ì: 0x8d, Ã: 0x8e, Â: 0x8f,
  É: 0x90, À: 0x91, È: 0x92, ô: 0x93, õ: 0x94, ò: 0x95, Ú: 0x96, ù: 0x97,
  Ì: 0x98, Õ: 0x99, Ü: 0x9a, Ó: 0x9f, á: 0xa0, í: 0xa1, ó: 0xa2, ú: 0xa3,
  ñ: 0xa4, Ñ: 0xa5, ª: 0xa6, º: 0xa7,
};

function encode(text) {
  const bytes = [];
  for (const char of String(text)) {
    const code = char.charCodeAt(0);
    if (code < 0x80) {
      bytes.push(code);
    } else if (CP860[char] !== undefined) {
      bytes.push(CP860[char]);
    } else {
      // Remove acentos não suportados; se não sobrar nada imprimível, usa '?'
      const plain = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
      bytes.push(plain && plain.charCodeAt(0) < 0x80 ? plain.charCodeAt(0) : 0x3f);
    }
  }
  return bytes;
}

function formatDate(date) {
  const d = date ? new Date(date) : new Date();
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Monta o papel da senha
function buildTicket(ticket, { header, footer } = {}) {
  const bytes = [];
  const add = (...parts) => parts.forEach((p) => bytes.push(...p));
  const line = (text) => add(encode(text), [LF]);

  add(CMD.init, CMD.codePagePortuguese, CMD.alignCenter);

  if (header) {
    add(CMD.boldOn, CMD.sizeDouble);
    line(header);
    add(CMD.sizeNormal, CMD.boldOff);
  }
  line('------------------------------------------------');

  add(CMD.sizeDouble);
  line(ticket.serviceType || '');
  add(CMD.sizeNormal, [LF]);

  line('SUA SENHA');
  add(CMD.boldOn, CMD.sizeHuge);
  line(ticket.number);
  add(CMD.sizeNormal, CMD.boldOff, [LF]);

  if (ticket.position) {
    line(`Posição na fila: ${ticket.position}`);
  }
  line(formatDate(ticket.createdAt));
  line('------------------------------------------------');

  if (footer) {
    line(footer);
  }

  add(CMD.feedAndCut);
  return Buffer.from(bytes);
}

module.exports = { buildTicket };
