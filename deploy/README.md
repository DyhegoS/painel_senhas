# Produção em servidor Ubuntu (rede local)

Tudo roda em Docker, num único servidor da rede local:

| Container | Função | Exposto |
| --- | --- | --- |
| `web` (nginx) | Painel do atendente, painel da TV e proxy para o backend | porta 80 |
| `backend` | API e tempo real (Socket.IO) | só na rede interna |
| `mongodb` | Banco de dados (volume `mongodb_data`) | só na rede interna |

Endereços, trocando `<IP>` pelo IP do servidor:

- `http://<IP>/`: atendentes, médicos e administrador
- `http://<IP>/painel/`: TV da sala de espera
- `http://<IP>`: endereço do backend para o totem e o agente de impressão (sem `:5000`)

## 1. Preparar o servidor

Testado com Ubuntu Server 22.04 e 24.04.

**IP fixo.** Os totens, a impressora e as TVs acessam o servidor pelo IP, então ele não pode
mudar. A forma mais simples é reservar o IP no roteador (DHCP estático pelo MAC do servidor).

**Docker:**

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # depois saia e entre de novo na sessão
docker compose version          # deve mostrar a versão
```

**Firewall** (se usar o `ufw`):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
```

> O Docker publica a porta 80 por conta própria, mas mantenha o `ufw` ativo para o resto.

## 2. Baixar e configurar

```bash
git clone git@github.com:DyhegoS/painel_senhas.git ~/painel_senhas
cd ~/painel_senhas
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Preencha pelo menos:

- `JWT_SECRET`: gere com `openssl rand -hex 32`
- `ADMIN_PASSWORD`: senha do primeiro administrador
- `PRINT_AGENT_TOKEN`: gere com `openssl rand -hex 16` (o mesmo valor vai no Raspberry Pi)
- `PLACE_NAME`: nome que aparece no painel da TV

**Confira se a CPU suporta o MongoDB 7:**

```bash
grep -c avx /proc/cpuinfo
```

Se o resultado for `0` (máquina antiga), coloque `MONGO_IMAGE=mongo:4.4` no `deploy/.env`.

## 3. Subir

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env up -d --build
```

O primeiro build leva alguns minutos. Acompanhe:

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env ps
docker compose -f docker-compose.prod.yml --env-file deploy/.env logs -f backend
```

Os três containers devem ficar `healthy`/`running`. Teste: `curl http://localhost/api/health`.

Os containers voltam sozinhos depois de reiniciar o servidor (`restart: unless-stopped`).

> Dica: para não repetir os parâmetros, crie um alias no `~/.bashrc`:
> `alias painel='docker compose -f ~/painel_senhas/docker-compose.prod.yml --env-file ~/painel_senhas/deploy/.env'`
> e use `painel ps`, `painel logs -f`, `painel up -d --build`.

## 4. Primeiro acesso

1. Crie os tipos de atendimento (Exame, Consulta, preferenciais…). Sem eles, o totem não tem o
   que mostrar. O comando só age se o banco ainda não tiver serviços e não cria senhas de teste:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file deploy/.env exec backend node seed.js --services-only
   ```

2. Abra `http://<IP>/` e entre com `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
3. **Troque a senha do administrador** e cadastre os usuários (atendentes, médicos e locais).

## 5. Ligar os outros equipamentos

**TV:** abra `http://<IP>/painel/` em tela cheia (F11) e clique em **Ativar som e voz**.
Os navegadores só tocam áudio depois de um clique. Para um computador dedicado, use o Chrome em
modo quiosque com áudio liberado:

```bash
google-chrome --kiosk --autoplay-policy=no-user-gesture-required http://<IP>/painel/
```

**Totem (APK Android):** instale o APK e, na primeira abertura, informe o endereço `<IP>` e o
`TOTEM_TOKEN` (se configurado) na tela de ajustes do app. Veja [mobile/README.md](../mobile/README.md).

**Agente de impressão (Raspberry Pi):** em `print-agent/painel-print.service`:

```
Environment=BACKEND_URL=http://<IP>
Environment=PRINT_AGENT_TOKEN=<mesmo valor do deploy/.env>
```

Depois rode `sudo systemctl daemon-reload && sudo systemctl restart painel-print`.

## 6. Atualizar para uma nova versão

```bash
cd ~/painel_senhas
./deploy/backup.sh
git pull
docker compose -f docker-compose.prod.yml --env-file deploy/.env up -d --build
```

O banco fica no volume `mongodb_data` e não é afetado pelo rebuild.

## 7. Backup

```bash
./deploy/backup.sh                    # salva em ~/backups/painel_senhas (mantém os 14 últimos)
```

Backup automático todo dia às 23h (`crontab -e`):

```
0 23 * * * /home/<usuario>/painel_senhas/deploy/backup.sh >> /home/<usuario>/backups/backup.log 2>&1
```

Copie os backups para fora do servidor de vez em quando (pendrive, outro computador).

**Restaurar** (substitui os dados atuais):

```bash
docker compose -f docker-compose.prod.yml --env-file deploy/.env \
  exec -T mongodb mongorestore --archive --gzip --drop < ~/backups/painel_senhas/<arquivo>.archive.gz
```

## Problemas comuns

| Sintoma | O que verificar |
| --- | --- |
| `backend` reiniciando sem parar | `logs backend`. Sem `JWT_SECRET` no `deploy/.env` ele não sobe em produção |
| `mongodb` reiniciando, log com "illegal instruction" | CPU sem AVX: use `MONGO_IMAGE=mongo:4.4` |
| Página abre mas não loga / não atualiza | Abra pelo IP do servidor (não `localhost` de outra máquina) e confira `curl http://<IP>/api/health` |
| TV não fala | Clique em **Ativar som e voz** depois de cada recarga, ou use o modo quiosque acima |
| Totem não gera senha | Nos ajustes do totem: endereço sem `:5000` e `TOTEM_TOKEN` igual ao do servidor |
| Alterei `PLACE_NAME`/`LOGO_URL` e nada mudou | Esses valores entram no build: rode `up -d --build` |
| Porta 80 ocupada | Outro serviço (apache/nginx) no servidor: pare-o ou use `HTTP_PORT=8080` |
