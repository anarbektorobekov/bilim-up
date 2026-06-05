import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FaUserGraduate, FaBookOpen, FaCheckCircle, FaClock, FaStar, FaUsers, FaChartLine } from 'react-icons/fa';
import '../../styles/dashboard.css';

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('studying');
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalHours: 0,
    averageProgress: 0
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'studying') {
      setActiveTab('studying');
    }
    fetchData();
  }, [currentUser, location]);

  async function fetchData() {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      let enrolledCourses = userData?.enrolledCourses || [];
      
      // Удаляем дубликаты по courseId
      const uniqueCourses = [];
      const seenIds = new Set();
      for (const course of enrolledCourses) {
        if (!seenIds.has(course.courseId)) {
          seenIds.add(course.courseId);
          uniqueCourses.push(course);
        }
      }
      
      // Если были дубликаты - обновляем в Firebase
      if (uniqueCourses.length !== enrolledCourses.length) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          enrolledCourses: uniqueCourses
        });
        enrolledCourses = uniqueCourses;
      }
      
      const coursesData = [];
      for (const enrolled of enrolledCourses) {
        const courseDoc = await getDoc(doc(db, 'courses', enrolled.courseId));
        if (courseDoc.exists()) {
          const course = courseDoc.data();
          const lessonsCount = course.levels?.reduce((acc, level) => acc + (level.lessons?.length || 0), 0) || 1;
          coursesData.push({
            id: enrolled.courseId,
            title: enrolled.courseTitle,
            description: course.description || '',
            progress: enrolled.progress || 0,
            status: enrolled.progress === 100 ? 'completed' : 'studying',
            lessons: lessonsCount,
            completedLessons: enrolled.completedLessons || 0,
            icon: course.icon || '📚',
            duration: course.duration || '40ч',
            rating: course.rating || 4.8
          });
        }
      }
      
      setMyCourses(coursesData);
      
      const studyingCourses = coursesData.filter(c => c.status === 'studying');
      const completedCourses = coursesData.filter(c => c.status === 'completed');
      const totalProgress = studyingCourses.reduce((acc, c) => acc + c.progress, 0);
      const avgProgress = studyingCourses.length > 0 ? Math.round(totalProgress / studyingCourses.length) : 0;
      
      setStats({
        totalCourses: coursesData.length,
        completedCourses: completedCourses.length,
        totalHours: coursesData.reduce((acc, c) => acc + (parseInt(c.duration) || 0), 0),
        averageProgress: avgProgress
      });
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  }

  const studyingCourses = myCourses.filter(c => c.status === 'studying');
  const completedCourses = myCourses.filter(c => c.status === 'completed');

  if (loading) {
    return <div className="loading-spinner">Загрузка...</div>;
  }

  return (
    <div className="dashboard-modern">
      <div className="dashboard-bg-gradient"></div>
      
      <div className="dashboard-container">
        <motion.div 
          className="dashboard-welcome"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="welcome-content">
            <h1>С возвращением, <span className="username">{currentUser?.email?.split('@')[0]}!</span></h1>
            <p>Продолжите обучение и достигайте новых вершин</p>
          </div>
          <div className="welcome-stats">
            <div className="stat-badge">
              <FaUserGraduate />
              <span>{stats.totalCourses} курсов</span>
            </div>
            <div className="stat-badge">
              <FaClock />
              <span>{stats.totalHours}+ часов</span>
            </div>
          </div>
        </motion.div>

        <div className="stats-grid-dashboard">
          <motion.div className="stat-card-dashboard" whileHover={{ y: -5 }}>
            <div className="stat-icon-dashboard">📚</div>
            <div className="stat-value-dashboard">{studyingCourses.length}</div>
            <div className="stat-label-dashboard">Курсов в процессе</div>
          </motion.div>
          <motion.div className="stat-card-dashboard" whileHover={{ y: -5 }}>
            <div className="stat-icon-dashboard">✅</div>
            <div className="stat-value-dashboard">{stats.completedCourses}</div>
            <div className="stat-label-dashboard">Завершенных курсов</div>
          </motion.div>
          <motion.div className="stat-card-dashboard" whileHover={{ y: -5 }}>
            <div className="stat-icon-dashboard">📊</div>
            <div className="stat-value-dashboard">{stats.averageProgress}%</div>
            <div className="stat-label-dashboard">Средний прогресс</div>
          </motion.div>
          <motion.div className="stat-card-dashboard" whileHover={{ y: -5 }}>
            <div className="stat-icon-dashboard">🎓</div>
            <div className="stat-value-dashboard">{stats.totalHours}</div>
            <div className="stat-label-dashboard">Всего часов</div>
          </motion.div>
        </div>

        <div className="dashboard-tabs-modern">
          <button 
            className={`dash-tab-modern ${activeTab === 'studying' ? 'active' : ''}`}
            onClick={() => setActiveTab('studying')}
          >
            📚 В процессе ({studyingCourses.length})
          </button>
          <button 
            className={`dash-tab-modern ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            🎓 Завершено ({completedCourses.length})
          </button>
        </div>

        {activeTab === 'studying' && (
          <div className="courses-grid-dashboard">
            {studyingCourses.length === 0 ? (
              <motion.div className="empty-state-dashboard">
                <div className="empty-icon">📚</div>
                <h3>У вас пока нет курсов</h3>
                <p>Перейдите в каталог и запишитесь на первый курс</p>
                <button className="btn-primary-glow-small" onClick={() => navigate('/')}>Перейти к курсам</button>
              </motion.div>
            ) : (
              studyingCourses.map((course) => (
                <motion.div
                  key={course.id}
                  className="course-card-dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="course-card-left">
                    <div className="course-icon-large">{course.icon}</div>
                    <div className="course-info-dashboard">
                      <h3>{course.title}</h3>
                      <p>{course.description?.substring(0, 80)}</p>
                      <div className="course-meta-dashboard">
                        <div className="meta-item"><FaStar /> {course.rating}</div>
                        <div className="meta-item"><FaClock /> {course.duration}</div>
                        <div className="meta-item"><FaBookOpen /> {course.completedLessons}/{course.lessons} уроков</div>
                      </div>
                      <div className="progress-section">
                        <div className="progress-info"><span>Прогресс: {course.progress}%</span></div>
                        <div className="progress-bar-dashboard"><div className="progress-fill-dashboard" style={{ width: `${course.progress}%` }}></div></div>
                      </div>
                    </div>
                  </div>
                  <button className="continue-btn-glow" onClick={() => navigate(`/course/${course.id}`)}>Продолжить →</button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="courses-grid-dashboard">
            {completedCourses.length === 0 ? (
              <motion.div className="empty-state-dashboard">
                <div className="empty-icon">🎓</div>
                <h3>Нет завершенных курсов</h3>
                <p>Продолжайте обучение, чтобы получить сертификаты</p>
              </motion.div>
            ) : (
              completedCourses.map((course) => (
                <motion.div
                  key={course.id}
                  className="course-card-dashboard completed"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="course-card-left">
                    <div className="course-icon-large completed-icon">🏆</div>
                    <div className="course-info-dashboard">
                      <h3>{course.title}</h3>
                      <p>{course.description?.substring(0, 80)}</p>
                      <div className="completion-badge-dashboard">
                        <span className="completed-badge-glow">✅ Завершен</span>
                        <span className="certificate-link-glow">🎓 Получить сертификат</span>
                      </div>
                    </div>
                  </div>
                  <button className="review-btn-glow" onClick={() => navigate(`/course/${course.id}`)}>Повторить курс →</button>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}