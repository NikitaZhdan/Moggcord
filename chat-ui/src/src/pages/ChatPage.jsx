import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useChannels } from '../hooks/useChannels'
import { useChannelSocket } from '../hooks/useChannelSocket'
import { CallProvider } from '../context/CallContext'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import EmptyState from '../components/EmptyState'
import IncomingCallModal from '../components/IncomingCallModal'
import ActiveCallOverlay from '../components/ActiveCallOverlay'

export default function ChatPage() {
  const { user, logout } = useAuth()
  const { channels, loading, error, create, join, leave } = useChannels()
  const [selectedId, setSelectedId] = useState(null)

  const socket = useChannelSocket(selectedId, user)
  const selectedChannel = channels.find((c) => c.id === selectedId)

  const handleLeave = async (channelId) => {
    await leave(channelId)
    if (channelId === selectedId) setSelectedId(null)
  }

  return (
    <CallProvider channels={channels}>
      <div className="app-shell">
        <Sidebar
          channels={channels}
          loading={loading}
          error={error}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreate={create}
          onJoin={join}
          currentUser={user}
          onLogout={logout}
        />

        {selectedChannel ? (
          <ChatWindow channel={selectedChannel} currentUser={user} socket={socket} onLeave={handleLeave} />
        ) : (
          <EmptyState />
        )}
      </div>

      <IncomingCallModal />
      <ActiveCallOverlay />
    </CallProvider>
  )
}
