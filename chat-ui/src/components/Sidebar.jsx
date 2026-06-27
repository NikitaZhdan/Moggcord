import { useState } from 'react'
import Avatar from './Avatar'

export default function Sidebar({ channels, loading, error, selectedId, onSelect, onCreate, onJoin, currentUser, onLogout }) {
  const [newChannelName, setNewChannelName] = useState('')
  const [joinId, setJoinId] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = newChannelName.trim()
    if (!name) return
    setBusy(true)
    setFormError(null)
    try {
      const channel = await onCreate(name)
      setNewChannelName('')
      onSelect(channel.id)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async (e) => {
    e.preventDefault()
    const id = joinId.trim()
    if (!id) return
    setBusy(true)
    setFormError(null)
    try {
      await onJoin(id)
      setJoinId('')
      onSelect(id)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <span className="sidebar__logo">DSL</span>
        <span className="sidebar__tagline">signal channel</span>
      </div>

      <div className="sidebar__user">
        <Avatar name={currentUser?.username} />
        <div>
          <div className="sidebar__username">{currentUser?.username}</div>
          <div className="sidebar__uuid">{currentUser?.uuid?.slice(0, 8)}…</div>
        </div>
        <button type="button" className="ghost sidebar__logout" onClick={onLogout}>
          выйти
        </button>
      </div>

      <div className="sidebar__section-title">Каналы</div>

      <nav className="sidebar__channels">
        {loading && <div className="sidebar__hint">Загрузка…</div>}
        {error && <div className="sidebar__hint sidebar__hint--error">{error}</div>}
        {!loading && !channels.length && <div className="sidebar__hint">У вас пока нет каналов</div>}

        {channels.map((channel) => (
          <button
            key={channel.id}
            type="button"
            className={`sidebar__channel ${channel.id === selectedId ? 'is-active' : ''}`}
            onClick={() => onSelect(channel.id)}
          >
            <span className="sidebar__channel-hash">#</span>
            {channel.channel_name}
          </button>
        ))}
      </nav>

      <div className="sidebar__forms">
        <form onSubmit={handleCreate}>
          <input
            placeholder="новый канал"
            value={newChannelName}
            disabled={busy}
            onChange={(e) => setNewChannelName(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            +
          </button>
        </form>

        <form onSubmit={handleJoin}>
          <input
            placeholder="ID канала для входа"
            value={joinId}
            disabled={busy}
            onChange={(e) => setJoinId(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            ↵
          </button>
        </form>

        {formError && <div className="sidebar__hint sidebar__hint--error">{formError}</div>}
      </div>
    </aside>
  )
}
