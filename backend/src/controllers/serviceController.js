const ServiceType = require('../models/ServiceType');

// Obter todos os tipos de serviço ativos
async function getAllServices() {
  try {
    const services = await ServiceType.find({ active: true });
    return services;
  } catch (error) {
    throw error;
  }
}

// Criar novo tipo de serviço
async function createService(data) {
  try {
    const service = new ServiceType(data);
    await service.save();
    return service;
  } catch (error) {
    throw error;
  }
}

// Atualizar tipo de serviço
async function updateService(id, data) {
  try {
    const service = await ServiceType.findByIdAndUpdate(id, data, { new: true });
    return service;
  } catch (error) {
    throw error;
  }
}

// Deletar tipo de serviço
async function deleteService(id) {
  try {
    const service = await ServiceType.findByIdAndDelete(id);
    return service;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getAllServices,
  createService,
  updateService,
  deleteService,
};
