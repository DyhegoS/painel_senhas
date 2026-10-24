const ServiceType = require('../models/ServiceType');
const { notFound, assertId } = require('../errors');

// Campos que a API aceita (o contador de senhas só muda pela geração/reinício)
const EDITABLE_FIELDS = ['name', 'prefix', 'description', 'priority', 'active'];

function pick(data = {}) {
  const result = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (data[field] !== undefined) result[field] = data[field];
  });
  if (typeof result.prefix === 'string') result.prefix = result.prefix.trim().toUpperCase();
  return result;
}

// Obter todos os tipos de serviço ativos
function getAllServices() {
  return ServiceType.find({ active: true }).sort({ name: 1 });
}

// Criar novo tipo de serviço
function createService(data) {
  return ServiceType.create({ ...pick(data), counter: 0 });
}

// Atualizar tipo de serviço
async function updateService(id, data) {
  assertId(id, 'Tipo de serviço não encontrado');
  const service = await ServiceType.findByIdAndUpdate(id, pick(data), {
    new: true,
    runValidators: true,
  });
  if (!service) throw notFound('Tipo de serviço não encontrado');
  return service;
}

// Desativar tipo de serviço: as senhas antigas continuam ligadas a ele nos relatórios
async function deleteService(id) {
  return updateService(id, { active: false });
}

module.exports = {
  getAllServices,
  createService,
  updateService,
  deleteService,
};
