// Простой клиентский декодер JWT (без проверки подписи — она происходит на бэкенде).
// Нужен, чтобы достать из токена uid и username и не запрашивать их отдельно.

export function decodeJwt(token) {
  if (!token) return null

  try {
    const payloadPart = token.split('.')[1]
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    )
    return JSON.parse(json)
  } catch (err) {
    console.error('Не удалось разобрать JWT:', err)
    return null
  }
}

export function isTokenExpired(payload) {
  if (!payload?.exp) return false
  return Date.now() >= payload.exp * 1000
}
