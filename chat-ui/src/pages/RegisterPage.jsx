import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signUp(form)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1200)
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
          <p>Новая частота. Зарегистрируйтесь, чтобы начать.</p>
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
            <input type="password" required minLength={6} value={form.password} onChange={update('password')} />
          </label>

          {error && <div className="auth-form__error">{error}</div>}
          {success && <div className="auth-form__success">Готово! Перенаправляем на вход…</div>}

          <button type="submit" disabled={busy}>
            {busy ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-card__switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  )
}
