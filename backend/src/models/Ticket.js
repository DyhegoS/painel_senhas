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
  calledAt: Date,
  attendedAt: Date,
  attendant: String,
  position: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Ticket', ticketSchema);
