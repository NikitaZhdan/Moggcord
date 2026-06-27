import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../api/auth'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const token = await signIn(form)
      login(token)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="auth-card__logo">DSL</span>
          <p>Выход в эфир. Войдите, чтобы продолжить.</p>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>
            Email
            <input type="email" required value={form.email} onChange={update('email')} />
          </label>
          <label>
            Имя пользователя
            <input required value={form.username} onChange={update('username')} />
          </label>
          <label>
            Пароль
            <input type="password" required value={form.password} onChange={update('password')} />
          </label>

          {error && <div className="auth-form__error">{error}</div>}

          <button type="submit" disabled={busy}>
            {busy ? 'Соединение…' : 'Войти'}
          </button>
        </form>

        <p className="auth-card__switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
