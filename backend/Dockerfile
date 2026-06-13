FROM node:22-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY src/ ./src/
COPY db/init.sql ./db/init.sql

EXPOSE 3000

CMD ["node", "src/index.js"]
