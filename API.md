# API Endpoints

## Base URL

`http://<servidor>:5000/api`

Erros sempre voltam como `{ "error": "mensagem" }`, com o status HTTP adequado:
`400` dados inválidos · `401` sem sessão · `403` sem permissão · `404` não encontrado ·
`409` conflito (ex.: senha não está mais em atendimento) · `429` muitas tentativas.

## Autenticação

O login grava a sessão num **cookie httpOnly** (`painel_session`, `SameSite=Lax`). O navegador
o envia sozinho; o JavaScript da página não tem acesso ao token. Clientes web precisam usar
`withCredentials: true` (axios) ou `credentials: 'include'` (fetch).

Para scripts e integrações também é aceito o cabeçalho `Authorization: Bearer <token>`.

No primeiro start do backend, se não existir nenhum administrador, é criado um com
`ADMIN_USERNAME` / `ADMIN_PASSWORD` do `.env` (padrão: `admin` / `admin123` — troque depois).
Depois de 10 senhas erradas para o mesmo login e IP, o login fica bloqueado por 15 minutos.

| Método | Rota               | Acesso  | Descrição                                                 |
| ------ | ------------------ | ------- | --------------------------------------------------------- |
| POST   | `/auth/login`      | público | `{ username, password }` → `{ user }` + cookie de sessão  |
| POST   | `/auth/logout`     | público | Apaga o cookie de sessão                                  |
| GET    | `/auth/me`         | logado  | Usuário da sessão                                         |

### Perfis

| Perfil        | Pode                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| `admin`       | Tudo: usuários, serviços, zerar filas, relatórios, status e atendimento               |
| `supervisor`  | Só consulta: relatórios, tempos de atendimento, equipe, conectados/em atendimento e status. Não cadastra usuários, não zera filas e não chama senhas |
| `attendant`, `doctor` | Chamar e encerrar senhas no acionador                                          |

## Serviços (filas)

| Método | Rota             | Acesso  | Descrição                                               |
| ------ | ---------------- | ------- | ------------------------------------------------------- |
| GET    | `/services`      | público | Serviços ativos (usado pelo totem)                      |
| POST   | `/services`      | admin   | Cria serviço                                            |
| PUT    | `/services/:id`  | admin   | Atualiza serviço                                        |
| DELETE | `/services/:id`  | admin   | **Desativa** o serviço (as senhas antigas continuam nos relatórios) |

Campos: `name`, `prefix` (1 a 3 letras, convertido para maiúsculas), `description`, `active` e
`priority` — ordem de chamada entre filas: `2` = 80+, `1` = preferencial, `0` = normal.

```json
{
  "_id": "...",
  "name": "Consulta (80+)",
  "prefix": "CP",
  "description": "Consultas preferencial 80+",
  "priority": 2,
  "active": true
}
```

## Senhas (tickets)

| Método | Rota                       | Acesso                   | Descrição                                   |
| ------ | -------------------------- | ------------------------ | ------------------------------------------- |
| POST   | `/tickets/generate`        | totem                    | Gera senha `{ serviceTypeId }`              |
| GET    | `/tickets/queue`           | público                  | Senhas aguardando/em chamada, na ordem de chamada |
| GET    | `/tickets/queue/summary`   | atendente, médico, admin, supervisor | Aguardando e espera da mais antiga por fila |
| GET    | `/tickets/current`         | atendente, médico, admin | Senha em atendimento pelo usuário logado    |
| POST   | `/tickets/call`            | atendente, médico, admin | Chama a próxima `{ serviceTypeId? }`        |
| POST   | `/tickets/call-number`     | atendente, médico, admin | Chama pelo número `{ serviceTypeId, number }` |
| POST   | `/tickets/:id/recall`      | atendente, médico, admin | Rechama a senha em atendimento              |
| POST   | `/tickets/:id/finish`      | atendente, médico, admin | Finaliza atendimento                        |
| POST   | `/tickets/:id/absent`      | atendente, médico, admin | Paciente não compareceu                     |
| POST   | `/tickets/:id/cancel`      | atendente, médico, admin | Cancela senha                               |

### Geração (`POST /tickets/generate`)

- Se `TOTEM_TOKEN` estiver definido no backend, exige o cabeçalho `X-Totem-Token`.
- Limite de `GENERATE_RATE_LIMIT` senhas por minuto por IP (padrão 30).
- A numeração é atômica por serviço (`CP-001`, `CP-002`, …) e passa de 999 normalmente.

```json
Response 201:
{
  "_id": "...",
  "number": "CP-001",
  "serviceType": "Consulta (80+)",
  "status": "waiting",
  "position": 1,
  "createdAt": "2026-01-01T10:00:00Z",
  "printStatus": "printed" | "error" | "no_printer"
}
```

### Ordem de chamada (`POST /tickets/call`)

- Sem `serviceTypeId`: chama de **qualquer fila**, primeiro 80+, depois preferencial, depois
  normal; dentro da mesma prioridade, por ordem de chegada.
- Com `serviceTypeId`: chama só daquela fila, por ordem de chegada.
- Sem senhas aguardando: `{ "ticket": null, "message": "Nenhuma senha na fila" }`.

```json
Response:
{
  "_id": "...",
  "number": "CP-001",
  "serviceType": "Consulta (80+)",
  "status": "called",
  "calledAt": "2026-01-01T10:03:00Z",
  "attendant": "<id do usuário>",
  "attendantName": "Ana",
  "locationType": "Guichê",
  "locationNumber": "2"
}
```

### Reinício automático à meia-noite

Todo dia à meia-noite (fuso `REPORT_TIMEZONE`) o backend cancela as senhas que ficaram pendentes
e reinicia a numeração de cada serviço em 001. Se o servidor estiver desligado à meia-noite, o
reinício acontece quando ele ligar. Um serviço que já emitiu senha no dia mantém a sequência.
Ao reiniciar, emite `queue_update` e `new_day` (os painéis da TV limpam as chamadas do dia
anterior). Desative com `AUTO_RESET=false`.

### Encerrar (`finish`, `absent`, `cancel`)

- `finish` e `absent` só valem para senhas **chamadas**; `cancel` vale para aguardando ou chamadas.
- Atendentes e médicos só encerram senhas que eles mesmos chamaram; o admin encerra qualquer uma.
- Se a senha não estiver mais nesse estado (ex.: filas zeradas), responde `409`.

## Administração

| Método | Rota                   | Acesso | Descrição                                              |
| ------ | ---------------------- | ------ | ------------------------------------------------------ |
| GET    | `/admin/reports`       | admin, supervisor | Relatório `?start=ISO&end=ISO&timezone=America/Sao_Paulo` |
| GET    | `/admin/service-times` | admin, supervisor | Tempos de atendimento por atendente `?start=ISO&end=ISO&attendantId=` |
| GET    | `/admin/in-service`    | admin, supervisor | Senhas em atendimento agora, com atendente e hora da chamada |
| POST   | `/admin/queues/reset`  | admin  | Zera filas `{ serviceTypeId?, resetNumbering? }`       |
| GET    | `/admin/connections`   | admin, supervisor | Dispositivos e usuários conectados                     |
| GET    | `/admin/status`        | admin, supervisor | Servidor, banco, conexões e movimento do dia           |

### Tempos de atendimento (`GET /admin/service-times`)

Considera atendimentos **finalizados** no período (pela hora da finalização) e ausências (pela hora
da chamada). Tempo de atendimento = da chamada até a finalização, em segundos.

```json
{
  "byAttendant": [
    {
      "_id": "<id do usuário>", "name": "Ana", "role": "attendant", "location": "Guichê 2",
      "attended": 12, "absent": 1,
      "totalService": 5400, "avgService": 450, "minService": 120, "maxService": 1100
    }
  ],
  "tickets": [ /* só com attendantId: cada atendimento com waitSeconds e serviceSeconds */ ]
}
```

## Usuários

| Método | Rota               | Acesso | Descrição                    |
| ------ | ------------------ | ------ | ---------------------------- |
| GET    | `/users/directory` | logado | Equipe (sem dados de acesso) |
| GET    | `/users`           | admin  | Lista usuários               |
| POST   | `/users`           | admin  | Cria usuário                 |
| PUT    | `/users/:id`       | admin  | Atualiza (senha opcional)    |
| DELETE | `/users/:id`       | admin  | Remove usuário               |

Campos do usuário: `name`, `username`, `password` (mín. 6 caracteres), `role`
(`admin` | `supervisor` | `attendant` | `doctor`), `locationType` (`Guichê` | `Consultório` | `Sala`),
`locationNumber` (até 3 dígitos) e `active`. O local é enviado junto com a senha chamada e
exibido/anunciado no painel da TV.

---

## WebSocket (Socket.IO)

O servidor é a única fonte dos eventos; os clientes apenas se identificam e escutam.

### Cliente se identifica

```javascript
// Web: io(URL, { withCredentials: true }) envia o cookie da sessão e identifica o usuário
socket.emit('identify', { type: 'attendant' | 'acionador' | 'panel' | 'totem' | 'customer' });

// Agente de impressão (precisa do PRINT_AGENT_TOKEN, se configurado no backend)
socket.emit('identify', { type: 'printer', printerToken: '...' });
```

### Eventos emitidos pelo servidor

```javascript
socket.on('ticket_called', (ticket) => {}); // senha chamada/rechamada (mesmo formato de /tickets/call)
socket.on('queue_update', (queue) => {}); // fila completa, igual a GET /tickets/queue
socket.on('ticket_status_update', ({ ticketId, status }) => {}); // mudança de status de uma senha
socket.on('print_ticket', (ticket, ack) => {}); // só para impressoras; responder ack({ ok })
socket.on('new_day', () => {}); // filas reiniciadas à meia-noite
```
