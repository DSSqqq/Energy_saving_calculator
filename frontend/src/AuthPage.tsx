import React, { useState } from 'react';

interface AuthPageProps {
  onLoginSuccess: (token: string, username: string) => void;
}

export function AuthPage({ onLoginSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isLogin ? '/api/auth/login/' : '/api/auth/register/';
    const payload = isLogin 
      ? { username, password } 
      : { username, password, email };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Неверное имя пользователя или пароль');
      }

      onLoginSuccess(data.token, data.username);
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="auth-card__logo-text">Энерго-Аудит</span>
          <span className="auth-card__logo-icon">⚡</span>
        </div>
        <h2 className="auth-card__title">
          {isLogin ? 'Вход в систему' : 'Регистрация аккаунта'}
        </h2>
        
        <div className="auth-tabs">
          <button 
            type="button" 
            className={`auth-tabs__btn ${isLogin ? 'auth-tabs__btn--active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Войти
          </button>
          <button 
            type="button" 
            className={`auth-tabs__btn ${!isLogin ? 'auth-tabs__btn--active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Регистрация
          </button>
        </div>

        {error && <div className="auth-card__error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form__field">
            <label htmlFor="username">Имя пользователя</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Введите имя пользователя"
              required
              autoComplete="username"
            />
          </div>

          {!isLogin && (
            <div className="auth-form__field">
              <label htmlFor="email">Email (необязательно)</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                autoComplete="email"
              />
            </div>
          )}

          <div className="auth-form__field">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn--primary auth-form__submit"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : isLogin ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
}
