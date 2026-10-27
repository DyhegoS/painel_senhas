const mongoose = require('mongoose');
const ServiceType = require('../models/ServiceType');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { PENDING_STATUSES } = require('./ticketController');
const { badRequest, notFound, assertId } = require('../errors');
const { DEFAULT_TIMEZONE, validTimezone, startOfToday } = require('../time');

function parseDate(value, name) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw badRequest(`Data ${name} inválida`);
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
    throw badRequest('A data inicial deve ser anterior à data final');
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

// Duração do atendimento (chamada → finalização) em segundos; null se não foi finalizada
const serviceSeconds = {
  $cond: [
    { $and: [{ $eq: ['$status', 'attended'] }, '$calledAt', '$attendedAt'] },
    { $divide: [{ $subtract: ['$attendedAt', '$calledAt'] }, 1000] },
    null,
  ],
};

const MAX_DETAIL_TICKETS = 1000;

// Tempos de atendimento por atendente no período (pela data em que o atendimento aconteceu).
// Com attendantId, inclui também a lista de atendimentos daquele atendente.
async function getServiceTimes({ start, end, attendantId }) {
  const from = parseDate(start, 'inicial');
  const to = parseDate(end, 'final');
  if (from > to) {
    throw badRequest('A data inicial deve ser anterior à data final');
  }

  const match = {
    attendant: attendantId ? String(attendantId) : { $ne: null },
    $or: [
      { status: 'attended', attendedAt: { $gte: from, $lte: to } },
      { status: 'absent', calledAt: { $gte: from, $lte: to } },
    ],
  };

  const byAttendant = await Ticket.aggregate([
    { $match: match },
    { $addFields: { serviceSeconds } },
    {
      $group: {
        _id: '$attendant',
        attended: countStatus('attended'),
        absent: countStatus('absent'),
        totalService: { $sum: '$serviceSeconds' },
        avgService: { $avg: '$serviceSeconds' },
        minService: { $min: '$serviceSeconds' },
        maxService: { $max: '$serviceSeconds' },
        firstCall: { $min: '$calledAt' },
        lastFinish: { $max: '$attendedAt' },
      },
    },
    { $sort: { totalService: -1 } },
  ]);

  const ids = byAttendant.map((a) => a._id).filter((id) => mongoose.isValidObjectId(id));
  const users = await User.find({ _id: { $in: ids } });
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const result = {
    start: from,
    end: to,
    byAttendant: byAttendant.map((a) => {
      const user = userById.get(String(a._id));
      return {
        ...a,
        name: user ? user.name : a._id,
        role: user ? user.role : null,
        location: user && user.locationNumber ? `${user.locationType} ${user.locationNumber}` : '',
      };
    }),
  };

  if (attendantId) {
    const tickets = await Ticket.find(match)
      .populate('serviceType')
      .sort({ calledAt: -1 })
      .limit(MAX_DETAIL_TICKETS);
    result.tickets = tickets.map((t) => ({
      _id: t._id,
      number: t.number,
      serviceType: t.serviceType ? t.serviceType.name : 'Serviço removido',
      status: t.status,
      createdAt: t.createdAt,
      calledAt: t.calledAt,
      attendedAt: t.attendedAt,
      waitSeconds: t.calledAt ? (t.calledAt - t.createdAt) / 1000 : null,
      serviceSeconds:
        t.status === 'attended' && t.calledAt && t.attendedAt
          ? (t.attendedAt - t.calledAt) / 1000
          : null,
    }));
    result.truncated = tickets.length === MAX_DETAIL_TICKETS;
  }

  return result;
}

// Cancela as senhas aguardando (e em chamada) e, se pedido, reinicia a numeração em 001
async function resetQueues({ serviceTypeId, resetNumbering }) {
  const filter = { status: { $in: PENDING_STATUSES } };
  const serviceFilter = {};
  if (serviceTypeId) {
    assertId(serviceTypeId, 'Tipo de serviço não encontrado');
    const service = await ServiceType.findById(serviceTypeId);
    if (!service) {
      throw notFound('Tipo de serviço não encontrado');
    }
    filter.serviceType = serviceTypeId;
    serviceFilter._id = serviceTypeId;
  }

  const result = await Ticket.updateMany(filter, { status: 'cancelled' });
  if (resetNumbering) {
    await ServiceType.updateMany(serviceFilter, { counter: 0, counterResetAt: new Date() });
  }
  return { cancelled: result.modifiedCount, resetNumbering: Boolean(resetNumbering) };
}

// Virada do dia: cancela as senhas pendentes de dias anteriores e reinicia a numeração em 001.
// Pode rodar quantas vezes for preciso (na inicialização e a cada minuto): só age uma vez por dia.
async function startNewDay(now = new Date()) {
  const todayStart = startOfToday(DEFAULT_TIMEZONE, now);

  const cancelled = await Ticket.updateMany(
    { status: { $in: PENDING_STATUSES }, createdAt: { $lt: todayStart } },
    { status: 'cancelled' }
  );

  const services = await ServiceType.find({
    $or: [{ counterResetAt: null }, { counterResetAt: { $lt: todayStart } }],
  });
  let servicesReset = 0;
  for (const service of services) {
    // Já saiu senha hoje (ex.: servidor ligado depois da meia-noite): mantém a sequência do dia
    // eslint-disable-next-line no-await-in-loop
    if (await Ticket.exists({ serviceType: service._id, createdAt: { $gte: todayStart } })) continue;
    // Só reinicia se o contador não mudou desde a leitura (uma senha gerada agora não é perdida)
    // eslint-disable-next-line no-await-in-loop
    const result = await ServiceType.updateOne(
      { _id: service._id, counter: service.counter },
      { counter: 0, counterResetAt: now }
    );
    servicesReset += result.modifiedCount;
  }

  return { cancelled: cancelled.modifiedCount, servicesReset };
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

  const todayStart = startOfToday(DEFAULT_TIMEZONE);
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

// Senhas chamadas e ainda não finalizadas, com o atendente e há quanto tempo foram chamadas
async function getInService() {
  const tickets = await Ticket.find({ status: 'called' })
    .populate('serviceType')
    .sort({ calledAt: 1 });

  const ids = [...new Set(tickets.map((t) => t.attendant))].filter((id) =>
    mongoose.isValidObjectId(id)
  );
  const users = await User.find({ _id: { $in: ids } });
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return tickets.map((t) => {
    const user = userById.get(String(t.attendant));
    return {
      _id: t._id,
      number: t.number,
      serviceType: t.serviceType ? t.serviceType.name : 'Serviço removido',
      calledAt: t.calledAt,
      attendant: user
        ? {
            _id: user._id,
            name: user.name,
            role: user.role,
            locationType: user.locationType,
            locationNumber: user.locationNumber,
          }
        : { _id: t.attendant, name: t.attendant },
    };
  });
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

module.exports = {
  getReport,
  getServiceTimes,
  getInService,
  resetQueues,
  startNewDay,
  getStatus,
  getConnections,
};
