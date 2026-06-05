import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import '../../styles/global.css';
import '../../styles/auth.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Пароли не совпадают');
    }

    if (password.length < 6) {
      return setError('Пароль должен содержать минимум 6 символов');
    }

    if (username.length < 2) {
      return setError('Введите имя пользователя');
    }

    setLoading(true);

    try {
      await register(email, password);
      navigate('/');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setError('Пользователь с таким email уже существует');
      } else if (error.code === 'auth/invalid-email') {
        setError('Неверный формат email');
      } else {
        setError('Ошибка регистрации: ' + error.message);
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
            <div className="auth-icon">✨</div>
            <h2>Создать аккаунт</h2>
            <p>Начните свое обучение прямо сейчас</p>
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
              <label>👤 Имя пользователя</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Введите ваше имя"
                required
              />
            </div>

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
                placeholder="Минимум 6 символов"
                required
              />
            </div>

            <div className="input-group">
              <label>🔒 Подтверждение пароля</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
                required
              />
            </div>

            <button 
              type="submit" 
              className="auth-btn-glow"
              disabled={loading}
            >
              {loading ? 'Регистрация...' : '🚀 Зарегистрироваться'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
          </div>

          <div className="auth-social">
            <div className="auth-divider">
              <span>или</span>
            </div>
            <div className="social-buttons">
              <button className="social-btn google">G</button>
              <button className="social-btn github">GH</button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}