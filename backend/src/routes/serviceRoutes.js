const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Obter todos os serviços
router.get('/', async (req, res) => {
  try {
    const services = await serviceController.getAllServices();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo serviço
router.post('/', async (req, res) => {
  try {
    const service = await serviceController.createService(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Atualizar serviço
router.put('/:id', async (req, res) => {
  try {
    const service = await serviceController.updateService(req.params.id, req.body);
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar serviço
router.delete('/:id', async (req, res) => {
  try {
    const service = await serviceController.deleteService(req.params.id);
    res.json({ message: 'Serviço deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
