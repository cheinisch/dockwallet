FROM node:22-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY src/ ./src/
COPY db/migrations/ ./db/migrations/

EXPOSE 3000

CMD ["node", "src/index.js"]
