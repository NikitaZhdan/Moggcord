import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { CHAT_WS_URL } from '../config'
import { useAuth } from './AuthContext'

export const STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  OPEN: 'open',
  CLOSED: 'closed',
  ERROR: 'error',
}

// Раньше useChannelSocket сам открывал WebSocket под выбранный канал — этого
// достаточно для сообщений, но недостаточно для звонков: чтобы "услышать"
// call.incoming, нужно быть подключённым к каналу, даже если он сейчас не
// открыт в UI. Поэтому соединение переехало в общий пул: один физический
// сокет на канал, к которому может подписаться сколько угодно потребителей
// (лента сообщений, индикатор набора текста, звонки) — каждый получает копию
// входящих сообщений и не мешает остальным.
const SocketPoolContext = createContext(null)

export function SocketPoolProvider({ children }) {
  const { token } = useAuth()
  const tokenRef = useRef(token)
  tokenRef.current = token

  // channelId -> { socket, status, listeners: Set<{ onMessage?, onStatus? }> }
  const poolRef = useRef(new Map())

  const notifyStatus = useCallback((channelId, status) => {
    const entry = poolRef.current.get(channelId)
    if (!entry) return
    entry.status = status
    entry.listeners.forEach((listener) => listener.onStatus?.(status))
  }, [])

  const closeConnection = useCallback((channelId) => {
    const entry = poolRef.current.get(channelId)
    if (!entry) return
    entry.socket?.close()
    poolRef.current.delete(channelId)
  }, [])

  const openConnection = useCallback(
    (channelId) => {
      if (!tokenRef.current || poolRef.current.has(channelId)) return

      const entry = { socket: null, status: STATUS.CONNECTING, listeners: new Set() }
      poolRef.current.set(channelId, entry)

      const url = `${CHAT_WS_URL}/ws/channels/${channelId}?token=${encodeURIComponent(tokenRef.current)}`
      const socket = new WebSocket(url)
      entry.socket = socket

      socket.onopen = () => notifyStatus(channelId, STATUS.OPEN)
      socket.onclose = () => notifyStatus(channelId, STATUS.CLOSED)
      socket.onerror = () => notifyStatus(channelId, STATUS.ERROR)
      socket.onmessage = (event) => {
        let payload
        try {
          payload = JSON.parse(event.data)
        } catch {
          return
        }
        poolRef.current.get(channelId)?.listeners.forEach((listener) => listener.onMessage?.(payload))
      }
    },
    [notifyStatus]
  )

  // Держим открытыми ровно сокеты для переданного набора каналов пользователя
  // (вызывается из CallProvider со списком всех его каналов) — лишние закрываем.
  const ensureChannels = useCallback(
    (channelIds) => {
      const wanted = new Set(channelIds)
      for (const channelId of Array.from(poolRef.current.keys())) {
        if (!wanted.has(channelId)) closeConnection(channelId)
      }
      wanted.forEach(openConnection)
    },
    [openConnection, closeConnection]
  )

  const subscribe = useCallback(
    (channelId, listener) => {
      if (!channelId) return () => {}
      openConnection(channelId)
      const entry = poolRef.current.get(channelId)
      entry.listeners.add(listener)
      listener.onStatus?.(entry.status)

      return () => {
        poolRef.current.get(channelId)?.listeners.delete(listener)
      }
    },
    [openConnection]
  )

  const send = useCallback((channelId, payload) => {
    const entry = poolRef.current.get(channelId)
    if (entry?.socket && entry.socket.readyState === WebSocket.OPEN) {
      entry.socket.send(JSON.stringify(payload))
    }
  }, [])

  const getStatus = useCallback((channelId) => poolRef.current.get(channelId)?.status || STATUS.IDLE, [])

  // Разлогин или размонтирование приложения — закрываем все соединения.
  useEffect(() => {
    if (!token) {
      Array.from(poolRef.current.keys()).forEach(closeConnection)
    }
  }, [token, closeConnection])

  useEffect(() => {
    return () => {
      Array.from(poolRef.current.keys()).forEach(closeConnection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = { ensureChannels, subscribe, send, getStatus }

  return <SocketPoolContext.Provider value={value}>{children}</SocketPoolContext.Provider>
}

export function useSocketPool() {
  const ctx = useContext(SocketPoolContext)
  if (!ctx) throw new Error('useSocketPool должен использоваться внутри <SocketPoolProvider>')
  return ctx
}
