const User = require('../models/User');
const { badRequest, notFound, conflict, assertId } = require('../errors');

const EDITABLE_FIELDS = ['name', 'username', 'role', 'locationType', 'locationNumber', 'active'];

function pick(data) {
  const result = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) result[field] = data[field];
  });
  return result;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw badRequest('A senha deve ter pelo menos 6 caracteres');
  }
}

// Mensagem amigável para nome de usuário duplicado
function translateError(error) {
  if (error.code === 11000) {
    return conflict('Já existe um usuário com este login');
  }
  return error;
}

async function countActiveAdmins(excludeId) {
  return User.countDocuments({ role: 'admin', active: true, _id: { $ne: excludeId } });
}

// Listar todos os usuários
async function getAllUsers() {
  const users = await User.find().sort({ role: 1, name: 1 });
  return users.map((u) => u.toPublic());
}

// Listar a equipe para qualquer usuário logado (sem dados de acesso)
async function getDirectory() {
  const users = await User.find().sort({ role: 1, name: 1 });
  return users.map((u) => ({
    _id: u._id,
    name: u.name,
    role: u.role,
    locationType: u.locationType,
    locationNumber: u.locationNumber,
    active: u.active,
  }));
}

// Criar novo usuário
async function createUser(data) {
  validatePassword(data.password);
  try {
    const user = new User({ ...pick(data), password: data.password });
    await user.save();
    return user.toPublic();
  } catch (error) {
    throw translateError(error);
  }
}

// Atualizar usuário (senha é opcional)
async function updateUser(id, data) {
  assertId(id, 'Usuário não encontrado');
  const user = await User.findById(id);
  if (!user) {
    throw notFound('Usuário não encontrado');
  }

  const changes = pick(data);
  const losesAdmin =
    user.role === 'admin' &&
    user.active &&
    ((changes.role && changes.role !== 'admin') || changes.active === false);
  if (losesAdmin && (await countActiveAdmins(user._id)) === 0) {
    throw conflict('É necessário manter pelo menos um administrador ativo');
  }

  Object.assign(user, changes);
  if (data.password) {
    validatePassword(data.password);
    user.password = data.password;
  }

  try {
    await user.save();
    return user.toPublic();
  } catch (error) {
    throw translateError(error);
  }
}

// Remover usuário
async function deleteUser(id) {
  assertId(id, 'Usuário não encontrado');
  const user = await User.findById(id);
  if (!user) {
    throw notFound('Usuário não encontrado');
  }
  if (user.role === 'admin' && (await countActiveAdmins(user._id)) === 0) {
    throw conflict('É necessário manter pelo menos um administrador ativo');
  }
  await user.deleteOne();
  return user.toPublic();
}

// Autenticar por login e senha
async function authenticate(username, password) {
  const user = await User.findOne({ username: String(username || '').toLowerCase().trim() }).select(
    '+password'
  );
  if (!user || !user.active || !(await user.checkPassword(String(password || '')))) {
    return null;
  }
  return user;
}

// Garante que exista um administrador para o primeiro acesso
async function ensureAdmin() {
  const hasAdmin = await User.exists({ role: 'admin' });
  if (hasAdmin) return;

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  await new User({ name: 'Administrador', username, password, role: 'admin' }).save();
  console.log(`👑 Administrador inicial criado (login: ${username})`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  Usando senha padrão do administrador — altere-a no painel de usuários');
  }
}

module.exports = {
  getAllUsers,
  getDirectory,
  createUser,
  updateUser,
  deleteUser,
  authenticate,
  ensureAdmin,
};
