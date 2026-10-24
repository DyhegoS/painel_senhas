const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Não é único: a numeração pode ser reiniciada ao zerar as filas
  number: {
    type: String,
    required: true,
    index: true,
  },
  serviceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceType',
    required: true,
  },
  status: {
    type: String,
    enum: ['waiting', 'called', 'attended', 'absent', 'cancelled'],
    default: 'waiting',
  },
  // Primeira chamada (usada nos relatórios de tempo de espera)
  calledAt: Date,
  // Última chamada ou rechamada (ordena as "últimas chamadas" do painel)
  lastCalledAt: Date,
  attendedAt: Date,
  attendant: String,
  position: Number,
  // Copiada do serviço ao gerar, para ordenar a chamada sem consultar o serviço
  priority: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Consultas mais frequentes: fila por status e senha em atendimento por atendente
ticketSchema.index({ status: 1, serviceType: 1, createdAt: 1 });
ticketSchema.index({ status: 1, priority: -1, createdAt: 1 });
ticketSchema.index({ attendant: 1, status: 1 });
ticketSchema.index({ lastCalledAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
