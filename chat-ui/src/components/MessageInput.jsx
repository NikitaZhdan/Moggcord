import { useState } from 'react'

export default function MessageInput({ onSend, onTyping, disabled }) {
  const [value, setValue] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <form className="message-input" onSubmit={submit}>
      <input
        value={value}
        disabled={disabled}
        placeholder={disabled ? 'Подключение к каналу…' : 'Выйти на связь…'}
        onChange={(e) => {
          setValue(e.target.value)
          onTyping?.()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit(e)
          }
        }}
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        Передать
      </button>
    </form>
  )
}
