import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { 
  collection, query, orderBy, onSnapshot, addDoc, 
  updateDoc, doc, getDoc, getDocs, setDoc, deleteDoc,
  where, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import '../../styles/chat.css';

export default function ChatWindow({ 
  activeChat, currentUser, deleteMessage, 
  clearChat, reportUser, leaveGroup, userRole 
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [userWarnings, setUserWarnings] = useState([]);
  const [banDuration, setBanDuration] = useState(1);
  const [banReason, setBanReason] = useState('');
  const [warningText, setWarningText] = useState('');
  const [bannedUsers, setBannedUsers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeChat) {
      const q = query(
        collection(db, 'chats', activeChat.id, 'messages'),
        orderBy('timestamp', 'asc')
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(msg => {
          // Безопасная проверка deletedFor
          if (!msg.deletedFor) return true;
          if (!Array.isArray(msg.deletedFor)) return true;
          return !msg.deletedFor.includes(currentUser.uid);
        });
        
        setMessages(messagesData);
        scrollToBottom();
      });
      
      return unsubscribe;
    }
  }, [activeChat]);

  useEffect(() => {
    fetchBannedUsers();
  }, []);

  async function fetchBannedUsers() {
    const querySnapshot = await getDocs(collection(db, 'banned'));
    const banned = querySnapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data()
    }));
    setBannedUsers(banned);
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const isBanned = bannedUsers.some(ban => 
      ban.userId === currentUser.uid && new Date(ban.bannedUntil) > new Date()
    );
    
    if (isBanned) {
      alert('⛔ Вы забанены и не можете отправлять сообщения!');
      return;
    }

    await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
      text: newMessage,
      senderId: currentUser.uid,
      senderName: currentUser.email,
      timestamp: new Date().toISOString(),
      read: false
    });

    const chatRef = doc(db, 'chats', activeChat.id);
    await updateDoc(chatRef, {
      lastMessage: newMessage,
      lastMessageTime: new Date().toISOString()
    });

    setNewMessage('');
  };

  async function openUserInfo(userId) {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      setSelectedUser({ id: userId, ...userData });
      
      const userChatsRef = doc(db, 'userChats', userId);
      const userChatsDoc = await getDoc(userChatsRef);
      let allMessages = [];
      
      if (userChatsDoc.exists()) {
        const chats = userChatsDoc.data().chats || [];
        for (const chat of chats) {
          const messagesQuery = query(
            collection(db, 'chats', chat.chatId, 'messages'),
            orderBy('timestamp', 'asc')
          );
          const messagesSnapshot = await getDocs(messagesQuery);
          const messages = messagesSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            chatName: chat.otherUserName, 
            ...doc.data() 
          }));
          allMessages = [...allMessages, ...messages];
        }
      }
      allMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setUserMessages(allMessages);
      
      const warningsQuery = query(collection(db, 'warnings'), where('userId', '==', userId));
      const warningsSnapshot = await getDocs(warningsQuery);
      const warnings = warningsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserWarnings(warnings);
      
      setShowUserInfo(true);
    }
  }

  async function banUser(userId, userEmail, days, reason) {
    if (!reason.trim()) {
      alert('Введите причину бана');
      return;
    }
    
    const bannedUntil = new Date();
    bannedUntil.setDate(bannedUntil.getDate() + days);
    
    await setDoc(doc(db, 'banned', userId), {
      userId: userId,
      userEmail: userEmail,
      bannedUntil: bannedUntil.toISOString(),
      reason: reason,
      bannedBy: currentUser.uid,
      bannedAt: new Date().toISOString(),
      duration: days
    });
    
    // Уведомление пользователю
    const notification = {
      id: Date.now(),
      type: 'ban',
      title: '🔒 Вы забанены!',
      message: `Вы забанены на ${days} дней по причине: ${reason}`,
      reason: reason,
      duration: days,
      bannedUntil: bannedUntil.toISOString(),
      createdAt: new Date().toISOString(),
      read: false
    };
    
    const notifRef = doc(db, 'notifications', userId);
    const notifDoc = await getDoc(notifRef);
    if (notifDoc.exists()) {
      await updateDoc(notifRef, { list: arrayUnion(notification) });
    } else {
      await setDoc(notifRef, { list: [notification] });
    }
    
    alert(`✅ Пользователь ${userEmail} забанен на ${days} дней`);
    fetchBannedUsers();
    setShowUserInfo(false);
    setBanReason('');
  }

  async function unbanUser(userId) {
    await deleteDoc(doc(db, 'banned', userId));
    
    const notification = {
      id: Date.now(),
      type: 'unban',
      title: '🔓 Вы разбанены!',
      message: 'Администратор снял с вас бан',
      createdAt: new Date().toISOString(),
      read: false
    };
    
    const notifRef = doc(db, 'notifications', userId);
    const notifDoc = await getDoc(notifRef);
    if (notifDoc.exists()) {
      await updateDoc(notifRef, { list: arrayUnion(notification) });
    } else {
      await setDoc(notifRef, { list: [notification] });
    }
    
    alert('✅ Пользователь разбанен');
    fetchBannedUsers();
  }

  async function sendWarning(userId, userEmail, warning) {
    if (!warning.trim()) {
      alert('Введите текст предупреждения');
      return;
    }
    
    await addDoc(collection(db, 'warnings'), {
      userId: userId,
      userEmail: userEmail,
      warningText: warning,
      issuedBy: currentUser.uid,
      issuedByEmail: currentUser.email,
      issuedAt: new Date().toISOString(),
      read: false
    });
    
    const notification = {
      id: Date.now(),
      type: 'warning',
      title: '⚠️ Вы получили предупреждение!',
      message: `Администратор отправил вам предупреждение: "${warning.substring(0, 100)}"`,
      warningText: warning,
      issuedBy: currentUser.email,
      issuedAt: new Date().toISOString(),
      read: false
    };
    
    const notifRef = doc(db, 'notifications', userId);
    const notifDoc = await getDoc(notifRef);
    if (notifDoc.exists()) {
      await updateDoc(notifRef, { list: arrayUnion(notification) });
    } else {
      await setDoc(notifRef, { list: [notification] });
    }
    
    alert(`✅ Предупреждение отправлено пользователю ${userEmail}`);
    setWarningText('');
    setShowUserInfo(false);
  }

  async function deleteUserMessage(messageId, chatId) {
    if (window.confirm('Удалить это сообщение для всех пользователей?')) {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await deleteDoc(messageRef);
      alert('✅ Сообщение удалено');
    }
  }

  // Функция очистки чата - полностью переписана
  async function handleClearChat() {
    if (!activeChat) return;
    
    if (!window.confirm('Очистить всю переписку? Это действие нельзя отменить.')) {
      return;
    }
    
    try {
      const messagesQuery = query(collection(db, 'chats', activeChat.id, 'messages'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      let deletedCount = 0;
      
      for (const messageDoc of messagesSnapshot.docs) {
        const messageRef = doc(db, 'chats', activeChat.id, 'messages', messageDoc.id);
        await deleteDoc(messageRef);
        deletedCount++;
      }
      
      alert(`Очищено ${deletedCount} сообщений`);
      setMessages([]);
      
    } catch (error) {
      console.error('Ошибка очистки:', error);
      alert('Ошибка при очистке чата: ' + error.message);
    }
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isUserBanned = (userId) => {
    const ban = bannedUsers.find(b => b.userId === userId);
    return ban && new Date(ban.bannedUntil) > new Date();
  };

  const getBanInfo = (userId) => {
    return bannedUsers.find(b => b.userId === userId);
  };

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
  {activeChat.otherUserAvatar ? (
    <img 
      src={activeChat.otherUserAvatar} 
      alt="avatar" 
      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
    />
  ) : (
    activeChat.type === 'group' ? '👥' : '👤'
  )}
</div>
          <div className="chat-header-details">
            <h3>{activeChat.otherUserName}</h3>
            <span>{activeChat.type === 'group' ? 'Групповой чат' : 'Личный чат'}</span>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-action-btn" onClick={handleClearChat}>🗑️ Очистить</button>
          {activeChat.type !== 'group' && (
            <button className="chat-action-btn report" onClick={() => setShowReportModal(true)}>
              ⚠️ Жалоба
            </button>
          )}
          {userRole === 'admin' && activeChat.type !== 'group' && activeChat.participantId && (
            <button className="chat-action-btn admin" onClick={() => openUserInfo(activeChat.participantId)}>
              👑 Управление
            </button>
          )}
          {activeChat.type === 'group' && (
            <button className="chat-action-btn leave" onClick={() => leaveGroup(activeChat.id)}>
              🚪 Выйти
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => {
          const isBannedUser = isUserBanned(msg.senderId);
          const isDeletedByAdmin = msg.deletedByAdmin;
          
          return (
            <div
              key={msg.id}
              className={`message-bubble ${msg.senderId === currentUser.uid ? 'sent' : 'received'} ${isBannedUser ? 'banned-message' : ''}`}
            >
              {msg.senderId !== currentUser.uid && (
                <div 
                  className="message-sender" 
                  onClick={() => userRole === 'admin' && openUserInfo(msg.senderId)}
                  style={{ cursor: userRole === 'admin' ? 'pointer' : 'default' }}
                >
                  {msg.senderName?.split('@')[0]}
                  {userRole === 'admin' && <span className="admin-badge">👑</span>}
                </div>
              )}
              <div className="message-text">
                {isDeletedByAdmin ? (
                  <span className="deleted-by-admin">{msg.text}</span>
                ) : msg.deleted ? (
                  <span className="deleted-message">Сообщение удалено</span>
                ) : (
                  msg.text
                )}
              </div>
              <div className="message-time">
                {formatTime(msg.timestamp)}
                {msg.senderId === currentUser.uid && !msg.deleted && !isDeletedByAdmin && (
                  <button 
                    className="delete-message-btn"
                    onClick={() => deleteMessage(msg.id, activeChat.id, true)}
                    title="Удалить для всех (5 минут)"
                  >
                    ✖
                  </button>
                )}
                {userRole === 'admin' && !isDeletedByAdmin && (
                  <button 
                    className="admin-delete-message-btn"
                    onClick={() => deleteUserMessage(msg.id, activeChat.id)}
                    title="Удалить сообщение (для всех)"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isUserBanned(currentUser.uid) ? "⛔ Вы забанены" : "Введите сообщение..."}
          className="chat-input"
          disabled={isUserBanned(currentUser.uid)}
        />
        <button type="submit" className="chat-send-btn" disabled={isUserBanned(currentUser.uid)}>
          📤 Отправить
        </button>
      </form>

      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Пожаловаться на пользователя</h3>
            <button onClick={() => { reportUser(activeChat.participantId, 'Спам'); setShowReportModal(false); }}>📢 Спам</button>
            <button onClick={() => { reportUser(activeChat.participantId, 'Оскорбления'); setShowReportModal(false); }}>🤬 Оскорбления</button>
            <button onClick={() => { reportUser(activeChat.participantId, 'Неприемлемый контент'); setShowReportModal(false); }}>🔞 Неприемлемый контент</button>
            <button onClick={() => { reportUser(activeChat.participantId, 'Реклама'); setShowReportModal(false); }}>📢 Реклама</button>
            <button onClick={() => setShowReportModal(false)}>Отмена</button>
          </div>
        </div>
      )}

      {showUserInfo && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserInfo(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: 'white' }}>Управление пользователем: {selectedUser.email}</h3>
              <button onClick={() => setShowUserInfo(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
              <p style={{ color: '#e5e7eb', margin: '0.3rem 0' }}><strong style={{ color: 'white' }}>📅 Зарегистрирован:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              <p style={{ color: '#e5e7eb', margin: '0.3rem 0' }}><strong style={{ color: 'white' }}>🎓 Роль:</strong> {selectedUser.role === 'student' ? 'Студент' : selectedUser.role === 'teacher' ? 'Преподаватель' : 'Администратор'}</p>
              <p style={{ color: '#e5e7eb', margin: '0.3rem 0' }}><strong style={{ color: 'white' }}>💬 Сообщений:</strong> {userMessages.length}</p>
              {isUserBanned(selectedUser.id) && (
                <p style={{ color: '#ef4444', margin: '0.3rem 0' }}>🔒 Забанен до: {new Date(getBanInfo(selectedUser.id).bannedUntil).toLocaleString()}</p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>💬 Сообщения:</h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {userMessages.slice(0, 20).length === 0 ? (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>Нет сообщений</div>
                ) : (
                  userMessages.slice(0, 20).map(msg => (
                    <div key={msg.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '0.8rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.7rem', color: '#9ca3af' }}>
                        <span>💬 {msg.chatName}</span>
                        <span>{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <div style={{ color: '#e5e7eb', fontSize: '0.8rem', marginBottom: '0.3rem' }}>{msg.text}</div>
                      <button onClick={() => deleteUserMessage(msg.id, msg.chatId)} style={{ background: 'rgba(245,158,11,0.15)', border: 'none', borderRadius: '12px', color: '#f59e0b', fontSize: '0.7rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                        🗑️ Удалить
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>⚠️ Предупреждения:</h4>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {userWarnings.length === 0 ? (
                  <div style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>Нет предупреждений</div>
                ) : (
                  userWarnings.map(warning => (
                    <div key={warning.id} style={{ background: 'rgba(245,158,11,0.15)', borderRadius: '12px', padding: '0.8rem', marginBottom: '0.5rem', borderLeft: '3px solid #f59e0b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ color: '#f59e0b', fontSize: '0.7rem', fontWeight: '600' }}>⚠️ Предупреждение</span>
                        <span style={{ color: '#9ca3af', fontSize: '0.7rem' }}>{new Date(warning.issuedAt).toLocaleString()}</span>
                      </div>
                      <div style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{warning.warningText}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>🔒 Забанить</h4>
              <select value={banDuration} onChange={(e) => setBanDuration(parseInt(e.target.value))} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white' }}>
                <option value={1}>1 день</option>
                <option value={3}>3 дня</option>
                <option value={7}>7 дней</option>
                <option value={30}>30 дней</option>
                <option value={365}>Навсегда</option>
              </select>
              <input type="text" placeholder="Причина бана" value={banReason} onChange={(e) => setBanReason(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white' }} />
              <button onClick={() => banUser(selectedUser.id, selectedUser.email, banDuration, banReason)} style={{ width: '100%', padding: '0.5rem', background: '#ef4444', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>🔒 Забанить</button>
              {isUserBanned(selectedUser.id) && (
                <button onClick={() => unbanUser(selectedUser.id)} style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: '#10b981', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>🔓 Разбанить</button>
              )}
            </div>

            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <h4 style={{ color: 'white', marginBottom: '0.5rem' }}>⚠️ Предупреждение</h4>
              <textarea rows="3" placeholder="Текст предупреждения..." value={warningText} onChange={(e) => setWarningText(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white' }} />
              <button onClick={() => sendWarning(selectedUser.id, selectedUser.email, warningText)} style={{ width: '100%', padding: '0.5rem', background: '#f59e0b', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Отправить предупреждение</button>
            </div>

            <button onClick={() => setShowUserInfo(false)} style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}