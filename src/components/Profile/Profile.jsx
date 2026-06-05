import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, storage } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaSave, FaEdit, FaCamera, FaCheckCircle, FaTrash } from 'react-icons/fa';
import '../../styles/profile.css';

export default function Profile() {
  const { currentUser, userRole } = useAuth();
  const [userData, setUserData] = useState({
    nickname: '',
    bio: '',
    avatarUrl: '',
    fullName: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    fetchUserData();
  }, [currentUser]);

  async function fetchUserData() {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          nickname: data.nickname || currentUser.email.split('@')[0],
          bio: data.bio || '',
          avatarUrl: data.avatarUrl || '',
          fullName: data.fullName || ''
        });
      }
    } catch (error) {
      console.error('Ошибка:', error);
    }
  }

  async function updateProfile(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        nickname: userData.nickname,
        bio: userData.bio,
        fullName: userData.fullName
      });
      setMessage('✅ Профиль успешно обновлен!');
      setEditMode(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Загрузка аватара
  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setMessage('❌ Пожалуйста, выберите изображение');
      return;
    }
    
    // Проверка размера (максимум 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage('❌ Размер изображения не должен превышать 2MB');
      return;
    }
    
    setUploading(true);
    setMessage('');
    
    try {
      // Удаляем старый аватар, если есть
      if (userData.avatarUrl) {
        try {
          const oldAvatarRef = ref(storage, userData.avatarUrl);
          await deleteObject(oldAvatarRef);
        } catch (err) {
          console.log('Старый аватар не найден');
        }
      }
      
      // Загружаем новый аватар
      const fileName = `avatars/${currentUser.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Сохраняем URL в Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        avatarUrl: downloadURL
      });
      
      setUserData(prev => ({ ...prev, avatarUrl: downloadURL }));
      setMessage('✅ Аватар успешно обновлен!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setMessage('❌ Ошибка при загрузке аватара');
    } finally {
      setUploading(false);
    }
  }
  
  // Удаление аватара
  async function deleteAvatar() {
    if (!userData.avatarUrl) return;
    
    if (!window.confirm('Удалить аватар?')) return;
    
    setUploading(true);
    try {
      const avatarRef = ref(storage, userData.avatarUrl);
      await deleteObject(avatarRef);
      
      await updateDoc(doc(db, 'users', currentUser.uid), {
        avatarUrl: ''
      });
      
      setUserData(prev => ({ ...prev, avatarUrl: '' }));
      setMessage('✅ Аватар удален');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Ошибка удаления:', error);
      setMessage('❌ Ошибка при удалении аватара');
    } finally {
      setUploading(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (newPassword !== confirmPassword) {
      setMessage('❌ Пароли не совпадают');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage('❌ Пароль должен быть не менее 6 символов');
      setLoading(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setMessage('✅ Пароль успешно изменен!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        setMessage('❌ Неверный текущий пароль');
      } else {
        setMessage('❌ Ошибка: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const getInitial = () => {
    return userData.nickname ? userData.nickname[0].toUpperCase() : '?';
  };

  const getRoleIcon = () => {
    if (userRole === 'student') return '🎓';
    if (userRole === 'teacher') return '👨‍🏫';
    if (userRole === 'admin') return '👑';
    return '👤';
  };

  const getRoleName = () => {
    if (userRole === 'student') return 'Студент';
    if (userRole === 'teacher') return 'Преподаватель';
    if (userRole === 'admin') return 'Администратор';
    return 'Пользователь';
  };

  return (
    <div className="profile-page">
      <div className="profile-bg-gradient"></div>
      
      <div className="profile-container">
        {/* Заголовок */}
        <motion.div 
          className="profile-header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>Настройки профиля</h1>
          <p>Управляйте своими данными и безопасностью</p>
        </motion.div>

        {/* Аватар и основная информация */}
        <motion.div 
          className="profile-avatar-section"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="profile-avatar-large">
            {userData.avatarUrl ? (
              <img src={userData.avatarUrl} alt="Avatar" />
            ) : (
              <span>{getInitial()}</span>
            )}
            <label className="avatar-edit-btn">
              <FaCamera />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </label>
            {userData.avatarUrl && (
              <button className="avatar-delete-btn" onClick={deleteAvatar}>
                <FaTrash />
              </button>
            )}
          </div>
          <div className="profile-info-basic">
            <h2>{userData.nickname}</h2>
            <p className="profile-email">{currentUser.email}</p>
            <div className="profile-role-badge">
              {getRoleIcon()} {getRoleName()}
            </div>
          </div>
        </motion.div>

        {/* Вкладки */}
        <div className="profile-tabs-modern">
          <button 
            className={`profile-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <FaUser /> Личные данные
          </button>
          <button 
            className={`profile-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <FaLock /> Безопасность
          </button>
        </div>

        {/* Сообщение */}
        {message && (
          <motion.div 
            className={`profile-message ${message.includes('✅') ? 'success' : 'error'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message}
          </motion.div>
        )}

        {/* Вкладка Личные данные */}
        {activeTab === 'info' && (
          <motion.div 
            className="profile-info-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {!editMode ? (
              <div className="profile-view">
                <div className="info-field">
                  <label>📛 Имя пользователя</label>
                  <div className="field-value">{userData.nickname}</div>
                </div>
                <div className="info-field">
                  <label>📧 Email</label>
                  <div className="field-value">{currentUser.email}</div>
                </div>
                <div className="info-field">
                  <label>👤 Полное имя</label>
                  <div className="field-value">{userData.fullName || 'Не указано'}</div>
                </div>
                <div className="info-field">
                  <label>📝 О себе</label>
                  <div className="field-value bio-text">{userData.bio || 'Не указано'}</div>
                </div>
                <button className="edit-profile-btn" onClick={() => setEditMode(true)}>
                  <FaEdit /> Редактировать профиль
                </button>
              </div>
            ) : (
              <form onSubmit={updateProfile} className="profile-edit-form">
                <div className="input-group-modern">
                  <label>👤 Полное имя</label>
                  <input
                    type="text"
                    value={userData.fullName}
                    onChange={(e) => setUserData({...userData, fullName: e.target.value})}
                    placeholder="Ваше полное имя"
                  />
                </div>
                <div className="input-group-modern">
                  <label>📛 Имя пользователя (никнейм)</label>
                  <input
                    type="text"
                    value={userData.nickname}
                    onChange={(e) => setUserData({...userData, nickname: e.target.value})}
                    placeholder="Ваш никнейм"
                    required
                  />
                </div>
                <div className="input-group-modern">
                  <label>📝 О себе</label>
                  <textarea
                    value={userData.bio}
                    onChange={(e) => setUserData({...userData, bio: e.target.value})}
                    placeholder="Расскажите о себе..."
                    rows="4"
                  />
                </div>
                <div className="form-buttons">
                  <button type="submit" className="save-btn" disabled={loading}>
                    <FaSave /> {loading ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                  <button type="button" className="cancel-btn" onClick={() => setEditMode(false)}>
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}

        {/* Вкладка Безопасность */}
        {activeTab === 'security' && (
          <motion.div 
            className="profile-security-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3>🔒 Смена пароля</h3>
            <form onSubmit={changePassword} className="password-form-modern">
              <div className="input-group-modern">
                <label>Текущий пароль</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Введите текущий пароль"
                  required
                />
              </div>
              <div className="input-group-modern">
                <label>Новый пароль</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль (мин. 6 символов)"
                  required
                />
              </div>
              <div className="input-group-modern">
                <label>Подтверждение пароля</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Подтвердите новый пароль"
                  required
                />
              </div>
              <button type="submit" className="change-password-btn" disabled={loading}>
                <FaLock /> {loading ? 'Изменение...' : 'Изменить пароль'}
              </button>
            </form>

            <div className="security-tips">
              <h4>💡 Советы по безопасности:</h4>
              <ul>
                <li>Используйте сложный пароль (буквы, цифры, символы)</li>
                <li>Не сообщайте пароль третьим лицам</li>
                <li>Регулярно меняйте пароль для безопасности</li>
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}