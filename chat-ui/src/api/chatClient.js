import axios from 'axios'
import { CHAT_API_URL, TOKEN_STORAGE_KEY } from '../config'

export const chatClient = axios.create({
  baseURL: CHAT_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Перед каждым запросом подставляем Bearer-токен, полученный от Java auth-сервиса.
chatClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

chatClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail || error.message
    return Promise.reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)))
  }
)
