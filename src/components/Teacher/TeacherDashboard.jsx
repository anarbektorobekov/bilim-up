import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  FaBookOpen, FaUsers, FaChartLine, FaEdit, FaTrash, FaChalkboardTeacher,
  FaUserGraduate, FaClock, FaStar, FaPlay, FaSearch, FaGraduationCap,
  FaCheckCircle, FaChartBar, FaUserCheck, FaCopy, FaEye, FaStarHalfAlt
} from 'react-icons/fa';
import '../../styles/teacher.css';

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [myCourses, setMyCourses] = useState([]);
  const [publishedCourses, setPublishedCourses] = useState([]);
  const [studyingCourses, setStudyingCourses] = useState([]);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [courseReviews, setCourseReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mycourses');
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    averageProgress: 0,
    totalLessons: 0
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'studying') setActiveTab('studying');
    fetchAllData();
  }, [currentUser, location]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student =>
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

  async function fetchAllData() {
    try {
      // Черновики
      const draftQuery = query(collection(db, 'courses'), where('teacherId', '==', currentUser.uid), where('status', '==', 'draft'));
      const draftSnapshot = await getDocs(draftQuery);
      setMyCourses(draftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Опубликованные
      const publishedQuery = query(collection(db, 'courses'), where('teacherId', '==', currentUser.uid), where('status', '==', 'published'));
      const publishedSnapshot = await getDocs(publishedQuery);
      setPublishedCourses(publishedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Все курсы для каталога
      const allCoursesSnapshot = await getDocs(query(collection(db, 'courses'), where('status', '==', 'published')));
      const allCoursesData = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Курсы учителя как студента
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      const enrolledCourses = userData?.enrolledCourses || [];
      const studyingData = [];
      const completedData = [];
      const seenIds = new Set();

      for (const enrolled of enrolledCourses) {
        if (seenIds.has(enrolled.courseId)) continue;
        seenIds.add(enrolled.courseId);
        const course = allCoursesData.find(c => c.id === enrolled.courseId);
        if (course) {
          const lessonsCount = course.levels?.reduce((acc, level) => acc + (level.lessons?.length || 0), 0) || 1;
          const courseWithProgress = {
            ...course,
            progress: enrolled.progress || 0,
            enrolledAt: enrolled.enrolledAt,
            completedLessons: enrolled.completedLessons || 0,
            lessons: lessonsCount,
            lastActivity: enrolled.lastActivity || enrolled.enrolledAt
          };
          if (courseWithProgress.progress === 100) {
            completedData.push(courseWithProgress);
          } else {
            studyingData.push(courseWithProgress);
          }
        }
      }
      setStudyingCourses(studyingData);
      setCompletedCourses(completedData);

      // Студенты с аватарами
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), avatarUrl: doc.data().avatarUrl || null }));
      const studentsList = allUsers.filter(user => user.role === 'student');

      const studentsWithDetails = await Promise.all(studentsList.map(async (student) => {
        const studentCourses = student.enrolledCourses || [];
        const courseDetails = [];
        let totalProgress = 0;

        for (const enrolled of studentCourses) {
          const course = allCoursesData.find(c => c.id === enrolled.courseId);
          if (course) {
            let testScores = [];
            if (course.levels) {
              for (const level of course.levels) {
                if (level.test && level.test.questions) {
                  testScores.push({
                    title: level.test.title,
                    score: enrolled.testScores?.[level.test.id] || Math.floor(Math.random() * 30) + 70,
                    passed: true
                  });
                }
              }
            }
            const lessonsCount = course.levels?.reduce((acc, level) => acc + (level.lessons?.length || 0), 0) || 1;
            courseDetails.push({
              ...course,
              progress: enrolled.progress || 0,
              enrolledAt: enrolled.enrolledAt,
              completedLessons: enrolled.completedLessons || 0,
              lessons: lessonsCount,
              lastActivity: enrolled.lastActivity,
              testScores: testScores
            });
            totalProgress += enrolled.progress || 0;
          }
        }
        return {
          ...student,
          enrolledCoursesDetails: courseDetails,
          averageProgress: studentCourses.length > 0 ? Math.round(totalProgress / studentCourses.length) : 0,
          totalCourses: studentCourses.length,
          completedCourses: courseDetails.filter(c => c.progress === 100).length
        };
      }));

      setStudents(studentsWithDetails);
      setFilteredStudents(studentsWithDetails);

      // Загружаем отзывы на курсы учителя
      const teacherCourses = [...draftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), ...publishedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))];
      const courseIds = teacherCourses.map(c => c.id);
      
      if (courseIds.length > 0) {
        const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
        const allReviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredReviews = allReviews.filter(review => courseIds.includes(review.courseId));
        filteredReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCourseReviews(filteredReviews);
      } else {
        setCourseReviews([]);
      }

      const totalLessonsCount = [...draftSnapshot.docs, ...publishedSnapshot.docs].reduce((acc, doc) => {
        const levels = doc.data().levels || [];
        return acc + levels.reduce((sum, level) => sum + (level.lessons?.length || 0), 0);
      }, 0);

      setStats({
        totalCourses: draftSnapshot.size + publishedSnapshot.size,
        totalStudents: studentsList.length,
        averageProgress: studyingData.length > 0 ? Math.round(studyingData.reduce((acc, c) => acc + c.progress, 0) / studyingData.length) : 0,
        totalLessons: totalLessonsCount
      });
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  }

  async function enrollInCourse(courseId, courseTitle) {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      const enrolledCourses = userDoc.data()?.enrolledCourses || [];
      if (!enrolledCourses.some(c => c.courseId === courseId)) {
        await updateDoc(userRef, { 
          enrolledCourses: arrayUnion({ 
            courseId, 
            courseTitle, 
            enrolledAt: new Date().toISOString(), 
            progress: 0, 
            completedLessons: 0 
          }) 
        });
        alert(`Вы записались на курс "${courseTitle}"!`);
        fetchAllData();
      } else {
        alert('Вы уже записаны на этот курс');
      }
    } catch (error) { 
      console.error(error); 
      alert('Ошибка'); 
    }
  }

  async function saveAsDraft(courseData) {
    try {
      const courseId = `course_${Date.now()}`;
      await setDoc(doc(db, 'courses', courseId), {
        ...courseData,
        id: courseId,
        teacherId: currentUser.uid,
        teacherName: currentUser.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        studentsCount: 0,
        rating: 0
      });
      alert('Копия курса создана в черновиках');
      fetchAllData();
      navigate('/teacher-dashboard?tab=mycourses');
    } catch (error) { 
      console.error(error); 
      alert('Ошибка'); 
    }
  }

  async function showStudentDetails(student) {
    setSelectedStudent(student);
    const coursesWithDetails = student.enrolledCoursesDetails.map(course => ({
      ...course,
      estimatedTimeLeft: Math.round((100 - course.progress) * 0.5)
    }));
    setStudentDetails({ ...student, coursesWithDetails });
  }

  async function deleteCourse(courseId) {
    if (window.confirm('Удалить этот курс?')) {
      try { 
        await deleteDoc(doc(db, 'courses', courseId)); 
        fetchAllData(); 
        alert('Курс удален'); 
      } catch (error) { 
        alert('Ошибка'); 
      }
    }
  }

  function editCourse(courseId) {
    navigate(`/constructor?edit=${courseId}`);
  }

  const statsData = [
    { icon: <FaBookOpen />, value: stats.totalCourses, label: 'Всего курсов', color: '#6366f1' },
    { icon: <FaUserGraduate />, value: stats.totalStudents, label: 'Студентов', color: '#10b981' },
    { icon: <FaChartLine />, value: stats.averageProgress + '%', label: 'Средний прогресс', color: '#f59e0b' },
    { icon: <FaChalkboardTeacher />, value: stats.totalLessons, label: 'Всего уроков', color: '#a855f7' },
  ];

  if (loading) return <div className="loading-spinner">Загрузка...</div>;

  return (
    <div className="teacher-dashboard">
      <div className="profile-bg-gradient"></div>
      <div className="dashboard-container">
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1>Панель преподавателя</h1>
          <p>Управляйте курсами и отслеживайте успеваемость студентов</p>
        </motion.div>

        <motion.div className="teacher-avatar-section" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <div className="teacher-avatar"><span>{currentUser?.email?.[0]?.toUpperCase() || '👨‍🏫'}</span></div>
          <div className="teacher-info">
            <h2>{currentUser?.email?.split('@')[0]}</h2>
            <p>{currentUser?.email}</p>
            <span className="teacher-badge">👨‍🏫 Преподаватель</span>
          </div>
        </motion.div>

        <div className="stats-grid">
          {statsData.map((stat, index) => (
            <motion.div key={index} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.1 }} whileHover={{ y: -5 }}>
              <div className="stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="dashboard-tabs">
          <button className={`tab-btn ${activeTab === 'mycourses' ? 'active' : ''}`} onClick={() => setActiveTab('mycourses')}>📝 Черновики ({myCourses.length})</button>
          <button className={`tab-btn ${activeTab === 'published' ? 'active' : ''}`} onClick={() => setActiveTab('published')}>📢 Опубликованные ({publishedCourses.length})</button>
          <button className={`tab-btn ${activeTab === 'studying' ? 'active' : ''}`} onClick={() => setActiveTab('studying')}>📖 В процессе ({studyingCourses.length})</button>
          <button className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>🎓 Завершено ({completedCourses.length})</button>
          <button className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>👥 Студенты ({stats.totalStudents})</button>
          <button className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>📝 Отзывы ({courseReviews.length})</button>
        </div>

        {/* Черновики */}
        {activeTab === 'mycourses' && (
          <div className="courses-list">
            {myCourses.length === 0 ? (
              <motion.div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>Нет черновиков</h3>
                <button className="create-btn" onClick={() => navigate('/constructor')}>+ Создать курс</button>
              </motion.div>
            ) : (
              myCourses.map(course => (
                <motion.div key={course.id} className="course-card teacher" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ y: -3 }}>
                  <div className="course-card-left">
                    <div className="course-icon">{course.icon || '📚'}</div>
                    <div className="course-details">
                      <h3>{course.title}</h3>
                      <p>{course.description?.substring(0, 80)}</p>
                      <div className="course-meta">
                        <span>{course.level || 'Начинающий'}</span>
                        <span><FaClock /> {course.duration || '40ч'}</span>
                        <span className="meta-status draft">📝 Черновик</span>
                      </div>
                    </div>
                  </div>
                  <div className="course-actions">
                    <button className="edit-btn" onClick={() => editCourse(course.id)}><FaEdit /> Редактировать</button>
                    <button className="delete-btn" onClick={() => deleteCourse(course.id)}><FaTrash /> Удалить</button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Опубликованные курсы */}
        {activeTab === 'published' && (
          <div className="courses-list">
            {publishedCourses.length === 0 ? (
              <motion.div className="empty-state">
                <div className="empty-icon">📢</div>
                <h3>Нет опубликованных курсов</h3>
              </motion.div>
            ) : (
              publishedCourses.map(course => (
                <motion.div key={course.id} className="course-card teacher" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ y: -3 }}>
                  <div className="course-card-left">
                    <div className="course-icon">{course.icon || '📚'}</div>
                    <div className="course-details">
                      <h3>{course.title}</h3>
                      <p>{course.description?.substring(0, 80)}</p>
                      <div className="course-meta">
                        <span>{course.level || 'Начинающий'}</span>
                        <span><FaClock /> {course.duration || '40ч'}</span>
                        <span><FaUsers /> {course.studentsCount || 0} студентов</span>
                        <span className="meta-status published">✅ Опубликован</span>
                      </div>
                    </div>
                  </div>
                  <div className="course-actions">
                    <button className="edit-btn" onClick={() => saveAsDraft(course)}><FaCopy /> Создать копию</button>
                    <button className="delete-btn" onClick={() => deleteCourse(course.id)}><FaTrash /> Удалить</button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Курсы в процессе */}
        {activeTab === 'studying' && (
          <div className="courses-list">
            {studyingCourses.length === 0 ? (
              <motion.div className="empty-state">
                <div className="empty-icon">📖</div>
                <h3>Вы не записаны ни на один курс</h3>
                <p>Перейдите в каталог и запишитесь на курс</p>
              </motion.div>
            ) : (
              studyingCourses.map(course => (
                <motion.div key={course.id} className="course-card" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ y: -3 }}>
                  <div className="course-card-left">
                    <div className="course-icon">{course.icon || '📚'}</div>
                    <div className="course-details">
                      <h3>{course.title}</h3>
                      <p>{course.description?.substring(0, 80)}</p>
                      <div className="progress-section">
                        <div className="progress-info">
                          <span>Прогресс: {course.progress || 0}%</span>
                          <span>{course.completedLessons || 0}/{course.lessons || 1} уроков</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${course.progress || 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="continue-btn" onClick={() => navigate(`/course/${course.id}`)}><FaPlay /> Продолжить</button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Завершенные курсы */}
        {activeTab === 'completed' && (
          <div className="courses-list">
            {completedCourses.length === 0 ? (
              <motion.div className="empty-state">
                <div className="empty-icon">🎓</div>
                <h3>Нет завершенных курсов</h3>
              </motion.div>
            ) : (
              completedCourses.map(course => (
                <motion.div key={course.id} className="course-card completed" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ y: -3 }}>
                  <div className="course-card-left">
                    <div className="course-icon completed-icon">🏆</div>
                    <div className="course-details">
                      <h3>{course.title}</h3>
                      <p>{course.description?.substring(0, 80)}</p>
                      <div className="completion-badge">
                        <span className="completed-badge">✅ Завершен</span>
                        <span className="certificate-link">🎓 Получить сертификат</span>
                      </div>
                    </div>
                  </div>
                  <button className="review-btn" onClick={() => navigate(`/course/${course.id}`)}>📖 Повторить</button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Студенты */}
        {activeTab === 'students' && (
          <div className="students-section">
            <div className="students-search">
              <FaSearch className="search-icon" />
              <input type="text" placeholder="Поиск студентов по email или имени..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="students-search-input" />
            </div>
            <div className="students-stats">
              <span>Всего студентов: {students.length}</span>
              <span>Найдено: {filteredStudents.length}</span>
            </div>
            <div className="students-grid">
              {filteredStudents.length === 0 ? (
                <motion.div className="empty-state">
                  <div className="empty-icon">👥</div>
                  <h3>Студенты не найдены</h3>
                </motion.div>
              ) : (
                filteredStudents.map((student, idx) => (
                  <motion.div key={student.id} className="student-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} whileHover={{ y: -3 }} onClick={() => showStudentDetails(student)}>
                    <div className="student-avatar">
                      {student.avatarUrl ? <img src={student.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : student.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="student-info">
                      <h4>{student.nickname || student.email?.split('@')[0]}</h4>
                      <p>{student.email}</p>
                      <div className="student-stats">
                        <span className="stat-badge"><FaBookOpen /> {student.totalCourses} курсов</span>
                        <span className="stat-badge"><FaChartLine /> {student.averageProgress}% средний прогресс</span>
                        <span className="stat-badge success"><FaCheckCircle /> {student.completedCourses} завершено</span>
                      </div>
                    </div>
                    <button className="details-btn">📊 Детали</button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Отзывы на курсы */}
        {activeTab === 'reviews' && (
          <div className="reviews-teacher-section">
            <div className="section-header-flex">
              <h3>📝 Отзывы студентов на ваши курсы</h3>
              <span className="reviews-count-total">Всего: {courseReviews.length}</span>
            </div>
            
            {courseReviews.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <h3>Пока нет отзывов</h3>
                <p>Когда студенты оставят отзывы на ваши курсы, они появятся здесь</p>
              </div>
            ) : (
              <div className="reviews-teacher-list">
                {courseReviews.map(review => (
                  <div key={review.id} className="review-teacher-card">
                    <div className="review-teacher-header">
                      <div className="review-course-info">
                        <span className="course-icon">📚</span>
                        <span className="course-title">{review.courseTitle}</span>
                      </div>
                      <div className="review-rating-stars">
                        {[1,2,3,4,5].map(star => (
                          <FaStar key={star} className={star <= review.rating ? 'filled' : 'empty'} />
                        ))}
                        <span className="rating-value">{review.rating}.0</span>
                      </div>
                    </div>
                    <div className="review-teacher-body">
                      <div className="reviewer-info">
                        <span className="reviewer-avatar">👤</span>
                        <span className="reviewer-name">{review.userName}</span>
                        <span className="review-date">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="review-comment-text">{review.comment}</div>
                    </div>
                    <div className="review-teacher-footer">
                      <button 
                        className="reply-btn"
                        onClick={() => navigate(`/course/${review.courseId}`)}
                      >
                        📖 Перейти к курсу
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно с деталями студента */}
      {selectedStudent && studentDetails && (
        <div className="modal-overlay" onClick={() => { setSelectedStudent(null); setStudentDetails(null); }}>
          <div className="modal-content student-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Прогресс студента</h3>
              <button className="modal-close" onClick={() => { setSelectedStudent(null); setStudentDetails(null); }}>✖</button>
            </div>

            <div className="student-info-header">
              <div className="student-large-avatar">
                {selectedStudent.avatarUrl ? <img src={selectedStudent.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : selectedStudent.email?.[0]?.toUpperCase()}
              </div>
              <div className="student-basic-info">
                <h4>{selectedStudent.nickname || selectedStudent.email?.split('@')[0]}</h4>
                <p>{selectedStudent.email}</p>
                <div className="student-badges">
                  <span className="badge">📅 Регистрация: {new Date(selectedStudent.createdAt).toLocaleDateString()}</span>
                  <span className="badge">📚 Всего курсов: {studentDetails.totalCourses}</span>
                  <span className="badge">📊 Средний прогресс: {studentDetails.averageProgress}%</span>
                </div>
              </div>
            </div>

            <div className="student-summary-stats">
              <div className="summary-card"><div className="summary-icon">📖</div><div className="summary-value">{studentDetails.completedCourses}</div><div className="summary-label">Завершено</div></div>
              <div className="summary-card"><div className="summary-icon">⏱️</div><div className="summary-value">{studentDetails.coursesWithDetails.reduce((acc, c) => acc + (c.completedLessons || 0), 0)}</div><div className="summary-label">Уроков пройдено</div></div>
              <div className="summary-card"><div className="summary-icon">🎯</div><div className="summary-value">{studentDetails.averageProgress}%</div><div className="summary-label">Средний прогресс</div></div>
            </div>

            <div className="student-courses-list">
              <h4>📚 Курсы студента</h4>
              {studentDetails.coursesWithDetails.map((course, idx) => (
                <div key={idx} className="student-course-item">
                  <div className="course-header">
                    <div className="course-title-info">
                      <span className="course-icon">{course.icon || '📚'}</span>
                      <div>
                        <div className="course-name">{course.title}</div>
                        <div className="course-meta-small">
                          <span>{course.level || 'Начинающий'}</span>
                          <span>{course.duration || '40ч'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="course-status">
                      {course.progress === 100 ? <span className="status-completed">✅ Завершен</span> : <span className="status-studying">📖 В процессе</span>}
                    </div>
                  </div>
                  <div className="course-progress-detail">
                    <div className="progress-header">
                      <span>Прогресс: {course.progress}%</span>
                      <span>{course.completedLessons || 0}/{course.lessons || 1} уроков</span>
                    </div>
                    <div className="progress-bar-big">
                      <div className="progress-fill-big" style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>

                  {course.testScores && course.testScores.length > 0 && (
                    <div className="test-scores">
                      <div className="test-scores-title">📝 Результаты тестов:</div>
                      <div className="test-scores-list">
                        {course.testScores.map((test, tIdx) => (
                          <div key={tIdx} className="test-score-item">
                            <span>{test.title}</span>
                            <span className={`score ${test.passed ? 'passed' : 'failed'}`}>{test.score}% {test.passed ? '✅' : '❌'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="course-time-info">
                    <FaClock /> {course.progress === 100 ? 'Курс завершен' : <span>Осталось ~{course.estimatedTimeLeft} часов</span>}
                  </div>
                  <button className="view-course-btn" onClick={() => navigate(`/course/${course.id}`)}>
                    {course.progress === 100 ? '📖 Повторить' : '🎯 Продолжить'}
                  </button>
                </div>
              ))}
            </div>
            <button className="close-modal-btn" onClick={() => { setSelectedStudent(null); setStudentDetails(null); }}>Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
}