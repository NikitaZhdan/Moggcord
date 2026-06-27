export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state__bars">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <h2>Нет несущей частоты</h2>
      <p>Выберите канал слева или создайте новый, чтобы начать приём и передачу.</p>
    </div>
  )
}
