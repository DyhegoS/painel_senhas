const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['admin', 'attendant', 'doctor'];
const LOCATION_TYPES = ['Guichê', 'Consultório', 'Sala'];

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ROLES,
    default: 'attendant',
  },
  // Local para onde o paciente deve se dirigir (ex.: Guichê 1, Consultório 3)
  locationType: {
    type: String,
    enum: LOCATION_TYPES,
    default: 'Guichê',
  },
  locationNumber: {
    type: String,
    match: /^\d{0,3}$/,
    default: '',
  },
  active: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Gerar hash da senha antes de salvar
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.checkPassword = function checkPassword(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    role: this.role,
    locationType: this.locationType,
    locationNumber: this.locationNumber,
    active: this.active,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
User.ROLES = ROLES;
User.LOCATION_TYPES = LOCATION_TYPES;

module.exports = User;
