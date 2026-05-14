const ticketController = require('../src/controllers/ticketController');
const serviceController = require('../src/controllers/serviceController');

describe('Ticket Controller', () => {
  describe('generateTicket', () => {
    it('should generate a ticket with correct format', async () => {
      const ticket = await ticketController.generateTicket('serviceId123');

      expect(ticket).toHaveProperty('number');
      expect(ticket).toHaveProperty('serviceType');
      expect(ticket).toHaveProperty('status');
      expect(ticket.status).toBe('waiting');
      expect(ticket.number).toMatch(/^[A-E]-\d{3}$/);
    });

    it('should increment ticket number', async () => {
      const ticket1 = await ticketController.generateTicket('serviceId123');
      const ticket2 = await ticketController.generateTicket('serviceId123');

      const num1 = parseInt(ticket1.number.split('-')[1]);
      const num2 = parseInt(ticket2.number.split('-')[1]);

      expect(num2).toBe(num1 + 1);
    });
  });

  describe('callNextTicket', () => {
    it('should call the oldest waiting ticket', async () => {
      const ticket = await ticketController.callNextTicket('attendant_001');

      expect(ticket).toHaveProperty('status');
      expect(ticket.status).toBe('called');
      expect(ticket).toHaveProperty('attendant');
      expect(ticket.attendant).toBe('attendant_001');
    });

    it('should return null if no tickets waiting', async () => {
      const ticket = await ticketController.callNextTicket('attendant_001');
      expect(ticket).toBeNull();
    });
  });

  describe('finishTicket', () => {
    it('should finish a called ticket', async () => {
      const called = await ticketController.callNextTicket('attendant_001');
      const finished = await ticketController.finishTicket(called._id);

      expect(finished.status).toBe('attended');
      expect(finished).toHaveProperty('attendedAt');
    });
  });
});

describe('Service Controller', () => {
  describe('getAllServices', () => {
    it('should return array of services', async () => {
      const services = await serviceController.getAllServices();

      expect(Array.isArray(services)).toBe(true);
      services.forEach((service) => {
        expect(service).toHaveProperty('name');
        expect(service).toHaveProperty('prefix');
        expect(service).toHaveProperty('active');
      });
    });

    it('should only return active services', async () => {
      const services = await serviceController.getAllServices();

      services.forEach((service) => {
        expect(service.active).toBe(true);
      });
    });
  });
});
