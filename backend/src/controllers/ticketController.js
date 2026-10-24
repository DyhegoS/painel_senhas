const mongoose = require('mongoose');
const ServiceType = require('../models/ServiceType');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { badRequest, notFound, conflict, assertId } = require('../errors');
const { startOfToday } = require('../time');

const PENDING_STATUSES = ['waiting', 'called'];
const SERVICE_NOT_FOUND = 'Tipo de serviço não encontrado';
const TICKET_NOT_FOUND = 'Senha não encontrada';

const formatNumber = (prefix, number) => `${prefix}-${String(number).padStart(3, '0')}`;
const serviceName = (ticket) => (ticket.serviceType ? ticket.serviceType.name : 'Serviço removido');

// Prioridade pelo nome, para serviços cadastrados antes do campo (80+ antes de preferencial)
function inferPriority(name = '') {
  const lower = name.toLowerCase();
  if (lower.includes('80+')) return 2;
  if (lower.includes('preferencial')) return 1;
  return 0;
}

// Ajusta dados de versões anteriores: contador atômico e prioridade das filas
async function initServices() {
  const withoutCounter = await ServiceType.find({ counter: { $exists: false } });
  await Promise.all(
    withoutCounter.map(async (service) => {
      // Parte do último número emitido desde o último reinício da numeração
      const numbering = { serviceType: service._id };
      if (service.counterResetAt) numbering.createdAt = { $gte: service.counterResetAt };
      const lastTicket = await Ticket.findOne(numbering).sort({ createdAt: -1 });
      const last = lastTicket ? parseInt(String(lastTicket.number).split('-')[1], 10) || 0 : 0;
      await ServiceType.updateOne(
        { _id: service._id, counter: { $exists: false } },
        { $set: { counter: last } }
      );
    })
  );

  const withoutPriority = await ServiceType.find({ priority: { $exists: false } });
  await Promise.all(
    withoutPriority.map((service) =>
      ServiceType.updateOne({ _id: service._id }, { priority: inferPriority(service.name) })
    )
  );

  // Chamadas de hoje feitas antes do campo lastCalledAt (aparecem nas últimas chamadas do painel)
  await Ticket.updateMany(
    { lastCalledAt: { $exists: false }, calledAt: { $gte: startOfToday() } },
    [{ $set: { lastCalledAt: '$calledAt' } }]
  );

  // Senhas pendentes geradas antes da prioridade herdam a do serviço
  const services = await ServiceType.find().select('priority');
  await Promise.all(
    services.map((service) =>
      Ticket.updateMany(
        { serviceType: service._id, status: { $in: PENDING_STATUSES }, priority: { $exists: false } },
        { priority: service.priority || 0 }
      )
    )
  );
}

// Gerar próxima senha
async function generateTicket(serviceTypeId) {
  assertId(serviceTypeId, SERVICE_NOT_FOUND);

  // O $inc é atômico: dois totens ao mesmo tempo nunca recebem o mesmo número
  const serviceType = await ServiceType.findOneAndUpdate(
    { _id: serviceTypeId, active: true },
    { $inc: { counter: 1 } },
    { new: true }
  );
  if (!serviceType) {
    throw notFound(SERVICE_NOT_FOUND);
  }

  // Posição na fila: quem ainda aguarda neste serviço, mais esta senha
  const ahead = await Ticket.countDocuments({ serviceType: serviceTypeId, status: 'waiting' });

  const ticket = await Ticket.create({
    number: formatNumber(serviceType.prefix, serviceType.counter),
    serviceType: serviceTypeId,
    position: ahead + 1,
    priority: serviceType.priority || 0,
  });

  return {
    _id: ticket._id,
    number: ticket.number,
    serviceType: serviceType.name,
    status: ticket.status,
    position: ticket.position,
    createdAt: ticket.createdAt,
  };
}

// Ordem de chamada: prioridade da fila e, dentro dela, ordem de chegada
const CALL_ORDER = { priority: -1, createdAt: 1 };

// Obter fila (aguardando e em chamada), na ordem em que serão chamadas
async function getQueue() {
  const tickets = await Ticket.find({ status: { $in: PENDING_STATUSES } })
    .populate('serviceType')
    .sort(CALL_ORDER);

  return tickets.map((t) => ({
    _id: t._id,
    number: t.number,
    serviceType: serviceName(t),
    status: t.status,
    position: t.position,
    priority: t.priority || 0,
  }));
}

// Dados enviados ao painel e ao atendente quando uma senha é chamada
function toCalledTicket(ticket, attendant) {
  return {
    _id: ticket._id,
    number: ticket.number,
    serviceType: serviceName(ticket),
    status: ticket.status,
    calledAt: ticket.calledAt,
    attendant: ticket.attendant,
    attendantName: attendant && attendant.name,
    locationType: attendant && attendant.locationType,
    locationNumber: attendant && attendant.locationNumber,
  };
}

function attendantIdOf(attendant) {
  return attendant && attendant._id ? String(attendant._id) : attendant;
}

// Marca a senha como chamada de forma atômica, para dois atendentes não pegarem a mesma
async function claimTicket(filter, attendant, sort = CALL_ORDER) {
  const now = new Date();
  const ticket = await Ticket.findOneAndUpdate(
    filter,
    { status: 'called', calledAt: now, lastCalledAt: now, attendant: attendantIdOf(attendant) },
    { new: true, sort }
  ).populate('serviceType');
  return ticket ? toCalledTicket(ticket, attendant) : null;
}

// Chamar próxima senha, de qualquer serviço (80+ e preferenciais primeiro) ou só do
// serviço informado (attendant pode ser o usuário logado ou apenas um identificador)
async function callNextTicket(attendant, serviceTypeId) {
  const filter = { status: 'waiting' };
  if (serviceTypeId) {
    assertId(serviceTypeId, SERVICE_NOT_FOUND);
    filter.serviceType = serviceTypeId;
  }
  return claimTicket(filter, attendant);
}

// Chamar uma senha específica pelo número, sem as letras (ex.: 12 -> CS-012)
async function callTicketByNumber(attendant, serviceTypeId, number) {
  assertId(serviceTypeId, SERVICE_NOT_FOUND);
  const serviceType = await ServiceType.findById(serviceTypeId);
  if (!serviceType) {
    throw notFound(SERVICE_NOT_FOUND);
  }
  const digits = parseInt(number, 10);
  if (!Number.isInteger(digits) || digits <= 0) {
    throw badRequest('Número de senha inválido');
  }

  const ticketNumber = formatNumber(serviceType.prefix, digits);
  // Se a numeração foi reiniciada pode haver números repetidos: vale a senha mais recente
  const ticket = await claimTicket(
    { serviceType: serviceTypeId, number: ticketNumber, status: { $in: ['waiting', 'absent'] } },
    attendant,
    { createdAt: -1 }
  );
  if (!ticket) {
    throw notFound(`Senha ${ticketNumber} não encontrada ou já atendida`);
  }
  return ticket;
}

// Chamar de novo a senha que o atendente já chamou
async function recallTicket(ticketId, attendant) {
  assertId(ticketId, TICKET_NOT_FOUND);
  const ticket = await Ticket.findOneAndUpdate(
    { _id: ticketId, status: 'called', attendant: attendantIdOf(attendant) },
    { lastCalledAt: new Date() },
    { new: true }
  ).populate('serviceType');
  if (!ticket) {
    throw conflict('Senha não está em atendimento');
  }
  return toCalledTicket(ticket, attendant);
}

// Últimas senhas chamadas hoje, da mais recente para a mais antiga, no mesmo formato do
// evento ticket_called (para o painel da TV restaurar a tela ao abrir ou reconectar)
async function getRecentCalls(limit = 6) {
  const count = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);
  const tickets = await Ticket.find({ lastCalledAt: { $gte: startOfToday() } })
    .populate('serviceType')
    .sort({ lastCalledAt: -1 })
    .limit(count);

  const attendantIds = [...new Set(tickets.map((t) => t.attendant))].filter((id) =>
    mongoose.isValidObjectId(id)
  );
  const users = await User.find({ _id: { $in: attendantIds } });
  const userById = new Map(users.map((u) => [String(u._id), u]));
  return tickets.map((t) => toCalledTicket(t, userById.get(String(t.attendant))));
}

// Senha em atendimento pelo atendente (para restaurar o acionador ao reabrir)
async function getCurrentTicket(attendant) {
  const ticket = await Ticket.findOne({ status: 'called', attendant: attendantIdOf(attendant) })
    .populate('serviceType')
    .sort({ calledAt: -1 });
  return ticket ? toCalledTicket(ticket, attendant) : null;
}

// Quantidade de senhas aguardando e a espera da mais antiga, por serviço
async function getQueueSummary() {
  const [services, waiting] = await Promise.all([
    ServiceType.find({ active: true }).sort({ priority: -1, name: 1 }),
    Ticket.aggregate([
      { $match: { status: 'waiting' } },
      {
        $group: {
          _id: '$serviceType',
          waiting: { $sum: 1 },
          oldestCreatedAt: { $min: '$createdAt' },
        },
      },
    ]),
  ]);

  const byService = new Map(waiting.map((w) => [String(w._id), w]));
  return services.map((s) => {
    const stats = byService.get(String(s._id));
    return {
      _id: s._id,
      name: s.name,
      prefix: s.prefix,
      priority: s.priority || 0,
      waiting: stats ? stats.waiting : 0,
      oldestCreatedAt: stats ? stats.oldestCreatedAt : null,
    };
  });
}

// Muda o status só se a senha estiver num status permitido (e, para quem não é
// administrador, só se tiver sido chamada pelo próprio usuário)
async function transition(ticketId, user, fromStatuses, changes) {
  assertId(ticketId, TICKET_NOT_FOUND);
  const filter = { _id: ticketId, status: { $in: fromStatuses } };
  if (user && typeof user === 'object' && user.role !== 'admin') {
    filter.$or = [{ status: 'waiting' }, { attendant: attendantIdOf(user) }];
  }

  const ticket = await Ticket.findOneAndUpdate(filter, changes, { new: true });
  if (ticket) return ticket;

  if (!(await Ticket.exists({ _id: ticketId }))) {
    throw notFound(TICKET_NOT_FOUND);
  }
  throw conflict('Esta senha não está mais em atendimento por você');
}

// Finalizar atendimento
function finishTicket(ticketId, user) {
  return transition(ticketId, user, ['called'], { status: 'attended', attendedAt: new Date() });
}

// Paciente não compareceu à chamada
function markAbsent(ticketId, user) {
  return transition(ticketId, user, ['called'], { status: 'absent' });
}

// Cancelar senha
function cancelTicket(ticketId, user) {
  return transition(ticketId, user, PENDING_STATUSES, { status: 'cancelled' });
}

module.exports = {
  PENDING_STATUSES,
  inferPriority,
  initServices,
  generateTicket,
  getQueue,
  callNextTicket,
  callTicketByNumber,
  recallTicket,
  getCurrentTicket,
  getRecentCalls,
  getQueueSummary,
  finishTicket,
  markAbsent,
  cancelTicket,
};
