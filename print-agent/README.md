# Agente de impressão

Roda no computador do totem (Raspberry Pi ou PC com Debian) ligado por USB à impressora
térmica Epson TM-T20X. Conecta ao backend via WebSocket e imprime cada senha gerada no totem.

```
Totem (app) ──POST /api/tickets/generate──▶ Backend ──WebSocket──▶ Agente ──USB──▶ TM-T20X
```

O app do totem não fala com o agente: os dois se conectam ao backend, que repassa cada senha
para a impressora e espera a confirmação (até ~8 s).

## Instalação (Raspberry Pi OS ou Debian 12/13)

1. Instale o Node.js (18 ou superior):
   ```bash
   sudo apt install -y nodejs npm
   node -v                   # Debian 13 já traz o Node 20
   ```
   Se a versão do repositório for mais antiga que 18, use o NodeSource:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. Crie o usuário do serviço (com acesso à impressora pelo grupo `lp`), copie esta pasta para
   `/opt/print-agent` e instale as dependências:
   ```bash
   sudo useradd --system --no-create-home --groups lp painel
   sudo cp -r print-agent /opt/print-agent
   cd /opt/print-agent && sudo npm install
   ```
3. Confira se a impressora aparece:
   ```bash
   ls -l /dev/usb/lp*        # deve listar /dev/usb/lp0
   ```
   Se `/dev/usb/lp0` não aparecer, a TM-T20X pode estar em modo USB "Vendor Class".
   Troque para "Printer Class" no utilitário da Epson (TM-T20X Utility) ou pelas DIP switches.
   Se você tiver CUPS instalado, não adicione a TM-T20X nele: o agente escreve direto no dispositivo.
4. Teste a impressão (não precisa do backend):
   ```bash
   sudo npm run test-print
   ```
   Para testar sem a impressora, grave em um arquivo:
   ```bash
   PRINTER_DEVICE=/tmp/impressora-falsa.bin npm run test-print && cat /tmp/impressora-falsa.bin
   ```
5. Edite `painel-print.service` (`BACKEND_URL` e `PRINT_AGENT_TOKEN`) e instale como serviço
   para iniciar junto com o computador:
   ```bash
   sudo cp painel-print.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now painel-print
   journalctl -u painel-print -f   # acompanhar os logs
   ```

Se instalar em outra pasta ou com outro usuário, ajuste `WorkingDirectory=` e `User=` no
serviço. O systemd só aceita caminho absoluto em `WorkingDirectory=` (nada de `~`).

## Configuração (variáveis de ambiente)

| Variável         | Padrão                         | Descrição                         |
| ---------------- | ------------------------------ | --------------------------------- |
| `BACKEND_URL`    | _(obrigatório)_                | Endereço do servidor, ex.: `http://192.168.0.10` (com o deploy em produção, sem porta; em desenvolvimento, `:5000`) |
| `PRINTER_DEVICE` | `/dev/usb/lp0`                 | Dispositivo da impressora         |
| `PRINT_HEADER`   | `PAINEL DE SENHAS`             | Título no topo do papel           |
| `PRINT_FOOTER`   | `Aguarde ser chamado no painel`| Mensagem no rodapé                |
| `PRINT_AGENT_TOKEN` | _(vazio)_                    | Igual ao `PRINT_AGENT_TOKEN` do backend; sem ele o backend recusa a impressora quando o token está configurado |

Para alterar, edite as linhas `Environment=` em `/etc/systemd/system/painel-print.service`
e rode `sudo systemctl daemon-reload && sudo systemctl restart painel-print`.

Confira o que o serviço está usando com `systemctl show painel-print -p Environment`.

## Celular ligado por USB (sem Wi-Fi)

Quando o celular ou tablet do totem fica ligado por cabo USB neste computador, sem Wi-Fi, o
`adb reverse` leva a conexão do app pelo cabo e o `socat` repassa para o servidor:

```
Celular ──USB (adb reverse)──▶ Totem 127.0.0.1:8080 ──socat──▶ Servidor :80
```

1. No celular, ative as **Opções do desenvolvedor** (toque 7 vezes em *Número da versão*) e
   ligue a **Depuração USB**. Se existir, ative também "Desativar tempo limite de autorizações ADB".
2. No totem, instale as ferramentas e autorize o computador:
   ```bash
   sudo apt install -y adb socat
   sudo adb devices          # aceite "Sempre permitir deste computador" no celular
   ```
   Deve aparecer `XXXXXXXX    device`. Lista vazia costuma ser cabo que só carrega ou hub
   que não passa dados; ligue direto no computador.
3. Edite o IP do servidor em `painel-proxy.service` e instale os dois serviços:
   ```bash
   sudo cp painel-proxy.service painel-adb.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now painel-proxy painel-adb
   ```
4. Confira:
   ```bash
   curl -s http://127.0.0.1:8080/api/ -o /dev/null -w '%{http_code}\n'   # qualquer número ≠ 000
   sudo adb reverse --list                                               # tcp:8080 tcp:8080
   ```
5. No app, segure o topo da tela por 3 segundos para abrir os ajustes e use
   `localhost:8080` como endereço do servidor.

Ao conectar o cabo, escolha "Transferência de arquivos" ou "Só carregar" no celular, nunca
"Ancoragem USB". Algumas marcas desligam a Depuração USB sozinhas; se o totem parar de
carregar os serviços, confira isso primeiro.

## Problemas comuns

| Sintoma | Causa provável |
| ------- | -------------- |
| Backend registra `✗ Impressora recusada (token inválido)` | `PRINT_AGENT_TOKEN` diferente do backend (aspas, espaço no fim) ou cópia antiga do agente. O agente mostra "Conectado" mesmo quando é recusado; confira na tela de status do sistema |
| Log mostra `🖨️  Senha impressa`, mas não sai papel | `PRINTER_DEVICE` ainda aponta para um arquivo de teste |
| `✗ Erro ao imprimir ... ENOENT` | Impressora desligada ou fora do modo "Printer Class" |
| `✗ Erro ao imprimir ... EACCES` | Usuário do serviço fora do grupo `lp` |
| `status=200/CHDIR` ou `WorkingDirectory= path is not absolute` | Pasta do serviço não existe ou foi escrita com `~` |
| `xhr poll error` logo após ligar o computador | Rede ainda subindo; o agente reconecta sozinho |
| Tela de status mostra 2 impressoras | Sobrou outro agente rodando (teste manual em outro terminal ou outra máquina); a senha pode ir para o agente errado |
