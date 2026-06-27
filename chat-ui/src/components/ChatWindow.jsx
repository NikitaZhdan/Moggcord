import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import SignalBars from './SignalBars'

export default function ChatWindow({ channel, currentUser, socket, onLeave }) {
  const { messages, status, loadError, typingUsers, sendMessage, editMessage, deleteMessage, notifyTyping } = socket

  return (
    <section className="chat-window">
      <header className="chat-window__header">
        <div>
          <h1>
            <span className="chat-window__hash">#</span>
            {channel.channel_name}
          </h1>
          <SignalBars status={status} />
        </div>
        <button type="button" className="ghost" onClick={() => onLeave(channel.id)}>
          покинуть канал
        </button>
      </header>

      {loadError && <div className="chat-window__error">{loadError}</div>}

      <MessageList
        messages={messages}
        currentUserId={currentUser?.uuid}
        onEdit={editMessage}
        onDelete={deleteMessage}
      />

      <TypingIndicator users={typingUsers} />

      <MessageInput onSend={sendMessage} onTyping={notifyTyping} disabled={status !== 'open'} />
    </section>
  )
}
