# API Endpoints

## Base URL

`http://localhost:5000/api`

## Serviços (Services)

### GET /services

Obtém todos os tipos de atendimento disponíveis

```json
Response:
[
  {
    "_id": "...",
    "name": "Exame",
    "prefix": "A",
    "description": "Coleta de sangue e exames",
    "active": true
  }
]
```

### POST /services

Criar novo tipo de serviço

```json
Body:
{
  "name": "Novo Serviço",
  "prefix": "F",
  "description": "Descrição do serviço"
}
```

### PUT /services/:id

Atualizar tipo de serviço

### DELETE /services/:id

Deletar tipo de serviço

---

## Tickets (Senhas)

### POST /tickets/generate

Gerar nova senha

```json
Body:
{
  "serviceTypeId": "..."
}

Response:
{
  "_id": "...",
  "number": "A-001",
  "serviceType": "Exame",
  "status": "waiting",
  "position": 1,
  "createdAt": "2024-01-01T10:00:00Z"
}
```

### GET /tickets/queue

Obter fila de espera

```json
Response:
[
  {
    "_id": "...",
    "number": "A-001",
    "serviceType": "Exame",
    "status": "waiting",
    "position": 1
  }
]
```

### POST /tickets/call

Chamar próxima senha

```json
Body:
{
  "attendantId": "attendant_001"
}

Response:
{
  "_id": "...",
  "number": "A-001",
  "serviceType": "Exame",
  "status": "called",
  "attendant": "attendant_001"
}
```

### POST /tickets/:id/finish

Finalizar atendimento

```json
Response:
{
  "_id": "...",
  "number": "A-001",
  "status": "attended",
  "attendedAt": "2024-01-01T10:05:00Z"
}
```

### POST /tickets/:id/cancel

Cancelar senha

```json
Response:
{
  "_id": "...",
  "number": "A-001",
  "status": "cancelled"
}
```

---

## WebSocket Events

### Cliente se identifica

```javascript
socket.emit('identify', { type: 'attendant' | 'panel' | 'customer' });
```

### Senha chamada

```javascript
socket.on('ticket_called', (ticket) => {
  // ticket.number: "A-001"
  // ticket.serviceType: "Exame"
});
```

### Fila atualizada

```javascript
socket.on('queue_update', (queue) => {
  // array de senhas na fila
});
```

### Atendimento finalizado

```javascript
socket.on('ticket_finished', (ticket) => {
  // ticket já foi finalizado
});
```

## Autenticação e usuários

Atendentes, médicos e administradores fazem login no app `web-attendant`.
No primeiro start do backend, se não existir nenhum administrador, é criado um
com `ADMIN_USERNAME` / `ADMIN_PASSWORD` do `.env` (padrão: `admin` / `admin123` — troque depois).

Rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota                      | Acesso                   | Descrição                                    |
| ------ | ------------------------- | ------------------------ | -------------------------------------------- |
| POST   | `/api/auth/login`         | público                  | `{ username, password }` → `{ token, user }` |
| GET    | `/api/auth/me`            | logado                   | Usuário da sessão                            |
| GET    | `/api/users`              | admin                    | Lista usuários                               |
| POST   | `/api/users`              | admin                    | Cria usuário                                 |
| PUT    | `/api/users/:id`          | admin                    | Atualiza (senha opcional)                    |
| DELETE | `/api/users/:id`          | admin                    | Remove usuário                               |
| POST   | `/api/tickets/call`       | atendente, médico, admin | Chama a próxima senha para o usuário logado  |
| POST   | `/api/tickets/:id/finish` | atendente, médico, admin | Finaliza atendimento                         |
| POST   | `/api/tickets/:id/cancel` | atendente, médico, admin | Cancela senha                                |

Campos do usuário: `name`, `username`, `password` (mín. 6 caracteres), `role`
(`admin` | `attendant` | `doctor`), `locationType` (`Guichê` | `Consultório` | `Sala`),
`locationNumber` (até 3 dígitos) e `active`. O local é enviado junto com a senha chamada e
exibido/anunciado no painel da TV.
