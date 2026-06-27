import { STATUS } from '../hooks/useChannelSocket'

const LABELS = {
  [STATUS.IDLE]: 'нет канала',
  [STATUS.CONNECTING]: 'установка связи…',
  [STATUS.OPEN]: 'в сети',
  [STATUS.CLOSED]: 'связь потеряна',
  [STATUS.ERROR]: 'ошибка связи',
}

// "Эквалайзер" — анимированные полоски, символизирующие живой сигнал.
// Используется и здесь (статус соединения), и в TypingIndicator — это
// единый сквозной визуальный мотив интерфейса.
export default function SignalBars({ status = STATUS.IDLE, animated = true }) {
  const active = status === STATUS.OPEN
  return (
    <div className={`signal-bars signal-bars--${status}`} title={LABELS[status]}>
      <span className={`signal-bars__bar ${active && animated ? 'is-live' : ''}`} />
      <span className={`signal-bars__bar ${active && animated ? 'is-live' : ''}`} />
      <span className={`signal-bars__bar ${active && animated ? 'is-live' : ''}`} />
      <span className="signal-bars__label">{LABELS[status]}</span>
    </div>
  )
}
