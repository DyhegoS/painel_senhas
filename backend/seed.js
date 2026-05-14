const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const ServiceType = require('./src/models/ServiceType');
const Ticket = require('./src/models/Ticket');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/painel_senhas';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado ao MongoDB');

    // Limpar coleções existentes
    await ServiceType.deleteMany({});
    await Ticket.deleteMany({});
    console.log('✓ Coleções limpas');

    // Inserir tipos de serviço
    const services = await ServiceType.insertMany([
      {
        name: 'Exame',
        prefix: 'A',
        description: 'Coleta de sangue e exames',
        active: true,
      },
      {
        name: 'Consulta',
        prefix: 'B',
        description: 'Consulta médica geral',
        active: true,
      },
      {
        name: 'Vacinação',
        prefix: 'C',
        description: 'Aplicação de vacinas',
        active: true,
      },
      {
        name: 'Curativos',
        prefix: 'D',
        description: 'Curativos e feridas',
        active: true,
      },
      {
        name: 'Recepção',
        prefix: 'E',
        description: 'Atendimento de recepção',
        active: true,
      },
    ]);

    console.log(`✓ ${services.length} tipos de serviço criados`);

    // Criar algumas senhas de teste
    const testTickets = [];
    for (let i = 0; i < services.length; i++) {
      for (let j = 1; j <= 5; j++) {
        testTickets.push({
          number: `${services[i].prefix}-${String(j).padStart(3, '0')}`,
          serviceType: services[i]._id,
          status: j <= 2 ? 'waiting' : j === 3 ? 'called' : 'attended',
          position: j,
          calledAt: j >= 3 ? new Date() : null,
          attendedAt: j > 3 ? new Date() : null,
          attendant: j > 3 ? 'attendant_001' : null,
        });
      }
    }

    await Ticket.insertMany(testTickets);
    console.log(`✓ ${testTickets.length} senhas de teste criadas`);

    console.log('\n✅ Banco de dados inicializado com sucesso!');
    console.log('\n📊 Dados de teste inseridos:');
    services.forEach((s) => {
      console.log(`  - ${s.prefix}: ${s.name}`);
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedDatabase();
