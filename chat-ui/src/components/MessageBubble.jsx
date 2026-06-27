import { useState } from 'react'
import Avatar from './Avatar'
import { useUserDirectory } from '../context/UserDirectoryContext'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function MessageBubble({ message, isOwn, onEdit, onDelete }) {
  const { getName } = useUserDirectory()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)

  const authorName = isOwn ? 'Вы' : getName(message.author_id, message.username)

  const submitEdit = (e) => {
    e.preventDefault()
    const trimmed = draft.trim()
    if (trimmed && trimmed !== message.content) onEdit(message.id, trimmed)
    setIsEditing(false)
  }

  return (
    <div className={`message ${isOwn ? 'message--own' : ''}`}>
      {!isOwn && <Avatar name={authorName} size={32} />}

      <div className="message__body">
        <div className="message__meta">
          <span className="message__author">{authorName}</span>
          <span className="message__time">{formatTime(message.created_at)}</span>
          {message.edited_at && <span className="message__edited">изменено</span>}
        </div>

        {isEditing ? (
          <form className="message__edit-form" onSubmit={submitEdit}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setIsEditing(false)}
            />
            <button type="submit">Сохранить</button>
            <button type="button" className="ghost" onClick={() => setIsEditing(false)}>
              Отмена
            </button>
          </form>
        ) : (
          <p className="message__content">{message.content}</p>
        )}

        {isOwn && !isEditing && (
          <div className="message__actions">
            <button type="button" onClick={() => setIsEditing(true)}>
              изменить
            </button>
            <button type="button" className="danger" onClick={() => onDelete(message.id)}>
              удалить
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
