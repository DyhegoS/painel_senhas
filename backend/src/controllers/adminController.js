const mongoose = require('mongoose');
const ServiceType = require('../models/ServiceType');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

const DEFAULT_TIMEZONE = process.env.REPORT_TIMEZONE || 'America/Sao_Paulo';
const PENDING_STATUSES = ['waiting', 'called'];

function validTimezone(timezone) {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return timezone;
  } catch (error) {
    return DEFAULT_TIMEZONE;
  }
}

function parseDate(value, name) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`Data ${name} inválida`);
  }
  return date;
}

// Média em segundos entre dois campos de data, ignorando senhas sem os dois
const avgSeconds = (from, to) => ({
  $avg: {
    $cond: [
      { $and: [`$${from}`, `$${to}`] },
      { $divide: [{ $subtract: [`$${to}`, `$${from}`] }, 1000] },
      null,
    ],
  },
});

const countStatus = (status) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } });

// Relatório do período: totais, horários de pico, por fila e por atendente
async function getReport({ start, end, timezone }) {
  const from = parseDate(start, 'inicial');
  const to = parseDate(end, 'final');
  if (from > to) {
    throw new Error('A data inicial deve ser anterior à data final');
  }
  const tz = validTimezone(timezone || DEFAULT_TIMEZONE);
  const match = { $match: { createdAt: { $gte: from, $lte: to } } };

  const [totals, peakHours, byService, byAttendant] = await Promise.all([
    Ticket.aggregate([
      match,
      {
        $group: {
          _id: null,
          generated: { $sum: 1 },
          attended: countStatus('attended'),
          absent: countStatus('absent'),
          cancelled: countStatus('cancelled'),
          pending: { $sum: { $cond: [{ $in: ['$status', PENDING_STATUSES] }, 1, 0] } },
          avgWait: avgSeconds('createdAt', 'calledAt'),
          avgService: avgSeconds('calledAt', 'attendedAt'),
        },
      },
    ]),
    Ticket.aggregate([
      match,
      {
        $group: {
          _id: { $hour: { date: '$createdAt', timezone: tz } },
          generated: { $sum: 1 },
          attended: countStatus('attended'),
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Ticket.aggregate([
      match,
      {
        $group: {
          _id: '$serviceType',
          generated: { $sum: 1 },
          attended: countStatus('attended'),
          absent: countStatus('absent'),
          cancelled: countStatus('cancelled'),
          pending: { $sum: { $cond: [{ $in: ['$status', PENDING_STATUSES] }, 1, 0] } },
          avgWait: avgSeconds('createdAt', 'calledAt'),
          avgService: avgSeconds('calledAt', 'attendedAt'),
        },
      },
    ]),
    Ticket.aggregate([
      match,
      { $match: { attendant: { $ne: null }, status: { $in: ['attended', 'absent'] } } },
      {
        $group: {
          _id: '$attendant',
          attended: countStatus('attended'),
          absent: countStatus('absent'),
          avgService: avgSeconds('calledAt', 'attendedAt'),
        },
      },
      { $sort: { attended: -1 } },
    ]),
  ]);

  const services = await ServiceType.find({ _id: { $in: byService.map((s) => s._id) } });
  const serviceById = new Map(services.map((s) => [String(s._id), s]));

  const attendantIds = byAttendant
    .map((a) => a._id)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  const users = await User.find({ _id: { $in: attendantIds } });
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return {
    start: from,
    end: to,
    timezone: tz,
    totals: totals[0] || {
      generated: 0,
      attended: 0,
      absent: 0,
      cancelled: 0,
      pending: 0,
      avgWait: null,
      avgService: null,
    },
    peakHours: peakHours.map((h) => ({
      hour: h._id,
      generated: h.generated,
      attended: h.attended,
    })),
    byService: byService
      .map((s) => {
        const service = serviceById.get(String(s._id));
        return {
          ...s,
          _id: s._id,
          name: service ? service.name : 'Serviço removido',
          prefix: service ? service.prefix : '',
        };
      })
      .sort((a, b) => b.generated - a.generated),
    byAttendant: byAttendant.map((a) => {
      const user = userById.get(String(a._id));
      return {
        ...a,
        name: user ? user.name : a._id,
        location: user && user.locationNumber ? `${user.locationType} ${user.locationNumber}` : '',
      };
    }),
  };
}

// Cancela as senhas aguardando (e em chamada) e, se pedido, reinicia a numeração em 001
async function resetQueues({ serviceTypeId, resetNumbering }) {
  const filter = { status: { $in: PENDING_STATUSES } };
  const serviceFilter = {};
  if (serviceTypeId) {
    const service = await ServiceType.findById(serviceTypeId);
    if (!service) {
      throw new Error('Tipo de serviço não encontrado');
    }
    filter.serviceType = serviceTypeId;
    serviceFilter._id = serviceTypeId;
  }

  const result = await Ticket.updateMany(filter, { status: 'cancelled' });
  if (resetNumbering) {
    await ServiceType.updateMany(serviceFilter, { counterResetAt: new Date() });
  }
  return { cancelled: result.modifiedCount, resetNumbering: Boolean(resetNumbering) };
}

// Estado geral: servidor, banco, dispositivos conectados e movimento do dia
async function getStatus({ clients, startedAt }) {
  const dbStates = ['desconectado', 'conectado', 'conectando', 'desconectando'];
  const dbState = mongoose.connection.readyState;

  let dbLatencyMs = null;
  if (dbState === 1) {
    const pingStart = Date.now();
    await mongoose.connection.db.admin().ping();
    dbLatencyMs = Date.now() - pingStart;
  }

  const connections = {
    attendant: 0,
    acionador: 0,
    panel: 0,
    totem: 0,
    customer: 0,
    printer: 0,
    unknown: 0,
  };
  clients.forEach((client) => {
    connections[client.type in connections ? client.type : 'unknown'] += 1;
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [generatedToday, attendedToday, waiting, lastTicket] =
    dbState === 1
      ? await Promise.all([
          Ticket.countDocuments({ createdAt: { $gte: todayStart } }),
          Ticket.countDocuments({ attendedAt: { $gte: todayStart } }),
          Ticket.countDocuments({ status: 'waiting' }),
          Ticket.findOne().sort({ createdAt: -1 }).select('number createdAt'),
        ])
      : [null, null, null, null];

  const memory = process.memoryUsage();
  return {
    server: {
      startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      memoryMb: Math.round(memory.rss / 1024 / 1024),
      environment: process.env.NODE_ENV || 'development',
    },
    database: {
      state: dbStates[dbState] || 'desconhecido',
      ok: dbState === 1,
      latencyMs: dbLatencyMs,
    },
    connections,
    tickets: { generatedToday, attendedToday, waiting, lastTicket },
  };
}

// Conexões em tempo real (socket) com o usuário identificado, quando houver
function getConnections(clients) {
  return Array.from(clients.values())
    .map((client) => ({
      id: client.id,
      type: client.type,
      ip: client.ip,
      connectedAt: client.connectedAt,
      user: client.user,
    }))
    .sort((a, b) => new Date(a.connectedAt) - new Date(b.connectedAt));
}

module.exports = { getReport, resetQueues, getStatus, getConnections };
