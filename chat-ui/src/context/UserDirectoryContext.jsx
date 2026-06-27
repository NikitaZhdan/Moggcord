import { createContext, useCallback, useContext, useMemo, useRef } from 'react'

// Python-сервис чата хранит только author_id (UUID) — у него нет доступа к базе
// пользователей Java-сервиса. Имена пользователей мы узнаём из payload вебсокета
// (поле "username", см. патч websocket/handler.py в README.md) и запоминаем здесь,
// чтобы показывать их и для сообщений, пришедших из REST-истории.

const UserDirectoryContext = createContext(null)

export function UserDirectoryProvider({ children }) {
  const mapRef = useRef(new Map())

  const learn = useCallback((uuid, username) => {
    if (uuid && username) mapRef.current.set(uuid, username)
  }, [])

  const getName = useCallback((uuid, fallbackUsername) => {
    if (fallbackUsername) {
      mapRef.current.set(uuid, fallbackUsername)
      return fallbackUsername
    }
    return mapRef.current.get(uuid) || `user-${String(uuid).slice(0, 6)}`
  }, [])

  const value = useMemo(() => ({ learn, getName }), [learn, getName])

  return <UserDirectoryContext.Provider value={value}>{children}</UserDirectoryContext.Provider>
}

export function useUserDirectory() {
  const ctx = useContext(UserDirectoryContext)
  if (!ctx) throw new Error('useUserDirectory должен использоваться внутри <UserDirectoryProvider>')
  return ctx
}
