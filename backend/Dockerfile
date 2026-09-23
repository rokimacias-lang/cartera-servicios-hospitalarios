FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js seed-hospitales.json seed-catalogo.json ./
ENV NODE_ENV=production
EXPOSE 4000
USER node
CMD ["node","server.js"]
