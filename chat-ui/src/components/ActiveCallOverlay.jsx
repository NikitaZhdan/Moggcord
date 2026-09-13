import { useEffect, useRef } from 'react'
import { useCall } from '../context/CallContext'
import { useUserDirectory } from '../context/UserDirectoryContext'

// Рендерим <video> даже для аудиозвонков: это единственный штатный способ
// заставить браузер реально воспроизвести аудио-дорожку из MediaStream — тег
// просто не будет показывать видео-полотно, если в потоке нет видео-трека.
function MediaTile({ stream, label, muted }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null
  }, [stream])

  return (
    <div className="call-tile">
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      <div className="call-tile__label">{label}</div>
    </div>
  )
}

export default function ActiveCallOverlay() {
  const { activeCall, hangUp, getMyStream, channels } = useCall()
  const { getName } = useUserDirectory()

  if (!activeCall || activeCall.status === 'incoming') return null

  const channel = channels.find((c) => c.id === activeCall.channelId)
  const remoteEntries = Array.from(activeCall.remoteStreams.entries())
  const isRinging = activeCall.status === 'outgoing'

  return (
    <div className="active-call">
      <div className="active-call__header">
        <span>
          {activeCall.callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'} · #{channel?.channel_name ?? '…'}
        </span>
        {isRinging && <span className="active-call__status">Звоним…</span>}
      </div>

      <div className="active-call__grid">
        <MediaTile stream={getMyStream()} label="Вы" muted />

        {remoteEntries.map(([userId, stream]) => (
          <MediaTile key={userId} stream={stream} label={getName(userId)} />
        ))}

        {isRinging && remoteEntries.length === 0 && (
          <div className="call-tile call-tile--waiting">Ждём ответа…</div>
        )}
      </div>

      <button type="button" className="active-call__hangup" onClick={hangUp}>
        Завершить
      </button>
    </div>
  )
}
