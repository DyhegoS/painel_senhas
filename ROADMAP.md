# 🚀 ROADMAP - Sistema de Painel de Senhas

## ✅ v1.0.0 - MVP

### Backend

- [x] API REST com Express
- [x] MongoDB para persistência
- [x] WebSocket para comunicação real-time
- [x] Gerenciamento de tipos de atendimento
- [x] Geração de senhas sequenciais
- [x] Controle de fila
- [x] Status de senhas (waiting, called, attended, cancelled)

### Mobile

- [x] App React Native base
- [x] Seleção de tipo de atendimento
- [x] Geração de senha
- [x] Visualização de posição na fila
- [x] Atualização em tempo real

### Web Atendente

- [x] Interface para chamar senhas
- [x] Visualização de fila
- [x] Finalizar atendimento
- [x] Histórico recente

### Painel TV

- [x] Exibição de senha atual
- [x] Próximas senhas (fila)
- [x] Histórico de chamadas
- [x] Design responsivo

---

## ✅ v1.1.0 - SEGURANÇA E AUTENTICAÇÃO

### Backend

- [x] Autenticação JWT para atendentes (sessão em cookie httpOnly)
- [x] Login de funcionários
- [x] Roles/Permissions (Administrador, Supervisor, Atendente, Médico)
- [x] Hash de senhas (bcrypt)
- [x] Rate limiting (login e geração de senhas)
- [x] CORS refinado (`CORS_ORIGIN`)
- [x] Validação de entrada (campos permitidos, ids, transições de status)
- [ ] Logs de auditoria (hoje só há log no console para zerar filas)

### Frontend

- [x] Tela de login (Atendente)
- [x] Gerenciamento de sessão
- [x] Logout
- [x] Proteção de rotas (abas por perfil)

### Database

- [x] Modelo de Usuário
- [ ] Tabela de logs de auditoria

---

## ✅ v1.2.0 - ANALYTICS E RELATÓRIOS

### Backend

- [x] Cálculo de tempo médio de espera
- [x] Cálculo de tempo médio de atendimento
- [x] Taxa de abandono (pacientes ausentes)
- [x] Pico de horário
- [x] Endpoint de relatórios

### Web Admin

- [x] Dashboard com gráficos (horários de pico)
- [x] Relatório por período
- [x] Análise por serviço
- [x] Performance de atendentes (aba Tempos de atendimento)
- [x] Exportar para CSV
- [ ] Exportar para PDF

### Features

- [x] Filtragem por data
- [x] Filtragem por atendente
- [ ] Filtragem por serviço (hoje o relatório mostra todos os serviços lado a lado)
- [ ] Comparação de períodos

---

## 👥 v1.3.0 - GESTÃO DE RECURSOS HUMANOS (parcial)

### Backend

- [x] Local de atendimento (Guichê/Consultório/Sala + número) no cadastro do usuário
- [x] Usuários conectados e quem está em atendimento agora
- [x] Histórico de atendimentos por pessoa
- [ ] Status de pausa do atendente
- [ ] Modelo de Guichê/Sala independente do usuário

### Web Admin

- [x] Tela de gerenciamento de usuários
- [x] Equipe cadastrada
- [x] Performance individual (tempos de atendimento)
- [ ] Atribuição de turnos
- [ ] Disponibilidade

### Features

- [ ] Chamar "próximo guichê livre"
- [ ] Priorização por atendente menos ocupado
- [ ] Pausa automática

---

## 🎯 v1.4.0 - PRIORIZAÇÃO AVANÇADA (parcial)

### Backend

- [x] Prioridade por tipo de atendimento
- [x] Atendimento preferencial (80+ antes de preferencial, antes de normal)
- [x] Fila com múltiplas prioridades ("Qualquer fila" no acionador)
- [ ] Senioridade de cliente (VIP, regular, novo)

### Mobile

- [x] Botões com cor por prioridade (80+, preferencial, normal)
- [ ] Dados de perfil do cliente
- [ ] Histórico de atendimentos

### Web Atendente

- [ ] Badge de prioridade visual
- [ ] Filtrar fila por prioridade

---

## ✅ IMPLEMENTADO FORA DO ROADMAP ORIGINAL

### Atendimento

- [x] Acionador de senhas em janela própria, com chamada pelo número e rechamada
- [x] Cronômetro do atendimento no acionador
- [x] Perfil Supervisor (só consulta: relatórios, equipe, conectados e status)
- [x] Zerar filas manualmente, com reinício da numeração
- [x] Reinício automático das filas e da numeração à meia-noite

### Painel TV

- [x] Anúncio por voz (senha, letras, números e local)
- [x] Som sempre ativo, sem botão
- [x] Vários painéis sincronizados (restaura a tela ao abrir ou reconectar)
- [x] Relógio pela hora do servidor
- [x] Nome do local e logotipo configuráveis

### Totem

- [x] Impressão em impressora térmica (agente de impressão em Linux/Raspberry Pi)
- [x] APK Android em modo totem, com tela de ajustes protegida por PIN
- [x] Volta sozinho para a escolha de serviço após 10 segundos
- [x] Token do totem e da impressora

### Infraestrutura

- [x] Testes automatizados do backend
- [x] Deploy de produção com Docker, nginx e backup
- [x] Status do sistema (servidor, banco, dispositivos conectados)

---

## 🔔 v1.5.0 - NOTIFICAÇÕES

### Backend

- [ ] Email para confirmar senha
- [ ] SMS com número da senha
- [ ] Push notification para mobile

### Mobile

- [ ] Notificação quando próxima na fila
- [ ] Notificação quando chamada
- [ ] Som/vibração

### Integrações

- [ ] Twilio (SMS)
- [ ] SendGrid (Email)
- [ ] Firebase Cloud Messaging

---

## 🏢 v2.0.0 - MULTI-UNIDADE

### Backend

- [ ] Suporte a múltiplas localizações
- [ ] Dados isolados por unidade
- [ ] Sincronização entre unidades

### Web Admin

- [ ] Dashboard centralizado
- [ ] Comparação entre unidades
- [ ] Gestão de múltiplas sedes

### Features

- [ ] Transferência de atendimentos entre unidades
- [ ] Relatório consolidado

---

## 💳 v2.1.0 - PAGAMENTOS (Futuro)

### Backend

- [ ] Modelo de Plano
- [ ] Modelo de Subscription
- [ ] Integração com Stripe/PayPal

### Web Admin

- [ ] Dashboard de faturamento
- [ ] Gerenciamento de planos
- [ ] Histórico de pagamentos

---

## 🎨 v2.2.0 - CUSTOMIZAÇÃO

### Backend

- [ ] Configurações por unidade (cores, logo, textos)
- [ ] Temas customizáveis

### Web

- [ ] Editor de temas (light/dark)
- [ ] Customização de cores
- [ ] Upload de logo

---

## 📱 v2.3.0 - APP AVANÇADO

### Mobile

- [ ] Histórico de senhas do cliente
- [ ] Tempo estimado de espera
- [ ] Chat com atendente
- [ ] Feedback de atendimento (rating)
- [ ] Map de localizações

### Backend

- [ ] Cálculo de ETA
- [ ] Sistema de feedback
- [ ] Chat realtime

---

## 🤖 v3.0.0 - IA E AUTOMAÇÃO

### Backend

- [ ] IA para prever tempo de espera
- [ ] Chatbot para dúvidas
- [ ] Recomendação de melhor horário

### Mobile

- [ ] Sugestão de horários com menos fila
- [ ] Chat com bot

---

## 🌍 INTEGRAÇÕES FUTURAS

- [ ] **HIS/ERP**: Integração com sistemas hospitalares
- [ ] **Calendário**: Google Calendar, Outlook
- [ ] **Vídeo**: Telemedicina para alguns atendimentos
- [ ] **QR Code**: Gerar QR code da senha
- [ ] **Redes Sociais**: Compartilhar informações

---

## 📌 PRIORIDADES

### Concluído

1. ✅ MVP funcional
2. ✅ Autenticação e segurança
3. ✅ Relatórios e tempos de atendimento
4. ✅ Prioridade entre filas

### Curto Prazo (sugestão)

1. Logs de auditoria (quem criou/alterou usuários, zerou filas etc.)
2. Pausa do atendente e badge de prioridade no acionador
3. Filtro por serviço e comparação de períodos nos relatórios

### Médio Prazo

1. Gestão de turnos e guichês
2. Notificações
3. Exportação em PDF

### Longo Prazo (3+ meses)

1. Multi-unidade
2. Pagamentos
3. IA/Automação

---

## 📝 NOTAS

- Cada versão deve incluir testes
- Compatibilidade com versões anteriores
- Documentação de mudanças
- Plano de migração de dados

---

**Última atualização:** 2026-10-27
