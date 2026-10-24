# 🎫 Sistema de Painel de Senhas

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-5+-green)](https://www.mongodb.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)

Sistema completo de gerenciamento de fila e atendimento com geração de senhas em tempo real.

> 📍 **Ideal para:** Clínicas, hospitais, farmácias, postos de atendimento, bancos e qualquer local que necessite gerenciar filas de atendimento.

## ✨ Funcionalidades Principais

- 📱 **App Mobile**: Cliente gera senha escolhendo tipo de atendimento
- 👨‍💼 **Web Atendente**: Interface para chamar e finalizar atendimentos
- 📺 **Painel TV**: Exibição pública de senhas em tempo real
- 🔄 **Sincronização em Tempo Real**: Via WebSocket
- 📊 **Geração Sequencial de Senhas**: Por tipo de atendimento (A-001, B-002, etc)
- ⚡ **Performance**: Otimizado para múltiplos usuários simultâneos

## 🏗️ Arquitetura

```
┌─────────────────┐
│   APP MOBILE    │ ← Cliente gera senha
│  (React Native) │
└────────┬────────┘
         │
    ┌────▼──────────────────────┐
    │  BACKEND (Node.js/Express)│
    │  ├─ Gerencia senhas        │
    │  ├─ MongoDB                │
    │  └─ WebSocket Real-time    │
    └────┬───────┬──────┬────────┘
         │       │      │
    ┌────▼─┐ ┌───▼──┐ ┌─▼──────┐
    │ WEB  │ │ TV   │ │ Cliente│
    │ATEND.│ │ PAINEL│ │ Mobile │
    └──────┘ └──────┘ └────────┘
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- MongoDB 5+
- Git

### Instalação Rápida

```bash
# 1. Backend
cd backend
npm install
npm run dev      # Terminal 1

# 2. Web Atendente (novo terminal)
cd web-attendant
npm install
npm start        # Terminal 2

# 3. Painel TV (novo terminal)
cd web-panel
npm install
npm start        # Terminal 3
```

**Acessar em:**

- Backend: http://localhost:5000
- Web Atendente: http://localhost:3000
- Painel TV: http://localhost:3001

## 📚 Documentação

| Documento                            | Descrição                   |
| ------------------------------------ | --------------------------- |
| [INSTALL.md](./INSTALL.md)           | Guia completo de instalação |
| [API.md](./API.md)                   | Documentação de endpoints   |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Detalhes da arquitetura     |
| [ROADMAP.md](./ROADMAP.md)           | Plano de desenvolvimento    |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Guia de contribuição        |

## 📁 Estrutura do Projeto

```
painel_senhas/
├── backend/               # API Node.js + Express
│   ├── src/
│   │   ├── models/       # Modelos MongoDB
│   │   ├── controllers/  # Lógica de negócio
│   │   ├── routes/       # Endpoints
│   │   └── server.js     # Entrada
│   ├── seed.js           # Dados iniciais
│   └── package.json
├── mobile/               # App React Native
│   ├── App.js
│   ├── src/screens/     # Telas
│   └── package.json
├── web-attendant/        # Interface Web (Atendentes)
│   ├── src/
│   └── package.json
├── web-panel/            # Painel TV (Sala de Espera)
│   ├── src/
│   └── package.json
├── docker-compose.yml    # Docker
├── INSTALL.md
├── API.md
├── ARCHITECTURE.md
├── ROADMAP.md
└── LICENSE
```

## 🔄 Fluxo de Funcionamento

```
1️⃣ CLIENTE (Mobile)
   └─ Escolhe tipo de atendimento → Gera senha (ex: A-001)

2️⃣ PAINEL TV
   └─ Cliente vê sua posição na fila

3️⃣ ATENDENTE (Web)
   └─ Clica "Chamar Próximo" → A-001 é chamada

4️⃣ PAINEL TV
   └─ Exibe: "ATENDENDO: A-001" em GRANDE

5️⃣ CLIENTE
   └─ Vê a chamada e se dirigi ao guichê

6️⃣ ATENDENTE
   └─ Clica "Finalizar" → Próximo cliente é processado
```

## 🎯 Casos de Uso

### Clínica de Saúde

```
Serviços:
- Exame (A) → Sala 1
- Consulta (B) → Sala 2
- Vacinação (C) → Sala 3
```

### Farmácia

```
Serviços:
- Receita (A) → Balcão 1
- Venda Livre (B) → Balcão 2
- Consulta Farmacêutico (C) → Sala 1
```

### Banco

```
Serviços:
- Caixa (A) → Guichê 1-3
- Gerência (B) → Sala
- Empréstimos (C) → Guichê 4
```

## 💻 Tecnologias

### Backend

- **Framework**: Express.js
- **Database**: MongoDB
- **Real-time**: Socket.IO
- **Language**: Node.js (JavaScript)

### Frontend

- **Web**: React 18
- **Mobile**: React Native
- **HTTP**: Axios
- **WebSocket**: Socket.IO Client

### DevOps

- **Containerização**: Docker
- **Orquestração**: Docker Compose

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Backend (backend/.env — modelo completo em backend/.env.example)
PORT=5000
MONGODB_URI=mongodb://localhost:27017/painel_senhas
NODE_ENV=development
JWT_SECRET=troque-por-uma-chave-secreta-longa   # obrigatório em produção
ADMIN_PASSWORD=admin123                          # senha do admin criado no 1º start
REPORT_TIMEZONE=America/Sao_Paulo
CORS_ORIGIN=                 # origens liberadas, separadas por vírgula (vazio = todas)
TOTEM_TOKEN=                 # se definido, o totem precisa enviar X-Totem-Token
GENERATE_RATE_LIMIT=30       # senhas por minuto por IP
PRINT_AGENT_TOKEN=           # segredo compartilhado com o print-agent
COOKIE_SECURE=false          # true quando servido por HTTPS
TRUST_PROXY=                 # nº de proxies reversos na frente (ex.: 1)

# MongoDB Atlas (alternativa)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/painel_senhas
```

```env
# Totem (mobile/.env — modelo em mobile/.env.example)
EXPO_PUBLIC_BACKEND_URL=http://<IP do servidor>:5000
EXPO_PUBLIC_TOTEM_TOKEN=     # igual ao TOTEM_TOKEN do backend
```

## 📺 Painel da TV

Vários painéis (em navegadores e computadores diferentes) ficam sincronizados: todos recebem
as chamadas em tempo real e, ao abrir, recarregar ou voltar de uma queda de rede, cada painel
busca no servidor a senha atual, as últimas chamadas e a fila. O relógio usa a hora do servidor.

Variáveis opcionais do `web-panel` (arquivo `web-panel/.env`):

```env
REACT_APP_PLACE_NAME=Clínica Exemplo     # nome no topo do painel
REACT_APP_LOGO_URL=/logo.png             # logotipo
REACT_APP_TIMEZONE=America/Sao_Paulo     # fuso do relógio (padrão: o do computador)
```

### Som sempre ativo

O painel não tem botão de som: ele toca sozinho a cada chamada. Mas **os navegadores bloqueiam
áudio até alguém interagir com a página** — nenhum site consegue burlar isso. Se o som estiver
bloqueado, o painel mostra um aviso e libera no primeiro toque, clique ou tecla (inclusive do
controle remoto). Para nunca precisar disso, libere o autoplay no navegador da TV:

**Chrome / Chromium (recomendado, em modo quiosque):**

```bash
# Linux / Raspberry Pi
chromium-browser --kiosk --autoplay-policy=no-user-gesture-required http://<servidor>:<porta-do-painel>

# Windows (atalho)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --autoplay-policy=no-user-gesture-required http://<servidor>:<porta-do-painel>
```

Feche todas as janelas do Chrome antes de abrir com esses parâmetros (senão ele reaproveita a
janela já aberta e ignora a opção).

**Firefox:** acesse o painel, clique no cadeado da barra de endereço → *Permissões* →
*Reprodução automática* → **Permitir áudio e vídeo** (ou, em `about:config`,
`media.autoplay.default = 0`).

## 🧪 Testando o Sistema

### Via cURL

```bash
# Listar tipos de atendimento
curl http://localhost:5000/api/services

# Gerar uma senha (use o _id de um serviço; inclua -H "X-Totem-Token: ..." se TOTEM_TOKEN estiver definido)
curl -X POST http://localhost:5000/api/tickets/generate \
  -H "Content-Type: application/json" \
  -d '{"serviceTypeId":"ID_AQUI"}'

# Login (a sessão fica no cookie, salvo em cookies.txt)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Chamar a próxima senha de qualquer fila (80+ e preferenciais primeiro)
curl -b cookies.txt -X POST http://localhost:5000/api/tickets/call \
  -H "Content-Type: application/json" -d '{}'
```

## 📊 Tipos de Atendimento Padrão

| Tipo                  | Prefixo | Prioridade      |
| --------------------- | ------- | --------------- |
| Consulta (80+)        | CP      | 1ª (80+)        |
| Exame (80+)           | EP      | 1ª (80+)        |
| Consulta Preferencial | CS      | 2ª preferencial |
| Exame Preferencial    | ES      | 2ª preferencial |
| Consulta              | C       | normal          |
| Agendar Consultas     | AC      | normal          |
| Exame                 | E       | normal          |
| Agendar Exames        | AE      | normal          |

Criados por `npm run seed` (apaga os dados) ou `node backend/seed.js --if-empty` (só se o banco
estiver vazio). Ao chamar "Qualquer fila" no acionador, as filas 80+ são atendidas primeiro,
depois as preferenciais e por fim as normais (Lei 10.048/2000 e Lei 13.466/2017).

## 🐳 Docker

```bash
# Iniciar com Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

## 🔐 Segurança

Versão 1.0.0 é MVP. Para produção, implementar:

- ✅ Autenticação JWT
- ✅ Validação de entrada
- ✅ HTTPS/TLS
- ✅ Rate limiting
- ✅ Logs de auditoria

Ver [ROADMAP.md](./ROADMAP.md) para v1.1.0

## 📈 Performance

- ⚡ WebSocket para atualizações em tempo real
- 📦 Índices no MongoDB para queries rápidas
- 🔄 Cache de tipos de atendimento
- 🎯 Conexões pooled

## 🤝 Contribuindo

Contributions são bem-vindas! Por favor veja [CONTRIBUTING.md](./CONTRIBUTING.md)

```bash
# 1. Fork o repo
# 2. Crie uma branch (git checkout -b feature/AmazingFeature)
# 3. Commit suas mudanças (git commit -m 'Add some AmazingFeature')
# 4. Push para a branch (git push origin feature/AmazingFeature)
# 5. Abra um Pull Request
```

## 📝 Licença

Este projeto é licenciado sob a MIT License - veja [LICENSE](./LICENSE)

## 💬 Suporte

- 📖 Veja [INSTALL.md](./INSTALL.md) para problemas de instalação
- 📚 Consulte [API.md](./API.md) para documentação de endpoints
- 🏗️ Entenda a arquitetura em [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🐛 Reporte bugs em Issues

## 🗺️ Roadmap

Próximas versões planejadas:

- **v1.1.0**: Autenticação e Segurança
- **v1.2.0**: Analytics e Relatórios
- **v1.3.0**: Gestão de RH
- **v2.0.0**: Multi-unidade

Ver [ROADMAP.md](./ROADMAP.md) completo

## 📞 Contato

Dúvidas? Sugestões?

- Abra uma Issue
- Consulte a Documentação
- Verifique Discussões Existentes

---

**Status do Projeto:** ✅ MVP v1.0.0 em Produção

**Última atualização:** 2024-01-01
