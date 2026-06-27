export default function TypingIndicator({ users }) {
  if (!users.length) return null

  const text =
    users.length === 1
      ? `${users[0].name} печатает`
      : `${users.map((u) => u.name).join(', ')} печатают`

  return (
    <div className="typing-indicator">
      <span className="typing-indicator__dot" />
      <span className="typing-indicator__dot" />
      <span className="typing-indicator__dot" />
      <span className="typing-indicator__text">{text}…</span>
    </div>
  )
}
