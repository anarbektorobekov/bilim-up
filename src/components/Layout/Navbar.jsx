import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Notifications from '../Notifications/Notifications';
import Announcements from '../Announcements/Announcements';
import '../../styles/navbar.css';

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  }

  const getInitial = () => {
    if (currentUser?.email) {
      return currentUser.email[0].toUpperCase();
    }
    return '?';
  };

  const getUserName = () => {
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'Пользователь';
  };

  if (!currentUser) {
    return (
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">Bilim Up</Link>
          <div className="auth-buttons">
            <Link to="/login" className="login-link">Вход</Link>
            <Link to="/register" className="signup-link">Регистрация</Link>
          </div>
        </div>
      </nav>
    );
  }

  function getDashboardLink() {
    if (userRole === 'student') return '/student-dashboard';
    if (userRole === 'teacher') return '/teacher-dashboard';
    if (userRole === 'admin') return '/admin-dashboard';
    return '/';
  }

  const getRoleName = () => {
    if (userRole === 'student') return 'Студент';
    if (userRole === 'teacher') return 'Преподаватель';
    if (userRole === 'admin') return 'Администратор';
    return '';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">Bilim Up</Link>
        
        <div className="user-menu">
          <Link to={getDashboardLink()} className="user-nav-link">Кабинет</Link>
          <Link to="/chat" className="user-nav-link">Чат</Link>
          
          {userRole === 'teacher' && (
            <Link to="/constructor" className="user-nav-link">Конструктор</Link>
          )}
          
          {/* ТОЛЬКО ОДИН РАЗ - НЕ ДУБЛИРУЙ! */}
          <Notifications />
          
          <Announcements />
          
          <div className="user-avatar-wrapper" ref={menuRef}>
            <div className="user-avatar" onClick={() => setShowMenu(!showMenu)}>
              {getInitial()}
            </div>
            {showMenu && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="profile-avatar">{getInitial()}</div>
                  <div className="profile-info">
                    <div className="profile-name">{getUserName()}</div>
                    <div className="profile-email">{currentUser.email}</div>
                    <div className="profile-role">{getRoleName()}</div>
                  </div>
                </div>
                <div className="profile-divider"></div>
                <Link to="/profile" className="profile-menu-item" onClick={() => setShowMenu(false)}>⚙️ Настройки профиля</Link>
                <Link to={getDashboardLink()} className="profile-menu-item" onClick={() => setShowMenu(false)}>📚 Мои курсы</Link>
                <Link to="/certificates" className="profile-menu-item" onClick={() => setShowMenu(false)}>🎓 Сертификаты</Link>
                {userRole === 'admin' && (
                  <Link to="/admin" className="profile-menu-item" onClick={() => setShowMenu(false)}>👑 Админ панель</Link>
                )}
                <div className="profile-divider"></div>
                <button onClick={handleLogout} className="profile-menu-item logout">🚪 Выйти</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}