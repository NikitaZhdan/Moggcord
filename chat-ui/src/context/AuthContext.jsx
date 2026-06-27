import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { TOKEN_STORAGE_KEY } from '../config'
import { decodeJwt, isTokenExpired } from '../utils/jwt'

const AuthContext = createContext(null)

function userFromToken(token) {
  if (!token) return null
  const payload = decodeJwt(token)
  if (!payload || isTokenExpired(payload)) return null

  // Java-сервис кладёт имя пользователя в "sub", а его UUID — в кастомный claim "uid".
  return {
    username: payload.sub,
    uuid: payload.uid,
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY))

  // ВАЖНО: user вычисляется синхронно из token в том же рендере, а не через
  // useEffect. Раньше user жил в отдельном useState и обновлялся эффектом —
  // из-за этого после login() происходил один лишний тик рендера, в котором
  // token уже новый, а user ещё старый (null). navigate('/') успевал
  // отработать раньше, чем user обновлялся, и ProtectedRoute тут же
  // редиректил обратно на /login. useMemo пересчитывает user сразу при
  // изменении token — без задержки.
  const user = useMemo(() => userFromToken(token), [token])

  const login = useCallback((newToken) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken)
    setToken(newToken)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [token, user, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth должен использоваться внутри <AuthProvider>')
  return ctx
}
