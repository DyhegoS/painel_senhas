const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true,
  },
  serviceType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceType',
    required: true,
  },
  status: {
    type: String,
    enum: ['waiting', 'called', 'attended', 'cancelled'],
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
