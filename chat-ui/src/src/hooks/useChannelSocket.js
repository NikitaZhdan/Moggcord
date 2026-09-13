import { useCallback, useEffect, useRef, useState } from 'react'
import { getChannelMessages } from '../api/channels'
import { useUserDirectory } from '../context/UserDirectoryContext'
import { useSocketPool, STATUS } from '../context/SocketPoolContext'

export { STATUS }

// Инкапсулирует: загрузку истории по REST + realtime-обновления для одного
// выбранного канала. Физическое соединение теперь общее (см. SocketPoolContext) —
// этот хук лишь подписывается на нужный channelId и фильтрует то, что ему интересно
// (сообщения, тайпинг). События call.* обрабатывает CallContext отдельной подпиской
// на тот же канал — оба подписчика получают все сообщения независимо друг от друга.
export function useChannelSocket(channelId, currentUser) {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState(STATUS.IDLE)
  const [typingUsers, setTypingUsers] = useState(new Map()) // uuid -> username
  const [loadError, setLoadError] = useState(null)

  const typingTimeoutRef = useRef(null)
  const { learn, getName } = useUserDirectory()
  const pool = useSocketPool()

  useEffect(() => {
    if (!channelId) return

    let cancelled = false
    setMessages([])
    setTypingUsers(new Map())
    setLoadError(null)

    // 1. Подтягиваем историю сообщений по REST.
    getChannelMessages(channelId, { limit: 50 })
      .then((history) => {
        if (!cancelled) setMessages(history)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })

    // 2. Подписываемся на общий сокет этого канала из пула.
    const unsubscribe = pool.subscribe(channelId, {
      onStatus: (s) => setStatus(s),
      onMessage: (payload) => {
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
      },
    })

    return () => {
      cancelled = true
      unsubscribe()
      clearTimeout(typingTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, pool])

  const send = useCallback((payload) => pool.send(channelId, payload), [pool, channelId])

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
