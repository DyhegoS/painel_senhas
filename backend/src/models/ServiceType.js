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
  active: {
    type: Boolean,
    default: true,
  },
  // Senhas criadas antes desta data não contam para a numeração
  counterResetAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ServiceType', serviceTypeSchema);
