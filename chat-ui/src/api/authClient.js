import axios from 'axios'
import { AUTH_API_URL } from '../config'

export const authClient = axios.create({
  baseURL: AUTH_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Превращаем ответ ошибки Spring (ResponseStatusException → ProblemDetail) в человеческое сообщение.
// Spring Boot 3 по умолчанию отдаёт {"detail": "...", "title": "...", "status": ...},
// но на всякий случай проверяем и более старые/нестандартные форматы.
authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.error ||
      (typeof error.response?.data === 'string' ? error.response.data : null) ||
      error.message
    return Promise.reject(new Error(detail))
  }
)
