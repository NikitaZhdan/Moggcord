import MessageList from './MessageList'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import SignalBars from './SignalBars'
import { useCall } from '../context/CallContext'

export default function ChatWindow({ channel, currentUser, socket, onLeave }) {
  const { messages, status, loadError, typingUsers, sendMessage, editMessage, deleteMessage, notifyTyping } = socket
  const { activeCall, startCall } = useCall()

  // Кнопки звонка скрываем, если в этом канале уже что-то происходит,
  // и вообще прячем, если пользователь уже занят звонком в другом канале.
  const callDisabled = Boolean(activeCall)

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
        <div className="chat-window__actions">
          <button
            type="button"
            className="ghost"
            title="Аудиозвонок"
            disabled={callDisabled}
            onClick={() => startCall(channel.id, 'audio')}
          >
            📞
          </button>
          <button
            type="button"
            className="ghost"
            title="Видеозвонок"
            disabled={callDisabled}
            onClick={() => startCall(channel.id, 'video')}
          >
            🎥
          </button>
          <button type="button" className="ghost" onClick={() => onLeave(channel.id)}>
            покинуть канал
          </button>
        </div>
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
