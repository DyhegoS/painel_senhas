const mongoose = require('mongoose');

const serviceTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  prefix: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 3,
  },
  description: String,
  // Ordem de chamada entre filas: 2 = 80+, 1 = preferencial, 0 = normal
  priority: {
    type: Number,
    enum: [0, 1, 2],
    default: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
  // Último número emitido; incrementado de forma atômica a cada senha gerada
  counter: Number,
  // Data do último reinício da numeração (zerar filas)
  counterResetAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ServiceType', serviceTypeSchema);
