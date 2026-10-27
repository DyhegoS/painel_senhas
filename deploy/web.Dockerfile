# Imagem web de produção: compila o painel do atendente e o painel da TV e os serve pelo nginx,
# que também encaminha /api e /socket.io para o backend.
# Construída a partir da raiz do projeto (veja docker-compose.prod.yml).

FROM node:22-alpine AS attendant
WORKDIR /app
COPY web-attendant/package*.json ./
RUN npm ci
COPY web-attendant/ ./
RUN npm run build

FROM node:22-alpine AS panel
WORKDIR /app
COPY web-panel/package*.json ./
RUN npm ci
COPY web-panel/ ./
ARG REACT_APP_PLACE_NAME=""
ARG REACT_APP_LOGO_URL=""
ARG REACT_APP_TIMEZONE="America/Sao_Paulo"
# Painel da TV publicado em /painel/
ENV PUBLIC_URL=/painel \
    REACT_APP_PLACE_NAME=$REACT_APP_PLACE_NAME \
    REACT_APP_LOGO_URL=$REACT_APP_LOGO_URL \
    REACT_APP_TIMEZONE=$REACT_APP_TIMEZONE
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=attendant /app/build /usr/share/nginx/html
COPY --from=panel /app/build /usr/share/nginx/html/painel
