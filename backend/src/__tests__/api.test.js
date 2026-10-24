// Os testes geram muitas senhas seguidas; o limite é testado à parte em rateLimit.test.js
process.env.GENERATE_RATE_LIMIT = '100000';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../app');
const ServiceType = require('../models/ServiceType');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const ticketController = require('../controllers/ticketController');

jest.setTimeout(60000);

let mongo;
let app;
let service;
let attendant;
let otherAttendant;
let admin;

const auth = (user) => ({ Authorization: `Bearer ${signToken(user)}` });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([ServiceType.deleteMany({}), Ticket.deleteMany({}), User.deleteMany({})]);
  service = await ServiceType.create({ name: 'Consulta', prefix: 'C', counter: 0 });
  attendant = await User.create({ name: 'Ana', username: 'ana', password: '123456' });
  otherAttendant = await User.create({ name: 'Bia', username: 'bia', password: '123456' });
  admin = await User.create({ name: 'Adm', username: 'adm', password: '123456', role: 'admin' });
});

const generate = (serviceTypeId = service._id) =>
  request(app).post('/api/tickets/generate').send({ serviceTypeId });

describe('geração de senhas', () => {
  it('gera números sequenciais no formato PREFIXO-000', async () => {
    const first = await generate();
    const second = await generate();
    expect(first.status).toBe(201);
    expect(first.body.number).toBe('C-001');
    expect(second.body.number).toBe('C-002');
    expect(second.body.position).toBe(2);
  });

  it('não repete números em gerações simultâneas', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => generate()));
    const numbers = results.map((r) => r.body.number);
    expect(new Set(numbers).size).toBe(20);
  });

  it('continua contando depois de 999', async () => {
    await ServiceType.updateOne({ _id: service._id }, { counter: 999 });
    expect((await generate()).body.number).toBe('C-1000');
    expect((await generate()).body.number).toBe('C-1001');
  });

  it('retoma a numeração de serviços antigos, sem contador', async () => {
    const legacy = await ServiceType.create({ name: 'Exame', prefix: 'E' });
    await ServiceType.collection.updateOne({ _id: legacy._id }, { $unset: { counter: '' } });
    await Ticket.create({ number: 'E-041', serviceType: legacy._id });
    await ticketController.initServices();
    expect((await generate(legacy._id)).body.number).toBe('E-042');
  });

  it('recusa serviço inexistente ou inativo com 404', async () => {
    expect((await generate(new mongoose.Types.ObjectId())).status).toBe(404);
    expect((await generate('invalido')).status).toBe(404);
    await ServiceType.updateOne({ _id: service._id }, { active: false });
    expect((await generate()).status).toBe(404);
  });

  it('reinicia a numeração ao zerar as filas', async () => {
    await generate();
    await generate();
    const reset = await request(app)
      .post('/api/admin/queues/reset')
      .set(auth(admin))
      .send({ resetNumbering: true });
    expect(reset.body.cancelled).toBe(2);
    expect((await generate()).body.number).toBe('C-001');
  });
});

describe('atendimento', () => {
  it('chama a senha mais antiga e finaliza', async () => {
    await generate();
    const called = await request(app).post('/api/tickets/call').set(auth(attendant)).send({});
    expect(called.body.number).toBe('C-001');
    expect(called.body.status).toBe('called');

    const finished = await request(app)
      .post(`/api/tickets/${called.body._id}/finish`)
      .set(auth(attendant));
    expect(finished.status).toBe(200);
    expect(finished.body.status).toBe('attended');
  });

  it('retorna ticket null quando a fila está vazia', async () => {
    const res = await request(app).post('/api/tickets/call').set(auth(attendant)).send({});
    expect(res.body.ticket).toBeNull();
  });

  it('não deixa finalizar senha que ainda não foi chamada', async () => {
    const { body } = await generate();
    const res = await request(app).post(`/api/tickets/${body._id}/finish`).set(auth(attendant));
    expect(res.status).toBe(409);
  });

  it('não deixa outro atendente finalizar a senha, mas o administrador pode', async () => {
    await generate();
    const called = await request(app).post('/api/tickets/call').set(auth(attendant)).send({});
    const other = await request(app)
      .post(`/api/tickets/${called.body._id}/finish`)
      .set(auth(otherAttendant));
    expect(other.status).toBe(409);

    const byAdmin = await request(app)
      .post(`/api/tickets/${called.body._id}/absent`)
      .set(auth(admin));
    expect(byAdmin.body.status).toBe('absent');
  });

  it('responde 404 para senha inexistente', async () => {
    const res = await request(app)
      .post(`/api/tickets/${new mongoose.Types.ObjectId()}/finish`)
      .set(auth(attendant));
    expect(res.status).toBe(404);
  });

  it('chama pelo número apenas dentro do serviço escolhido', async () => {
    const other = await ServiceType.create({ name: 'Outro', prefix: 'C', counter: 0 });
    await generate(other._id); // C-001 de outro serviço com o mesmo prefixo
    const res = await request(app)
      .post('/api/tickets/call-number')
      .set(auth(attendant))
      .send({ serviceTypeId: service._id, number: '1' });
    expect(res.status).toBe(404);
  });

  it('exige login para chamar senhas', async () => {
    expect((await request(app).post('/api/tickets/call').send({})).status).toBe(401);
  });
});

describe('últimas chamadas (painel)', () => {
  const callNext = () => request(app).post('/api/tickets/call').set(auth(attendant)).send({});

  it('lista as chamadas de hoje, da mais recente, com o local de quem chamou', async () => {
    await User.updateOne({ _id: attendant._id }, { locationType: 'Consultório', locationNumber: '3' });
    await generate();
    await generate();
    await callNext();
    await callNext();

    const res = await request(app).get('/api/tickets/recent-calls');
    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.number)).toEqual(['C-002', 'C-001']);
    expect(res.body[0]).toMatchObject({ locationType: 'Consultório', locationNumber: '3' });
  });

  it('a rechamada volta a senha para o topo', async () => {
    await generate();
    await generate();
    const first = await callNext();
    await request(app).post(`/api/tickets/${first.body._id}/finish`).set(auth(attendant));
    const second = await callNext();
    await request(app).post(`/api/tickets/${second.body._id}/recall`).set(auth(attendant));

    const res = await request(app).get('/api/tickets/recent-calls?limit=1');
    expect(res.body.map((t) => t.number)).toEqual(['C-002']);
  });

  it('não mostra chamadas de dias anteriores', async () => {
    const yesterday = new Date(Date.now() - 36 * 60 * 60 * 1000);
    await Ticket.create({
      number: 'C-099',
      serviceType: service._id,
      status: 'attended',
      calledAt: yesterday,
      lastCalledAt: yesterday,
    });
    expect((await request(app).get('/api/tickets/recent-calls')).body).toEqual([]);
  });
});

describe('relatório de tempos de atendimento', () => {
  const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);
  const range = () => ({
    start: minutesAgo(24 * 60).toISOString(),
    end: new Date(Date.now() + 60 * 1000).toISOString(),
  });

  beforeEach(async () => {
    const base = { serviceType: service._id, createdAt: minutesAgo(60) };
    await Ticket.create([
      // Ana: 10 min e 4 min de atendimento, 1 ausente
      { ...base, number: 'C-001', status: 'attended', attendant: String(attendant._id), calledAt: minutesAgo(30), attendedAt: minutesAgo(20) },
      { ...base, number: 'C-002', status: 'attended', attendant: String(attendant._id), calledAt: minutesAgo(10), attendedAt: minutesAgo(6) },
      { ...base, number: 'C-003', status: 'absent', attendant: String(attendant._id), calledAt: minutesAgo(5) },
      // Bia: 2 min
      { ...base, number: 'C-004', status: 'attended', attendant: String(otherAttendant._id), calledAt: minutesAgo(8), attendedAt: minutesAgo(6) },
      // Ainda em atendimento: não entra
      { ...base, number: 'C-005', status: 'called', attendant: String(otherAttendant._id), calledAt: minutesAgo(1) },
    ]);
  });

  it('soma, média, mínimo e máximo por atendente', async () => {
    const res = await request(app).get('/api/admin/service-times').query(range()).set(auth(admin));
    expect(res.status).toBe(200);
    const ana = res.body.byAttendant.find((a) => a.name === 'Ana');
    const bia = res.body.byAttendant.find((a) => a.name === 'Bia');
    expect(ana).toMatchObject({ attended: 2, absent: 1, totalService: 840, avgService: 420, minService: 240, maxService: 600 });
    expect(bia).toMatchObject({ attended: 1, absent: 0, totalService: 120 });
    expect(res.body.tickets).toBeUndefined();
  });

  it('lista os atendimentos de um atendente', async () => {
    const res = await request(app)
      .get('/api/admin/service-times')
      .query({ ...range(), attendantId: String(attendant._id) })
      .set(auth(admin));
    expect(res.body.byAttendant).toHaveLength(1);
    expect(res.body.tickets.map((t) => [t.number, t.serviceSeconds])).toEqual([
      ['C-003', null],
      ['C-002', 240],
      ['C-001', 600],
    ]);
  });

  it('é exclusivo do administrador', async () => {
    const res = await request(app).get('/api/admin/service-times').query(range()).set(auth(attendant));
    expect(res.status).toBe(403);
  });
});

describe('supervisor', () => {
  let supervisor;
  const today = () => ({
    start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() + 60 * 1000).toISOString(),
  });

  beforeEach(async () => {
    supervisor = await User.create({
      name: 'Sara',
      username: 'sara',
      password: '123456',
      role: 'supervisor',
    });
  });

  it('consulta relatórios, tempos, equipe, conectados, status e filas', async () => {
    const as = (req) => req.set(auth(supervisor));
    expect((await as(request(app).get('/api/admin/reports').query(today()))).status).toBe(200);
    expect((await as(request(app).get('/api/admin/service-times').query(today()))).status).toBe(200);
    expect((await as(request(app).get('/api/admin/connections'))).status).toBe(200);
    expect((await as(request(app).get('/api/admin/status'))).status).toBe(200);
    expect((await as(request(app).get('/api/admin/in-service'))).status).toBe(200);
    expect((await as(request(app).get('/api/users/directory'))).status).toBe(200);
    expect((await as(request(app).get('/api/tickets/queue/summary'))).status).toBe(200);
  });

  it('não acessa funções de administrador nem chama senhas', async () => {
    const as = (req) => req.set(auth(supervisor));
    const denied = [
      as(request(app).get('/api/users')),
      as(request(app).post('/api/users')).send({ name: 'X', username: 'x', password: '123456' }),
      as(request(app).put(`/api/users/${attendant._id}`)).send({ role: 'admin' }),
      as(request(app).delete(`/api/users/${attendant._id}`)),
      as(request(app).post('/api/admin/queues/reset')).send({}),
      as(request(app).post('/api/services')).send({ name: 'Y', prefix: 'Y' }),
      as(request(app).delete(`/api/services/${service._id}`)),
      as(request(app).post('/api/tickets/call')).send({}),
    ];
    const statuses = (await Promise.all(denied)).map((r) => r.status);
    expect(statuses).toEqual(statuses.map(() => 403));
  });

  it('vê quem está atendendo agora', async () => {
    await User.updateOne({ _id: attendant._id }, { locationType: 'Guichê', locationNumber: '4' });
    await generate();
    await request(app).post('/api/tickets/call').set(auth(attendant)).send({});

    const res = await request(app).get('/api/admin/in-service').set(auth(supervisor));
    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.tickets[0]).toMatchObject({
      number: 'C-001',
      attendant: { name: 'Ana', locationNumber: '4' },
    });
  });
});

describe('serviços', () => {
  it('lista só serviços ativos sem login', async () => {
    await ServiceType.create({ name: 'Inativo', prefix: 'I', active: false });
    const res = await request(app).get('/api/services');
    expect(res.body.map((s) => s.name)).toEqual(['Consulta']);
  });

  it('só o administrador cria e altera serviços', async () => {
    const data = { name: 'Vacina', prefix: 'v' };
    expect((await request(app).post('/api/services').send(data)).status).toBe(401);
    expect((await request(app).post('/api/services').set(auth(attendant)).send(data)).status).toBe(
      403
    );
    const created = await request(app).post('/api/services').set(auth(admin)).send(data);
    expect(created.status).toBe(201);
    expect(created.body.prefix).toBe('V');
  });

  it('desativa o serviço em vez de apagar, mantendo a fila funcionando', async () => {
    await generate();
    const res = await request(app).delete(`/api/services/${service._id}`).set(auth(admin));
    expect(res.status).toBe(200);
    const queue = await request(app).get('/api/tickets/queue');
    expect(queue.status).toBe(200);
    expect(queue.body[0].serviceType).toBe('Consulta');
  });
});

describe('prioridade', () => {
  it('chama 80+ antes de preferencial, e preferencial antes de normal', async () => {
    const pref = await ServiceType.create({ name: 'Consulta Preferencial', prefix: 'CS', priority: 1 });
    const idoso = await ServiceType.create({ name: 'Consulta (80+)', prefix: 'CP', priority: 2 });
    await generate(); // C-001 chegou primeiro
    await generate(pref._id);
    await generate(idoso._id);

    const order = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await request(app).post('/api/tickets/call').set(auth(attendant)).send({});
      order.push(res.body.number);
      await request(app).post(`/api/tickets/${res.body._id}/finish`).set(auth(attendant));
    }
    expect(order).toEqual(['CP-001', 'CS-001', 'C-001']);
  });

  it('dentro do serviço escolhido mantém a ordem de chegada', async () => {
    await generate();
    await generate();
    const res = await request(app)
      .post('/api/tickets/call')
      .set(auth(attendant))
      .send({ serviceTypeId: service._id });
    expect(res.body.number).toBe('C-001');
  });

  it('deduz a prioridade de serviços antigos pelo nome', async () => {
    const legacy = await ServiceType.create({ name: 'Exame (80+)', prefix: 'EP' });
    await ServiceType.collection.updateOne({ _id: legacy._id }, { $unset: { priority: '' } });
    const ticket = await Ticket.create({ number: 'EP-001', serviceType: legacy._id });
    await Ticket.collection.updateOne({ _id: ticket._id }, { $unset: { priority: '' } });

    await ticketController.initServices();
    expect((await ServiceType.findById(legacy._id)).priority).toBe(2);
    expect((await Ticket.findById(ticket._id)).priority).toBe(2);
  });
});

describe('totem', () => {
  afterEach(() => {
    delete process.env.TOTEM_TOKEN;
  });

  it('exige o X-Totem-Token quando TOTEM_TOKEN está definido', async () => {
    process.env.TOTEM_TOKEN = 'totem-secreto';
    expect((await generate()).status).toBe(403);
    const ok = await request(app)
      .post('/api/tickets/generate')
      .set('X-Totem-Token', 'totem-secreto')
      .send({ serviceTypeId: service._id });
    expect(ok.status).toBe(201);
  });
});

describe('login', () => {
  it('grava a sessão num cookie httpOnly e não devolve o token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ana', password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeUndefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^painel_session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    const me = await request(app).get('/api/auth/me').set('Cookie', cookie.split(';')[0]);
    expect(me.body.username).toBe('ana');
  });

  it('o logout apaga o cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.headers['set-cookie'][0]).toMatch(/painel_session=;/);
  });

  it('bloqueia após muitas senhas erradas', async () => {
    const attempt = () =>
      request(app).post('/api/auth/login').send({ username: 'adm', password: 'errada' });
    for (let i = 0; i < 10; i += 1) {
      expect((await attempt()).status).toBe(401);
    }
    expect((await attempt()).status).toBe(429);
  });
});
