// Базовые адреса бэкендов берутся из переменных окружения Vite.
// При сборке Docker-образа они подставляются на этапе build (см. Dockerfile/docker-compose).

export const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8080'
export const CHAT_API_URL = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:8000'
export const CHAT_WS_URL = import.meta.env.VITE_CHAT_WS_URL || 'ws://localhost:8000'

export const TOKEN_STORAGE_KEY = 'dsl_chat_token'
