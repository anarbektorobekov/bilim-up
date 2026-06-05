import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, onSnapshot, updateDoc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';
import { FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTrash } from 'react-icons/fa';
import '../../styles/notifications.css';

export default function Notifications() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef(null);

  // Закрытие при клике вне области
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    
    const notifRef = doc(db, 'notifications', currentUser.uid);
    const unsubscribe = onSnapshot(notifRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const notifList = data.list || [];
        setNotifications(notifList);
        setUnreadCount(notifList.filter(n => !n.read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  async function markAsRead(notificationId) {
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    await updateDoc(doc(db, 'notifications', currentUser.uid), { list: updatedNotifications });
  }

  async function deleteNotification(notificationId) {
    const updatedNotifications = notifications.filter(n => n.id !== notificationId);
    setNotifications(updatedNotifications);
    setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    await updateDoc(doc(db, 'notifications', currentUser.uid), { list: updatedNotifications });
  }

  async function markAllAsRead() {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    setUnreadCount(0);
    await updateDoc(doc(db, 'notifications', currentUser.uid), { list: updatedNotifications });
  }

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'warning': return <FaExclamationTriangle className="notif-icon warning" />;
      case 'ban': return <FaInfoCircle className="notif-icon ban" />;
      case 'unban': return <FaCheckCircle className="notif-icon success" />;
      default: return <FaBell className="notif-icon default" />;
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="notifications-container" ref={wrapperRef}>
      <button className="notif-bell" onClick={toggleNotifications}>
        <FaBell />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {showNotifications && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3>Уведомления</h3>
            {notifications.length > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                <FaCheckCircle /> Прочитать всё
              </button>
            )}
          </div>
          
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="empty-icon">🔔</div>
                <p>У вас нет уведомлений</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className={`notif-item ${!notif.read ? 'unread' : ''}`} onClick={() => markAsRead(notif.id)}>
                  {getNotificationIcon(notif.type)}
                  <div className="notif-content">
                    <div className="notif-title">{notif.title}</div>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-time">{new Date(notif.issuedAt || notif.createdAt).toLocaleString()}</div>
                  </div>
                  <button className="notif-delete" onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}>
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}