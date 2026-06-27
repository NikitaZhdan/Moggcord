// Детерминированный цвет аватара, выведенный из строки (uuid или username),
// чтобы один и тот же пользователь всегда получал один и тот же цвет.
const PALETTE = ['#FFB454', '#5EEAD4', '#A78BFA', '#F472B6', '#60A5FA', '#34D399', '#FB923C']

function colorFor(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export default function Avatar({ name, size = 36 }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  const bg = colorFor(name || 'unknown')

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, backgroundColor: `${bg}26`, color: bg, borderColor: `${bg}55` }}
    >
      {initials}
    </div>
  )
}
