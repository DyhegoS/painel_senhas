FROM node:18-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev && chown -R node:node /app

COPY --chown=node:node . .

EXPOSE 5000

USER node

CMD ["node", "src/server.js"]
