import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import '../../styles/global.css';
import '../../styles/auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('Пользователь не найден');
      } else if (error.code === 'auth/wrong-password') {
        setError('Неверный пароль');
      } else if (error.code === 'auth/invalid-email') {
        setError('Неверный формат email');
      } else {
        setError('Ошибка входа: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-gradient"></div>
      
      <motion.div 
        className="auth-container"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="auth-card-glow">
          <div className="auth-header">
            <div className="auth-icon">🔐</div>
            <h2>Добро пожаловать</h2>
            <p>Войдите в свой аккаунт</p>
          </div>

          {error && (
            <motion.div 
              className="auth-error"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label>📧 Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                required
              />
            </div>

            <div className="input-group">
              <label>🔒 Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                required
              />
            </div>

            <div className="auth-options">
              <label className="checkbox">
                <input type="checkbox" /> Запомнить меня
              </label>
              <Link to="/forgot-password" className="forgot-link">Забыли пароль?</Link>
            </div>

            <button 
              type="submit" 
              className="auth-btn-glow"
              disabled={loading}
            >
              {loading ? 'Вход...' : '🚀 Войти'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}