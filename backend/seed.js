// Uso: node seed.js            -> apaga serviços e senhas e recria os dados de teste
//      node seed.js --if-empty -> só cria os dados se ainda não houver serviços
//      node seed.js --force    -> permite rodar com NODE_ENV=production
//      node seed.js --services-only -> só cria os tipos de atendimento (sem senhas de teste)
//                                      e só se ainda não houver nenhum; pode rodar em produção
const mongoose = require('mongoose');
require('dotenv').config();

const ServiceType = require('./src/models/ServiceType');
const Ticket = require('./src/models/Ticket');
const { inferPriority } = require('./src/controllers/ticketController');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/painel_senhas';

const TEST_TICKETS_PER_SERVICE = 5;

const servicesOnly = process.argv.includes('--services-only');
const ifEmpty = servicesOnly || process.argv.includes('--if-empty');

async function seedDatabase() {
  // --services-only não apaga nada, por isso é permitido em produção
  if (process.env.NODE_ENV === 'production' && !servicesOnly && !process.argv.includes('--force')) {
    console.error('❌ NODE_ENV=production: o seed apaga todas as senhas. Use --force se tiver certeza.');
    process.exit(1);
  }

  let exitCode = 0;
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado ao MongoDB');

    if (ifEmpty && (await ServiceType.exists({}))) {
      console.log('ℹ Serviços já cadastrados, nada a fazer');
      return;
    }

    // Limpar coleções existentes (com --services-only não há serviços e as senhas ficam)
    if (!servicesOnly) {
      await ServiceType.deleteMany({});
      await Ticket.deleteMany({});
      console.log('✓ Coleções limpas');
    }

    // Inserir tipos de serviço
    const services = await ServiceType.insertMany([
      {
        name: 'Exame',
        prefix: 'E',
        description: 'Atendimento a exames',
        active: true,
      },
      {
        name: 'Agendar Exames',
        prefix: 'AE',
        description: 'Agendamento de Exames',
        active: true,
      },
      {
        name: 'Consulta',
        prefix: 'C',
        description: 'Atendimento de consultas',
        active: true,
      },
      {
        name: 'Agendar Consultas',
        prefix: 'AC',
        description: 'Agendamento de consultas',
        active: true,
      },
      {
        name: 'Consulta (80+)',
        prefix: 'CP',
        description: 'Consultas preferencial 80+',
        active: true,
      },
      {
        name: 'Exame (80+)',
        prefix: 'EP',
        description: 'Exame preferencial 80+',
        active: true,
      },
      {
        name: 'Consulta Preferencial',
        prefix: 'CS',
        description: 'Agendamento de consultas preferencial',
        active: true,
      },
      {
        name: 'Exame Preferencial',
        prefix: 'ES',
        description: 'Exame preferencial',
        active: true,
      },
    ].map((service) => ({
      ...service,
      priority: inferPriority(service.name),
      counter: servicesOnly ? 0 : TEST_TICKETS_PER_SERVICE,
    })));

    console.log(`✓ ${services.length} tipos de serviço criados`);

    if (servicesOnly) {
      services.forEach((s) => console.log(`  - ${s.prefix}: ${s.name}`));
      return;
    }

    // Criar algumas senhas de teste
    const testTickets = [];
    for (let i = 0; i < services.length; i++) {
      for (let j = 1; j <= TEST_TICKETS_PER_SERVICE; j++) {
        testTickets.push({
          number: `${services[i].prefix}-${String(j).padStart(3, '0')}`,
          serviceType: services[i]._id,
          priority: services[i].priority,
          status: j <= 2 ? 'waiting' : j === 3 ? 'called' : 'attended',
          position: j,
          calledAt: j >= 3 ? new Date() : null,
          attendedAt: j > 3 ? new Date() : null,
          attendant: j >= 3 ? 'attendant_001' : null,
        });
      }
    }

    await Ticket.insertMany(testTickets);
    console.log(`✓ ${testTickets.length} senhas de teste criadas`);

    console.log('\n✅ Banco de dados inicializado com sucesso!');
    console.log('\n📊 Dados de teste inseridos:');
    services.forEach((s) => {
      console.log(`  - ${s.prefix}: ${s.name}${s.priority ? ` (prioridade ${s.priority})` : ''}`);
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit(exitCode);
  }
}

seedDatabase();
