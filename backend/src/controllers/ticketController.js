const ServiceType = require('../models/ServiceType');
const Ticket = require('../models/Ticket');
const { v4: uuidv4 } = require('uuid');

// Gerar próxima senha
async function generateTicket(serviceTypeId) {
  try {
    const serviceType = await ServiceType.findById(serviceTypeId);
    if (!serviceType) {
      throw new Error('Tipo de serviço não encontrado');
    }

    // Buscar o maior número já gerado para este tipo de serviço desde o último reinício
    const numbering = { serviceType: serviceTypeId };
    if (serviceType.counterResetAt) numbering.createdAt = { $gte: serviceType.counterResetAt };
    const lastTicket = await Ticket.findOne(numbering).sort({ number: -1 });

    let number = 1;
    if (lastTicket && lastTicket.number) {
      const lastNumber = parseInt(lastTicket.number.split('-')[1]);
      number = lastNumber + 1;
    }

    let ticketNumber = `${serviceType.prefix}-${String(number).padStart(3, '0')}`;

    // Garantir que não crie número duplicado se houver algum número ausente ou conflito
    while (await Ticket.exists({ ...numbering, number: ticketNumber })) {
      number += 1;
      ticketNumber = `${serviceType.prefix}-${String(number).padStart(3, '0')}`;
    }

    // Contar posição na fila
    const position = await Ticket.countDocuments({
      serviceType: serviceTypeId,
      status: { $in: ['waiting', 'called'] },
    });

    const ticket = new Ticket({
      number: ticketNumber,
      serviceType: serviceTypeId,
      position: position + 1,
    });

    await ticket.save();
    await ticket.populate('serviceType');

    return {
      _id: ticket._id,
      number: ticket.number,
      serviceType: ticket.serviceType.name,
      status: ticket.status,
      position: ticket.position,
      createdAt: ticket.createdAt,
    };
  } catch (error) {
    throw error;
  }
}

// Obter fila de espera
async function getQueue() {
  try {
    const tickets = await Ticket.find({ status: { $in: ['waiting', 'called'] } })
      .populate('serviceType')
      .sort({ position: 1 });

    return tickets.map((t) => ({
      _id: t._id,
      number: t.number,
      serviceType: t.serviceType.name,
      status: t.status,
      position: t.position,
    }));
  } catch (error) {
    throw error;
  }
}

// Dados enviados ao painel e ao atendente quando uma senha é chamada
function toCalledTicket(ticket, attendant) {
  return {
    _id: ticket._id,
    number: ticket.number,
    serviceType: ticket.serviceType.name,
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
async function claimTicket(filter, attendant, sort = { createdAt: 1 }) {
  const ticket = await Ticket.findOneAndUpdate(
    filter,
    { status: 'called', calledAt: new Date(), attendant: attendantIdOf(attendant) },
    { new: true, sort }
  ).populate('serviceType');
  return ticket ? toCalledTicket(ticket, attendant) : null;
}

// Chamar próxima senha, de qualquer serviço ou só do serviço informado
// (attendant pode ser o usuário logado ou apenas um identificador)
async function callNextTicket(attendant, serviceTypeId) {
  const filter = { status: 'waiting' };
  if (serviceTypeId) filter.serviceType = serviceTypeId;
  return claimTicket(filter, attendant);
}

// Chamar uma senha específica pelo número, sem as letras (ex.: 12 -> CS-012)
async function callTicketByNumber(attendant, serviceTypeId, number) {
  const serviceType = await ServiceType.findById(serviceTypeId);
  if (!serviceType) {
    throw new Error('Tipo de serviço não encontrado');
  }
  const digits = parseInt(number, 10);
  if (!Number.isInteger(digits) || digits <= 0) {
    throw new Error('Número de senha inválido');
  }

  const ticketNumber = `${serviceType.prefix}-${String(digits).padStart(3, '0')}`;
  // Se a numeração foi reiniciada pode haver números repetidos: vale a senha mais recente
  const ticket = await claimTicket(
    { number: ticketNumber, status: { $in: ['waiting', 'absent'] } },
    attendant,
    { createdAt: -1 }
  );
  if (!ticket) {
    throw new Error(`Senha ${ticketNumber} não encontrada ou já atendida`);
  }
  return ticket;
}

// Chamar de novo a senha que o atendente já chamou
async function recallTicket(ticketId, attendant) {
  const ticket = await Ticket.findOne({
    _id: ticketId,
    status: 'called',
    attendant: attendantIdOf(attendant),
  }).populate('serviceType');
  if (!ticket) {
    throw new Error('Senha não está em atendimento');
  }
  return toCalledTicket(ticket, attendant);
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
    ServiceType.find({ active: true }).sort({ name: 1 }),
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
      waiting: stats ? stats.waiting : 0,
      oldestCreatedAt: stats ? stats.oldestCreatedAt : null,
    };
  });
}

// Finalizar atendimento
async function finishTicket(ticketId) {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error('Senha não encontrada');
    }

    ticket.status = 'attended';
    ticket.attendedAt = new Date();
    await ticket.save();

    return ticket;
  } catch (error) {
    throw error;
  }
}

// Paciente não compareceu à chamada
async function markAbsent(ticketId) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    throw new Error('Senha não encontrada');
  }

  ticket.status = 'absent';
  await ticket.save();

  return ticket;
}

// Cancelar senha
async function cancelTicket(ticketId) {
  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new Error('Senha não encontrada');
    }

    ticket.status = 'cancelled';
    await ticket.save();

    return ticket;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  generateTicket,
  getQueue,
  callNextTicket,
  callTicketByNumber,
  recallTicket,
  getCurrentTicket,
  getQueueSummary,
  finishTicket,
  markAbsent,
  cancelTicket,
};
