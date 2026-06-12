FROM node:22-alpine AS frontend-build
WORKDIR /build
COPY src/frontend/package.json .
RUN npm install --verbose
COPY src/frontend/ .
RUN npm run build

FROM node:22-alpine AS backend-build
WORKDIR /app
COPY package.json .
RUN npm install --production --verbose
COPY src/backend/ ./src/

FROM nginx:alpine

# Node.js ins finale Image
RUN apk add --no-cache libstdc++
COPY --from=backend-build /usr/local/bin/node /usr/local/bin/node
COPY --from=backend-build /usr/local/lib/node_modules /usr/local/lib/node_modules

# Nginx Config
COPY nginx.conf /etc/nginx/nginx.conf

# Frontend Static Files
COPY --from=frontend-build /build/dist /usr/share/nginx/html

# Backend
COPY --from=backend-build /app /app

# Startscript
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]