# ---- Stage 1: build ---------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Адреса бэкендов "запекаются" в статические JS-файлы на этапе сборки —
# поэтому передаём их как build-args из docker-compose.
ARG VITE_AUTH_API_URL=http://localhost:8080
ARG VITE_CHAT_API_URL=http://localhost:8000
ARG VITE_CHAT_WS_URL=ws://localhost:8000

ENV VITE_AUTH_API_URL=$VITE_AUTH_API_URL
ENV VITE_CHAT_API_URL=$VITE_CHAT_API_URL
ENV VITE_CHAT_WS_URL=$VITE_CHAT_WS_URL

RUN npm run build

# ---- Stage 2: serve static files with nginx ----------------------------
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
