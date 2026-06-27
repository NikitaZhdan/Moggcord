import { authClient } from './authClient'

// Реальные пути контроллера AuthController в репозитории AuthorizationService —
// БЕЗ префикса /auth (несмотря на условие задачи), и ответ — обычный текст,
// а не JSON:
//   POST /api/v1/signUp  -> "Successfully registered!"
//   POST /api/v1/signIn  -> "Successfully logged in! JWT: <token>"
// Никаких изменений в Java-коде это не требует — подстраиваемся под то,
// что реально отдаёт сервис.

export async function signUp({ email, username, password }) {
  const { data } = await authClient.post('/api/v1/signUp', {
    email,
    username,
    password,
  })
  return data // обычная строка, например "Successfully registered!"
}

// Текущая реализация logInUser на бэкенде требует совпадения и email, и username, и password.
export async function signIn({ email, username, password }) {
  const { data } = await authClient.post('/api/v1/signIn', {
    email,
    username,
    password,
  })
  return extractToken(data)
}

// Бэкенд склеивает префикс и токен в одну строку: "Successfully logged in! JWT: eyJ..."
// Достаём сам токен регуляркой по разделителю "JWT: ".
function extractToken(rawResponse) {
  if (typeof rawResponse !== 'string') {
    throw new Error('Неожиданный формат ответа сервиса авторизации')
  }
  const match = rawResponse.match(/JWT:\s*(\S+)/)
  if (!match) {
    throw new Error(`Не удалось найти токен в ответе сервера: "${rawResponse}"`)
  }
  return match[1]
}
