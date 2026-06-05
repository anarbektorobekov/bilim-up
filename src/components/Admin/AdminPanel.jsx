import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { 
  collection, getDocs, doc, updateDoc, deleteDoc, 
  setDoc, getDoc, query, where, orderBy 
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  FaUsers, FaBookOpen, FaExclamationTriangle, FaBan, 
  FaChartLine, FaUserGraduate, FaChalkboardTeacher, 
  FaEdit, FaTrash, FaCheck, FaTimes, FaSearch,
  FaCrown, FaUserShield, FaUser, FaChevronRight
} from 'react-icons/fa';

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [reports, setReports] = useState([]);
  const [banned, setBanned] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [banDuration, setBanDuration] = useState(7);
  const [banReason, setBanReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTeacherTerm, setSearchTeacherTerm] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    totalReports: 0,
    totalBanned: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        avatarUrl: doc.data().avatarUrl || null
      }));
      setUsers(usersData);
      
      const students = usersData.filter(u => u.role === 'student');
      const teachers = usersData.filter(u => u.role === 'teacher');
      
      const coursesSnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
      
      const reportsSnapshot = await getDocs(query(collection(db, 'reports'), orderBy('timestamp', 'desc')));
      const reportsData = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(reportsData);
      
      const bannedSnapshot = await getDocs(collection(db, 'banned'));
      const bannedData = bannedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        expired: new Date(doc.data().bannedUntil) < new Date()
      }));
      setBanned(bannedData);
      
      setStats({
        totalUsers: usersData.length,
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalCourses: coursesData.length,
        totalReports: reportsData.filter(r => r.status === 'pending').length,
        totalBanned: bannedData.filter(b => !b.expired).length
      });
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRole(userId, newRole) {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      fetchAllData();
      alert('Роль пользователя обновлена');
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  }

  async function deleteUser(userId) {
    if (window.confirm('Удалить пользователя? Он сможет зарегистрироваться снова')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        fetchAllData();
        alert('Пользователь удален');
      } catch (error) {
        alert('Ошибка: ' + error.message);
      }
    }
  }

  async function banUser(userId, userEmail, days, reason) {
    if (!reason.trim()) {
      alert('Введите причину бана');
      return;
    }
    
    const bannedUntil = new Date();
    bannedUntil.setDate(bannedUntil.getDate() + days);
    
    try {
      await setDoc(doc(db, 'banned', userId), {
        userId: userId,
        userEmail: userEmail,
        bannedUntil: bannedUntil.toISOString(),
        reason: reason,
        bannedBy: currentUser.uid,
        bannedAt: new Date().toISOString(),
        duration: days
      });
      
      alert(`Пользователь ${userEmail} забанен на ${days} дней`);
      fetchAllData();
      setSelectedUser(null);
      setBanReason('');
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  }

  async function unbanUser(userId) {
    try {
      await deleteDoc(doc(db, 'banned', userId));
      alert('Пользователь разбанен');
      fetchAllData();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  }

  async function deleteCourse(courseId) {
    if (window.confirm('Удалить курс? Все данные будут потеряны!')) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
        fetchAllData();
        alert('Курс удален');
      } catch (error) {
        alert('Ошибка: ' + error.message);
      }
    }
  }

  async function transferCourse(courseId, newTeacherId) {
    const newTeacher = users.find(u => u.id === newTeacherId);
    if (!newTeacher) return;
    
    try {
      await updateDoc(doc(db, 'courses', courseId), {
        teacherId: newTeacherId,
        teacherName: newTeacher.email,
        transferredAt: new Date().toISOString(),
        transferredBy: currentUser.uid
      });
      alert(`Курс передан преподавателю ${newTeacher.email}`);
      fetchAllData();
      setSelectedCourse(null);
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  }

  async function resolveReport(reportId) {
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: currentUser.uid
      });
      fetchAllData();
      alert('Жалоба обработана');
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  }

  const isUserBanned = (userId) => {
    const ban = banned.find(b => b.userId === userId);
    if (!ban) return false;
    return new Date(ban.bannedUntil) > new Date();
  };

  const getBanInfo = (userId) => {
    return banned.find(b => b.userId === userId);
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCourses = courses.filter(course => 
    course.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReports = reports.filter(report => 
    report.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.reportedByEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBanned = banned.filter(ban => 
    ban.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeachers = selectedCourse ? users.filter(t => 
    t.role === 'teacher' && 
    t.id !== selectedCourse.teacherId &&
    t.email?.toLowerCase().includes(searchTeacherTerm.toLowerCase())
  ) : [];

  const statsCards = [
    { icon: <FaUsers />, value: stats.totalUsers, label: 'Всего пользователей', color: '#6366f1' },
    { icon: <FaUserGraduate />, value: stats.totalStudents, label: 'Студентов', color: '#10b981' },
    { icon: <FaChalkboardTeacher />, value: stats.totalTeachers, label: 'Преподавателей', color: '#f59e0b' },
    { icon: <FaBookOpen />, value: stats.totalCourses, label: 'Всего курсов', color: '#a855f7' },
    { icon: <FaExclamationTriangle />, value: stats.totalReports, label: 'Жалоб', color: '#ef4444' },
    { icon: <FaBan />, value: stats.totalBanned, label: 'Забаненных', color: '#dc2626' },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Загрузка панели управления...</div>;
  }

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 80px)', 
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      padding: '2rem',
      position: 'relative'
    }}>
      {/* Заголовок */}
      <motion.div 
        style={{ textAlign: 'center', marginBottom: '2rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <FaCrown style={{ fontSize: '1.8rem', color: '#f59e0b' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Панель администратора</h1>
        </div>
        <p style={{ color: '#9ca3af' }}>Управление пользователями, курсами и безопасностью</p>
      </motion.div>

      {/* Статистика */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(6, 1fr)', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        {statsCards.map((stat, index) => (
          <motion.div
            key={index}
            style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid rgba(255,255,255,0.08)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5 }}
          >
            <div style={{ fontSize: '2rem', color: stat.color }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg, #fff 0%, #9ca3af 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stat.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Табы */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: activeTab === 'users' ? 'rgba(167,139,250,0.15)' : 'none', border: 'none', color: activeTab === 'users' ? '#a78bfa' : '#9ca3af', cursor: 'pointer', borderRadius: '30px' }}
          onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
        >
          <FaUsers /> Пользователи ({users.length})
        </button>
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: activeTab === 'courses' ? 'rgba(167,139,250,0.15)' : 'none', border: 'none', color: activeTab === 'courses' ? '#a78bfa' : '#9ca3af', cursor: 'pointer', borderRadius: '30px' }}
          onClick={() => { setActiveTab('courses'); setSearchTerm(''); }}
        >
          <FaBookOpen /> Курсы ({courses.length})
        </button>
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: activeTab === 'reports' ? 'rgba(167,139,250,0.15)' : 'none', border: 'none', color: activeTab === 'reports' ? '#a78bfa' : '#9ca3af', cursor: 'pointer', borderRadius: '30px' }}
          onClick={() => { setActiveTab('reports'); setSearchTerm(''); }}
        >
          <FaExclamationTriangle /> Жалобы ({stats.totalReports})
        </button>
        <button 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: activeTab === 'banned' ? 'rgba(167,139,250,0.15)' : 'none', border: 'none', color: activeTab === 'banned' ? '#a78bfa' : '#9ca3af', cursor: 'pointer', borderRadius: '30px' }}
          onClick={() => { setActiveTab('banned'); setSearchTerm(''); }}
        >
          <FaBan /> Забаненные ({stats.totalBanned})
        </button>
      </div>

      {/* Поиск */}
      <div style={{ position: 'relative', marginBottom: '1.5rem', maxWidth: '400px' }}>
        <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
        <input
          type="text"
          placeholder="Поиск..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px', color: 'white', fontSize: '0.9rem' }}
        />
      </div>

      {/* Пользователи */}
      {activeTab === 'users' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Пользователь</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Роль</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Статус</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Пользователи не найдены</td></tr>
              ) : (
                filteredUsers.map(user => {
                  const banned = isUserBanned(user.id);
                  const banInfo = getBanInfo(user.id);
                  return (
                    <tr key={user.id} style={banned ? { background: 'rgba(239,68,68,0.1)', opacity: 0.8 } : {}}>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'white',
                            overflow: 'hidden'
                          }}>
                            {user.avatarUrl ? (
                              <img 
                                src={user.avatarUrl} 
                                alt="avatar" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              user.email?.[0]?.toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'white' }}>{user.email}</div>
                            <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>ID: {user.id?.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <select 
                          value={user.role || 'student'} 
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          style={{
                            backgroundColor: '#2a2a3e',
                            color: 'white',
                            border: '1px solid #a78bfa',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        >
                          <option style={{ backgroundColor: '#1e1e2e', color: 'white' }} value="student">📖 Студент</option>
                          <option style={{ backgroundColor: '#1e1e2e', color: 'white' }} value="teacher">👨‍🏫 Преподаватель</option>
                          <option style={{ backgroundColor: '#1e1e2e', color: 'white' }} value="admin">👑 Администратор</option>
                        </select>
                       </td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {banned ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: 'rgba(239,68,68,0.15)', borderRadius: '20px', color: '#ef4444', fontSize: '0.7rem' }}>🔒 Забанен до {new Date(banInfo.bannedUntil).toLocaleDateString()}</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: 'rgba(16,185,129,0.15)', borderRadius: '20px', color: '#10b981', fontSize: '0.7rem' }}>✅ Активен</span>
                        )}
                       </td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <button style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', padding: '0.3rem 0.8rem', borderRadius: '20px', color: '#a78bfa', fontSize: '0.7rem', cursor: 'pointer', marginRight: '0.5rem' }} onClick={() => setSelectedUser(user)}>⚙️ Управление</button>
                        {user.role !== 'admin' && (
                          <button style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.3rem 0.6rem', borderRadius: '20px', color: '#ef4444', cursor: 'pointer' }} onClick={() => deleteUser(user.id)}><FaTrash /></button>
                        )}
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Курсы */}
      {activeTab === 'courses' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Курс</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Преподаватель</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Информация</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Курсы не найдены</td></tr>
              ) : (
                filteredCourses.map(course => {
                  const teacher = users.find(u => u.id === course.teacherId);
                  return (
                    <tr key={course.id}>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div style={{ width: '40px', height: '40px', background: 'rgba(167,139,250,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>{course.icon || '📚'}</div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'white' }}>{course.title}</div>
                            <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>ID: {course.id?.slice(0, 8)}...</div>
                          </div>
                        </div>
                       </td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'white' }}>
                        {teacher?.email || course.teacherName || 'Не указан'}
                       </td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', fontSize: '0.7rem', color: '#9ca3af' }}>
                          <span>📊 {course.level || 'Начинающий'}</span>
                          <span>⏱️ {course.duration || 'Не указано'}</span>
                          <span>👥 {course.studentsCount || 0}</span>
                        </div>
                       </td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <button style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.3rem 0.8rem', borderRadius: '20px', color: '#f59e0b', fontSize: '0.7rem', cursor: 'pointer', marginRight: '0.5rem' }} onClick={() => setSelectedCourse(course)}>📤 Передать</button>
                        <button style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.3rem 0.6rem', borderRadius: '20px', color: '#ef4444', cursor: 'pointer' }} onClick={() => deleteCourse(course.id)}><FaTrash /></button>
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Жалобы */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>✅</div>
              <h3 style={{ color: 'white' }}>Жалобы не найдены</h3>
            </div>
          ) : (
            filteredReports.map((report, index) => (
              <motion.div
                key={report.id}
                style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.2rem', borderLeft: `3px solid ${report.status === 'pending' ? '#ef4444' : '#10b981'}`, opacity: report.status === 'resolved' ? 0.7 : 1 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#9ca3af' }}>
                    <span>👤 {report.reportedByEmail || report.reportedBy}</span>
                    <FaChevronRight />
                    <span>👤 {report.reportedUserId?.slice(0, 8)}...</span>
                  </div>
                  <div style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', background: report.status === 'pending' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: report.status === 'pending' ? '#ef4444' : '#10b981' }}>
                    {report.status === 'pending' ? '🟡 Ожидает' : '✅ Решено'}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.85rem', color: '#e5e7eb' }}>
                  <div><strong>Причина:</strong> {report.reason}</div>
                  <div>{new Date(report.timestamp).toLocaleString()}</div>
                </div>
                {report.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button style={{ background: 'rgba(16,185,129,0.15)', border: 'none', padding: '0.3rem 1rem', borderRadius: '20px', color: '#10b981', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => resolveReport(report.id)}><FaCheck /> Отметить как решённое</button>
                    <button style={{ background: 'rgba(239,68,68,0.15)', border: 'none', padding: '0.3rem 1rem', borderRadius: '20px', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }} onClick={() => { const reportedUser = users.find(u => u.id === report.reportedUserId); if (reportedUser) setSelectedUser(reportedUser); }}><FaBan /> Забанить пользователя</button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Забаненные */}
      {activeTab === 'banned' && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Пользователь</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Причина</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Забанен до</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 600, fontSize: '0.8rem' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanned.filter(b => !b.expired).length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Нет забаненных пользователей</td></tr>
              ) : (
                filteredBanned.filter(b => !b.expired).map(ban => {
                  const user = users.find(u => u.id === ban.userId);
                  return (
                    <tr key={ban.userId}>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: 'white',
                            overflow: 'hidden'
                          }}>
                            {user?.avatarUrl ? (
                              <img 
                                src={user.avatarUrl} 
                                alt="avatar" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              ban.userEmail?.[0]?.toUpperCase() || '🚫'
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: 'white' }}>{ban.userEmail}</div>
                          </div>
                        </div>
                       </td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', maxWidth: '200px', wordBreak: 'break-word', fontSize: '0.8rem', color: '#e5e7eb' }}>{ban.reason}</td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#ef4444' }}>{new Date(ban.bannedUntil).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <button style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', padding: '0.3rem 0.8rem', borderRadius: '20px', color: '#10b981', fontSize: '0.7rem', cursor: 'pointer' }} onClick={() => unbanUser(ban.userId)}>🔓 Разбанить</button>
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно управления пользователем */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setSelectedUser(null)}>
          <div style={{ background: '#1a1a2e', borderRadius: '24px', padding: '1.5rem', maxWidth: '500px', width: '90%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid rgba(167,139,250,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'white' }}>Управление пользователем</h3>
              <button style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setSelectedUser(null)}>✖</button>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginBottom: '1.5rem' }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'white',
                overflow: 'hidden'
              }}>
                {selectedUser.avatarUrl ? (
                  <img 
                    src={selectedUser.avatarUrl} 
                    alt="avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  selectedUser.email?.[0]?.toUpperCase()
                )}
              </div>
              <div>
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#e5e7eb' }}><strong style={{ color: 'white' }}>📧 Email:</strong> {selectedUser.email}</p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#e5e7eb' }}><strong style={{ color: 'white' }}>🎓 Роль:</strong> {selectedUser.role || 'student'}</p>
                <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#e5e7eb' }}><strong style={{ color: 'white' }}>📅 Регистрация:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
              <h4 style={{ color: 'white', marginBottom: '0.8rem' }}>🔒 Забанить пользователя</h4>
              <select value={banDuration} onChange={(e) => setBanDuration(parseInt(e.target.value))} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }}>
                <option value={1}>1 день</option>
                <option value={3}>3 дня</option>
                <option value={7}>7 дней</option>
                <option value={30}>30 дней</option>
                <option value={365}>Навсегда</option>
              </select>
              <input type="text" placeholder="Причина бана" value={banReason} onChange={(e) => setBanReason(e.target.value)} style={{ width: '100%', marginBottom: '0.5rem', padding: '0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
              <button style={{ width: '100%', padding: '0.6rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer' }} onClick={() => banUser(selectedUser.id, selectedUser.email, banDuration, banReason)}><FaBan /> Забанить</button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
              <h4 style={{ color: 'white', marginBottom: '0.8rem' }}>🎓 Сменить роль</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={{ flex: 1, padding: '0.5rem', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', color: '#10b981', cursor: 'pointer' }} onClick={() => updateUserRole(selectedUser.id, 'student')}><FaUser /> Студент</button>
                <button style={{ flex: 1, padding: '0.5rem', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', color: '#f59e0b', cursor: 'pointer' }} onClick={() => updateUserRole(selectedUser.id, 'teacher')}><FaChalkboardTeacher /> Преподаватель</button>
                <button style={{ flex: 1, padding: '0.5rem', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '12px', color: '#a78bfa', cursor: 'pointer' }} onClick={() => updateUserRole(selectedUser.id, 'admin')}><FaUserShield /> Админ</button>
              </div>
            </div>

            {selectedUser.role !== 'admin' && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
                <h4 style={{ color: '#ef4444', marginBottom: '0.8rem' }}>⚠️ Опасная зона</h4>
                <button style={{ width: '100%', padding: '0.6rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#ef4444', cursor: 'pointer' }} onClick={() => deleteUser(selectedUser.id)}><FaTrash /> Удалить пользователя навсегда</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно передачи курса */}
      {selectedCourse && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => {
            setSelectedCourse(null);
            setSearchTeacherTerm('');
          }}
        >
          <div
            style={{
              backgroundColor: '#1e1e2e',
              borderRadius: '16px',
              padding: '24px',
              width: '450px',
              maxWidth: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid #a78bfa'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: 'white', marginBottom: '16px', fontSize: '18px' }}>
              Передать курс "{selectedCourse.title}"
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="🔍 Поиск преподавателя по email..."
                value={searchTeacherTerm}
                onChange={(e) => setSearchTeacherTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: '#2a2a3e',
                  border: '1px solid #3a3a4e',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <p style={{ color: '#a78bfa', marginBottom: '12px', fontSize: '14px' }}>
              Выберите нового преподавателя:
            </p>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {filteredTeachers.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                  {searchTeacherTerm ? 'Преподаватели не найдены' : 'Нет других преподавателей'}
                </p>
              ) : (
                filteredTeachers.map(teacher => (
                  <button
                    key={teacher.id}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px',
                      marginBottom: '8px',
                      backgroundColor: '#2a2a3e',
                      border: '1px solid #3a3a4e',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '14px'
                    }}
                    onClick={() => transferCourse(selectedCourse.id, teacher.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#3a3a5e';
                      e.currentTarget.style.borderColor = '#a78bfa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a3e';
                      e.currentTarget.style.borderColor = '#3a3a4e';
                    }}
                  >
                    👨‍🏫 {teacher.email}
                  </button>
                ))
              )}
            </div>
            
            <button
              style={{
                marginTop: '16px',
                padding: '10px',
                backgroundColor: '#3a3a4e',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                width: '100%'
              }}
              onClick={() => {
                setSelectedCourse(null);
                setSearchTeacherTerm('');
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}