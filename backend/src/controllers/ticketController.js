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

    // Buscar o maior número já gerado para este tipo de serviço
    const lastTicket = await Ticket.findOne({ serviceType: serviceTypeId }).sort({ number: -1 });

    let number = 1;
    if (lastTicket && lastTicket.number) {
      const lastNumber = parseInt(lastTicket.number.split('-')[1]);
      number = lastNumber + 1;
    }

    let ticketNumber = `${serviceType.prefix}-${String(number).padStart(3, '0')}`;

    // Garantir que não crie número duplicado se houver algum número ausente ou conflito
    while (await Ticket.exists({ number: ticketNumber })) {
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

// Chamar próxima senha
async function callNextTicket(attendantId) {
  try {
    const nextTicket = await Ticket.findOne({ status: 'waiting' })
      .populate('serviceType')
      .sort({ position: 1 });

    if (!nextTicket) {
      return null;
    }

    nextTicket.status = 'called';
    nextTicket.calledAt = new Date();
    nextTicket.attendant = attendantId;
    await nextTicket.save();

    return {
      _id: nextTicket._id,
      number: nextTicket.number,
      serviceType: nextTicket.serviceType.name,
      status: nextTicket.status,
      attendant: attendantId,
    };
  } catch (error) {
    throw error;
  }
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
  finishTicket,
  cancelTicket,
};
