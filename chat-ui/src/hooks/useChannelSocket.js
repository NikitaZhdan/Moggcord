import { useCallback, useEffect, useRef, useState } from 'react'
import { CHAT_WS_URL } from '../config'
import { getChannelMessages } from '../api/channels'
import { useUserDirectory } from '../context/UserDirectoryContext'

export const STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  OPEN: 'open',
  CLOSED: 'closed',
  ERROR: 'error',
}

// Инкапсулирует: загрузку истории по REST + realtime-обновления по WebSocket
// для одного выбранного канала. При смене channelId пересоздаёт соединение.
export function useChannelSocket(channelId, token, currentUser) {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState(STATUS.IDLE)
  const [typingUsers, setTypingUsers] = useState(new Map()) // uuid -> username
  const [loadError, setLoadError] = useState(null)

  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const { learn, getName } = useUserDirectory()

  useEffect(() => {
    if (!channelId || !token) return

    let cancelled = false
    setMessages([])
    setTypingUsers(new Map())
    setLoadError(null)
    setStatus(STATUS.CONNECTING)

    // 1. Подтягиваем историю сообщений по REST.
    getChannelMessages(channelId, { limit: 50 })
      .then((history) => {
        if (!cancelled) setMessages(history)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })

    // 2. Открываем WebSocket для realtime-обновлений этого канала.
    const url = `${CHAT_WS_URL}/ws/channels/${channelId}?token=${encodeURIComponent(token)}`
    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => setStatus(STATUS.OPEN)
    socket.onclose = () => setStatus(STATUS.CLOSED)
    socket.onerror = () => setStatus(STATUS.ERROR)

    socket.onmessage = (event) => {
      let payload
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      switch (payload.type) {
        case 'message.new': {
          learn(payload.author_id, payload.username)
          setMessages((prev) => [...prev, payload])
          break
        }
        case 'message.edited': {
          setMessages((prev) =>
            prev.map((m) => (m.id === payload.id ? { ...m, content: payload.content, edited_at: payload.edited_at } : m))
          )
          break
        }
        case 'message.deleted': {
          setMessages((prev) => prev.filter((m) => m.id !== payload.id))
          break
        }
        case 'typing': {
          learn(payload.user_id, payload.username)
          setTypingUsers((prev) => {
            const next = new Map(prev)
            if (payload.user_id === currentUser?.uuid) return prev
            if (payload.is_typing) next.set(payload.user_id, payload.username)
            else next.delete(payload.user_id)
            return next
          })
          break
        }
        case 'user_joined':
        case 'user_left': {
          learn(payload.user_id, payload.username)
          break
        }
        case 'error': {
          setLoadError(payload.detail)
          break
        }
        default:
          break
      }
    }

    return () => {
      cancelled = true
      socket.close()
      socketRef.current = null
      clearTimeout(typingTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, token])

  const send = useCallback((payload) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  }, [])

  const sendMessage = useCallback((content) => send({ type: 'message.send', content }), [send])

  const editMessage = useCallback(
    (messageId, content) => send({ type: 'message.edit', message_id: messageId, content }),
    [send]
  )

  const deleteMessage = useCallback((messageId) => send({ type: 'message.delete', message_id: messageId }), [send])

  const notifyTyping = useCallback(() => {
    send({ type: 'typing.start' })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => send({ type: 'typing.stop' }), 2000)
  }, [send])

  const resolvedTyping = Array.from(typingUsers.entries()).map(([uuid, username]) => ({
    uuid,
    name: getName(uuid, username),
  }))

  return {
    messages,
    status,
    loadError,
    typingUsers: resolvedTyping,
    sendMessage,
    editMessage,
    deleteMessage,
    notifyTyping,
  }
}
