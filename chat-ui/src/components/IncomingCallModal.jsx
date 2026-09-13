import { useCall } from '../context/CallContext'
import { useUserDirectory } from '../context/UserDirectoryContext'
import Avatar from './Avatar'

export default function IncomingCallModal() {
  const { activeCall, acceptCall, declineCall, channels } = useCall()
  const { getName } = useUserDirectory()

  if (!activeCall || activeCall.status !== 'incoming') return null

  const channel = channels.find((c) => c.id === activeCall.channelId)
  const callerName = getName(activeCall.initiatorId)

  return (
    <div className="call-modal-backdrop">
      <div className="call-modal">
        <Avatar name={callerName} size={56} />
        <div className="call-modal__text">
          <div className="call-modal__title">
            {activeCall.callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
          </div>
          <div className="call-modal__subtitle">
            {callerName} · #{channel?.channel_name ?? '…'}
          </div>
        </div>
        <div className="call-modal__actions">
          <button type="button" className="call-modal__decline" onClick={declineCall}>
            Отклонить
          </button>
          <button type="button" className="call-modal__accept" onClick={acceptCall}>
            Принять
          </button>
        </div>
      </div>
    </div>
  )
}
