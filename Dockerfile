FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY lib ./lib
COPY public ./public
COPY server.js ./server.js

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
ENV PUBLIC_APP=1

EXPOSE 4173

CMD ["npm", "start"]
