import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc, deleteDoc, doc, orderBy, query, onSnapshot, where, getDocs } from 'firebase/firestore';
import { FaBullhorn, FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
import '../../styles/announcements.css';

export default function Announcements() {
  const { currentUser, userRole } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ 
    title: '', 
    content: '', 
    target: 'all',
    targetCourseId: ''
  });
  const [courses, setCourses] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  
  // Для перетаскивания окна
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  // Закрытие при клике вне области
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAnnouncements(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Обработчики перетаскивания
  const handleMouseDown = (e) => {
    if (e.target.closest('.submit-announcement') || 
        e.target.closest('.modal-close') ||
        e.target.closest('select') ||
        e.target.closest('input') ||
        e.target.closest('textarea')) {
      return;
    }
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setModalPosition({
        x: newX,
        y: newY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (showAddModal) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [showAddModal, isDragging]);

  // Загрузка курсов
  useEffect(() => {
    if (userRole === 'teacher' || userRole === 'admin') {
      const fetchCourses = async () => {
        let q;
        if (userRole === 'teacher') {
          q = query(collection(db, 'courses'), where('teacherId', '==', currentUser.uid));
        } else {
          q = query(collection(db, 'courses'));
        }
        const querySnapshot = await getDocs(q);
        const coursesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCourses(coursesData);
      };
      fetchCourses();
    }
  }, [userRole, currentUser]);

  // Загрузка объявлений
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const visibleAnnouncements = announcementsData.filter(ann => {
        if (ann.target === 'all') return true;
        if (ann.target === 'students' && userRole === 'student') return true;
        if (ann.target === 'teachers' && userRole === 'teacher') return true;
        if (ann.target === 'course') return true;
        return false;
      });
      
      setAnnouncements(visibleAnnouncements);
      
      const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
      setUnreadCount(visibleAnnouncements.filter(a => !readIds.includes(a.id)).length);
    });
    
    return () => unsubscribe();
  }, [userRole]);

  async function addAnnouncement() {
    if (!newAnnouncement.title.trim()) {
      alert('Введите заголовок');
      return;
    }
    
    if (!newAnnouncement.content.trim()) {
      alert('Введите текст объявления');
      return;
    }
    
    await addDoc(collection(db, 'announcements'), {
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      createdBy: currentUser.uid,
      createdByEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      target: newAnnouncement.target,
      targetCourseId: newAnnouncement.targetCourseId
    });
    
    setNewAnnouncement({ title: '', content: '', target: 'all', targetCourseId: '' });
    setShowAddModal(false);
    setModalPosition({ x: 0, y: 0 });
  }

  async function deleteAnnouncement(id, createdBy) {
    if (userRole !== 'admin' && createdBy !== currentUser.uid) {
      alert('Вы можете удалять только свои объявления');
      return;
    }
    
    if (window.confirm('Удалить объявление?')) {
      await deleteDoc(doc(db, 'announcements', id));
    }
  }

  function markAsRead(announcementId) {
    const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    if (!readIds.includes(announcementId)) {
      readIds.push(announcementId);
      localStorage.setItem('readAnnouncements', JSON.stringify(readIds));
      setUnreadCount(announcements.filter(a => !readIds.includes(a.id)).length);
    }
  }

  const getTargetLabel = (target) => {
    switch(target) {
      case 'all': return '🌍 Для всех';
      case 'students': return '🎓 Студентам';
      case 'teachers': return '👨‍🏫 Преподавателям';
      case 'course': return '📚 Для курса';
      default: return '🌍 Для всех';
    }
  };

  return (
    <div className="announcements-container" ref={dropdownRef}>
      <button className="announcement-bell" onClick={() => setShowAnnouncements(!showAnnouncements)}>
        <FaBullhorn />
        {unreadCount > 0 && <span className="announcement-badge">{unreadCount}</span>}
      </button>

      {showAnnouncements && (
        <div className="announcement-dropdown">
          <div className="announcement-header">
            <h3>📢 Объявления</h3>
            {(userRole === 'admin' || userRole === 'teacher') && (
              <button className="add-announcement-btn" onClick={() => setShowAddModal(true)}>
                <FaPlus /> Создать
              </button>
            )}
          </div>
          
          <div className="announcement-list">
            {announcements.length === 0 ? (
              <div className="announcement-empty">
                <div className="empty-icon">📢</div>
                <p>Нет объявлений</p>
              </div>
            ) : (
              announcements.map(ann => (
                <div 
                  key={ann.id} 
                  className="announcement-item"
                  onClick={() => markAsRead(ann.id)}
                >
                  <div className="announcement-title">
                    <strong>{ann.title}</strong>
                    <span className="announcement-badge-target">
                      {getTargetLabel(ann.target)}
                    </span>
                    {(userRole === 'admin' || (userRole === 'teacher' && ann.createdBy === currentUser.uid)) && (
                      <button 
                        className="delete-announcement"
                        onClick={(e) => { e.stopPropagation(); deleteAnnouncement(ann.id, ann.createdBy); }}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                  <div className="announcement-content">{ann.content}</div>
                  <div className="announcement-meta">
                    <span>👤 {ann.createdByEmail?.split('@')[0]}</span>
                    <span>📅 {new Date(ann.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div 
            className="modal-content announcements-modal" 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            ref={modalRef}
            style={{
              transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
              cursor: isDragging ? 'grabbing' : 'default'
            }}
          >
            <div className="modal-header">
              <div className="drag-icon">
                <FaPlus />
              </div>
              <h3>Создать объявление</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <FaTimes />
              </button>
            </div>
            
            <div className="form-group">
              <label>👥 Кому показывать</label>
              <select 
                value={newAnnouncement.target} 
                onChange={(e) => setNewAnnouncement({...newAnnouncement, target: e.target.value})}
              >
                <option value="all">🌍 Всем пользователям</option>
                <option value="students">🎓 Только студентам</option>
                <option value="teachers">👨‍🏫 Только преподавателям</option>
                {courses.length > 0 && (
                  <option value="course">📚 Студентам конкретного курса</option>
                )}
              </select>
            </div>
            
            {newAnnouncement.target === 'course' && (
              <div className="form-group">
                <label>📚 Выберите курс</label>
                <select 
                  value={newAnnouncement.targetCourseId} 
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, targetCourseId: e.target.value})}
                >
                  <option value="">Выберите курс</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-group">
              <input
                type="text"
                placeholder="Заголовок объявления"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <textarea
                placeholder="Текст объявления"
                rows="4"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
              />
            </div>
            
            <button className="submit-announcement" onClick={addAnnouncement}>
              📢 Опубликовать
            </button>
          </div>
        </div>
      )}
    </div>
  );
}