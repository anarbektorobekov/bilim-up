import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs, doc, updateDoc, arrayUnion, getDoc, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { FaUsers, FaStar, FaGraduationCap, FaChartLine, FaSearch } from 'react-icons/fa';
import '../styles/global.css';
import '../styles/homepage.css';
import '../styles/responsive.css';

export default function HomePage() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    averageRating: 4.8,
    satisfactionRate: 94
  });

  useEffect(() => {
    fetchCourses();
    fetchRealStats();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(course =>
        course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.teacherName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, courses]);

  async function fetchCourses() {
    try {
      const q = query(collection(db, 'courses'), where('status', '==', 'published'));
      const querySnapshot = await getDocs(q);
      const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const coursesWithRatings = await Promise.all(coursesData.map(async (course) => {
        const reviewsQuery = query(collection(db, 'reviews'), where('courseId', '==', course.id));
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviews = reviewsSnapshot.docs.map(doc => doc.data());
        const avgRating = reviews.length > 0 
          ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          : 4.5;
        return { ...course, averageRating: avgRating, reviewsCount: reviews.length };
      }));
      
      setCourses(coursesWithRatings);
      setFilteredCourses(coursesWithRatings);
    } catch (error) {
      console.error('Ошибка:', error);
      setCourses([
        { id: '1', title: 'Веб-разработка с нуля', description: 'HTML, CSS, JavaScript, React', rating: 4.9, studentsCount: 1234, price: 'Бесплатно', level: 'Начинающий', duration: '40 часов', icon: '💻', teacherName: 'Admin', status: 'published' },
        { id: '2', title: 'JavaScript Продвинутый', description: 'Асинхронность, замыкания, прототипы', rating: 4.8, studentsCount: 856, price: 'Бесплатно', level: 'Средний', duration: '35 часов', icon: '⚛️', teacherName: 'Admin', status: 'published' },
      ]);
      setFilteredCourses([
        { id: '1', title: 'Веб-разработка с нуля', description: 'HTML, CSS, JavaScript, React', rating: 4.9, studentsCount: 1234, price: 'Бесплатно', level: 'Начинающий', duration: '40 часов', icon: '💻', teacherName: 'Admin', status: 'published' },
        { id: '2', title: 'JavaScript Продвинутый', description: 'Асинхронность, замыкания, прототипы', rating: 4.8, studentsCount: 856, price: 'Бесплатно', level: 'Средний', duration: '35 часов', icon: '⚛️', teacherName: 'Admin', status: 'published' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRealStats() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => doc.data());
      const studentsCount = usersData.filter(user => user.role === 'student').length;
      const teachersCount = usersData.filter(user => user.role === 'teacher').length;
      const coursesSnapshot = await getDocs(query(collection(db, 'courses'), where('status', '==', 'published')));
      const coursesCount = coursesSnapshot.size;
      setStats({
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        totalCourses: coursesCount,
        averageRating: 4.8,
        satisfactionRate: 94
      });
    } catch (error) {
      console.error('Ошибка:', error);
    }
  }

  // 🚀 Функция для кнопки "Начать обучение"
  function handleStartLearning() {
    if (currentUser) {
      // Если пользователь уже зарегистрирован → перекидываем в кабинет
      if (userRole === 'student') {
        navigate('/student-dashboard');
      } else if (userRole === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } else {
      // Если не зарегистрирован → на страницу регистрации
      navigate('/register');
    }
  }

  // 📝 Функция для кнопки "Зарегистрироваться бесплатно"
  function handleRegister() {
    if (currentUser) {
      // Если уже зарегистрирован → перекидываем в кабинет
      if (userRole === 'student') {
        navigate('/student-dashboard');
      } else if (userRole === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } else {
      // Если не зарегистрирован → на страницу регистрации
      navigate('/register');
    }
  }

  async function handleCourseClick(courseId, courseTitle) {
    if (!currentUser) {
      navigate('/register');
      return;
    }
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const enrolledCourses = userData?.enrolledCourses || [];
      const alreadyEnrolled = enrolledCourses.some(c => c.courseId === courseId);
      if (!alreadyEnrolled) {
        const enrollment = {
          courseId: courseId,
          courseTitle: courseTitle,
          enrolledAt: new Date().toISOString(),
          progress: 0,
          completedLessons: 0,
          status: 'active'
        };
        await updateDoc(userRef, { enrolledCourses: [...enrolledCourses, enrollment] });
        alert(`Вы успешно записались на курс "${courseTitle}"!`);
      }
      if (userRole === 'student') {
        navigate('/student-dashboard?tab=studying');
      } else if (userRole === 'teacher') {
        navigate('/teacher-dashboard?tab=studying');
      } else {
        navigate('/student-dashboard?tab=studying');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      navigate('/student-dashboard?tab=studying');
    }
  }

  const statsData = [
    { icon: <FaUsers />, value: stats.totalStudents.toLocaleString() + '+', label: 'Активных студентов' },
    { icon: <FaGraduationCap />, value: stats.totalCourses + '+', label: 'Онлайн курсов' },
    { icon: <FaStar />, value: stats.averageRating, label: 'Средний рейтинг' },
    { icon: <FaChartLine />, value: stats.satisfactionRate + '%', label: 'Трудоустройство' },
  ];

  return (
    <div className="homepage-modern">
      {/* Hero секция */}
      <motion.div className="hero-modern" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
        <div className="hero-bg-gradient"></div>
        <div className="hero-content-modern">
          <motion.div className="hero-badge-modern">✨ Добро пожаловать в Bilim Up</motion.div>
          <motion.h1 className="hero-title-modern">
            Образование, которое
            <span className="title-gradient"> меняет жизнь</span>
          </motion.h1>
          <motion.p className="hero-description-modern">
            Освойте востребованные навыки с лучшими экспертами.
            Практические курсы, реальные проекты и помощь в трудоустройстве.
          </motion.p>
          <motion.div className="hero-buttons-modern">
            {/* 🚀 Кнопка "Начать обучение" */}
            <button onClick={handleStartLearning} className="btn-primary-glow">
              🚀 Начать обучение
            </button>
            {/* 📝 Кнопка "Зарегистрироваться бесплатно" - после регистрации ведёт в кабинет */}
            <button onClick={handleRegister} className="btn-secondary-glow">
              {currentUser ? '📋 Мой кабинет' : '📝 Зарегистрироваться бесплатно'}
            </button>
          </motion.div>
        </div>
        <div className="hero-stats-preview">
          <div className="stat-preview"><span className="stat-preview-value">{stats.totalStudents}</span><span className="stat-preview-label">Студентов</span></div>
          <div className="stat-divider"></div>
          <div className="stat-preview"><span className="stat-preview-value">{stats.totalCourses}</span><span className="stat-preview-label">Курсов</span></div>
          <div className="stat-divider"></div>
          <div className="stat-preview"><span className="stat-preview-value">98%</span><span className="stat-preview-label">Трудоустройство</span></div>
        </div>
      </motion.div>

      {/* Статистика */}
      <div className="stats-modern">
        <div className="stats-grid-modern">
          {statsData.map((stat, index) => (
            <motion.div key={index} className="stat-card-modern" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} whileHover={{ y: -5 }}>
              <div className="stat-icon-modern">{stat.icon}</div>
              <div className="stat-number-modern">{stat.value}</div>
              <div className="stat-label-modern">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Поиск курсов */}
      <div className="search-section">
        <div className="search-container-modern">
          <FaSearch className="search-icon-modern" />
          <input type="text" placeholder="Поиск курсов по названию, описанию или преподавателю..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input-modern" />
          {searchTerm && <button className="search-clear" onClick={() => setSearchTerm('')}>✖</button>}
        </div>
        {searchTerm && <div className="search-results-count">Найдено курсов: {filteredCourses.length}</div>}
      </div>

      {/* Секция курсов */}
      <div id="courses" className="courses-modern">
        <div className="section-header-modern">
          <motion.div className="section-badge">📚 Все курсы</motion.div>
          <motion.h2 className="section-title-modern">Выберите свой путь к <span className="title-gradient">успеху</span></motion.h2>
          <motion.p className="section-subtitle">{stats.totalCourses} курсов от ведущих экспертов</motion.p>
        </div>

        {loading ? (
          <div className="loading-spinner">Загрузка курсов...</div>
        ) : (
          <div className="courses-grid-modern">
            {filteredCourses.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Курсы не найдены</h3>
                <p>Попробуйте изменить поисковый запрос</p>
              </div>
            ) : (
              filteredCourses.map((course, index) => {
                const isEnrolled = currentUser && false;
                return (
                  <motion.div key={course.id} className="course-card-modern" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }} whileHover={{ y: -8 }}>
                    <div className="course-card-bg">
                      <div className="course-card-icon">{course.icon || '📚'}</div>
                      <div className="course-card-price">{course.price || 'Бесплатно'}</div>
                      {isEnrolled && <div className="course-enrolled-badge">✅ Записан</div>}
                    </div>
                    <div className="course-card-content">
                      <h3>{course.title}</h3>
                      <p>{course.description?.substring(0, 100)}...</p>
                      <div className="course-stats">
                        <div className="course-rating">
                          {[1,2,3,4,5].map(star => (
                            <FaStar key={star} className={star <= Math.round(course.averageRating || 0) ? 'star-filled' : 'star-empty'} />
                          ))}
                          <span>({course.reviewsCount || 0})</span>
                        </div>
                        <div className="course-level"><span>{course.level || 'Начинающий'}</span></div>
                        <div className="course-duration"><span>{course.duration || '40ч'}</span></div>
                      </div>
                      <div className="course-teacher">
                        <span className="teacher-name">👨‍🏫 {course.teacherName || 'Преподаватель'}</span>
                      </div>
                      <button className={`course-btn-modern ${isEnrolled ? 'enrolled' : ''}`} onClick={() => handleCourseClick(course.id, course.title)}>
                        {isEnrolled ? '📖 Продолжить обучение' : (currentUser ? '🚀 Начать обучение' : '📝 Записаться')} →
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* CTA секция */}
      <div className="cta-modern">
        <div className="cta-content-modern">
          <motion.h2>Готовы начать?</motion.h2>
          <motion.p>Присоединяйтесь к сообществу успешных студентов</motion.p>
          <motion.button className="btn-primary-glow-large" onClick={handleRegister} whileHover={{ scale: 1.05 }}>
            {currentUser ? '📋 Перейти в кабинет' : '📝 Зарегистрироваться бесплатно'}
          </motion.button>
        </div>
      </div>

      {/* Футер */}
      <footer className="footer-modern">
        <div className="footer-content-modern">
          <div className="footer-links">
            <div className="footer-column">
              <h4>О нас</h4>
              <Link to="/about" className="footer-link">О платформе</Link>
              <Link to="/teachers" className="footer-link">Преподаватели</Link>
              <Link to="/reviews" className="footer-link">Отзывы</Link>
            </div>
            <div className="footer-column">
              <h4>Курсы</h4>
              <Link to="/courses-page" className="footer-link">Все курсы</Link>
              <Link to="/courses-page?level=beginner" className="footer-link">Для начинающих</Link>
              <Link to="/courses-page?level=advanced" className="footer-link">Продвинутые</Link>
            </div>
            <div className="footer-column">
              <h4>Поддержка</h4>
              <Link to="/faq" className="footer-link">FAQ</Link>
              <Link to="/contacts" className="footer-link">Контакты</Link>
              <Link to="/help" className="footer-link">Помощь</Link>
            </div>
            <div className="footer-column">
              <h4>Соцсети</h4>
              <a href="https://t.me/bilimup" target="_blank" rel="noopener noreferrer" className="footer-link">Telegram</a>
              <a href="https://instagram.com/bilimup" target="_blank" rel="noopener noreferrer" className="footer-link">Instagram</a>
              <a href="https://youtube.com/@bilimup" target="_blank" rel="noopener noreferrer" className="footer-link">YouTube</a>
            </div>
          </div>
          <div className="footer-copyright-modern">
            <p>© 2024 Bilim Up. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}