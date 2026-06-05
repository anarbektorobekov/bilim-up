import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  FaCheckCircle, FaPlay, FaLock, FaArrowLeft, FaBookOpen,
  FaQuestionCircle, FaChevronRight, FaChevronLeft, FaDownload, FaFileAlt,
  FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive, FaFile,
  FaLink
} from 'react-icons/fa';
import Reviews from './Reviews';
import '../../styles/course.css';

// Функция для определения иконки файла
const getFileIcon = (fileName) => {
  if (!fileName) return <FaFileAlt />;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FaFilePdf style={{ color: '#ef4444' }} />;
  if (ext === 'doc' || ext === 'docx') return <FaFileWord style={{ color: '#3b82f6' }} />;
  if (ext === 'xls' || ext === 'xlsx') return <FaFileExcel style={{ color: '#10b981' }} />;
  if (ext === 'ppt' || ext === 'pptx') return <FaFilePowerpoint style={{ color: '#f59e0b' }} />;
  if (ext === 'zip' || ext === 'rar') return <FaFileArchive style={{ color: '#8b5cf6' }} />;
  return <FaFileAlt />;
};

export default function CoursePage() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [showTest, setShowTest] = useState(false);
  const [testAnswers, setTestAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchCourse();
    loadProgress();
  }, [id]);

  async function fetchCourse() {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', id));
      if (courseDoc.exists()) {
        setCourse({ id: courseDoc.id, ...courseDoc.data() });
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProgress() {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      const enrolledCourse = userData?.enrolledCourses?.find(c => c.courseId === id);
      if (enrolledCourse) {
        setCurrentLevel(enrolledCourse.currentLevel || 0);
        setCurrentLesson(enrolledCourse.currentLesson || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки прогресса:', error);
    }
  }

  async function saveProgress(levelIndex, lessonIndex, progressPercent) {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const enrolledCourses = userData?.enrolledCourses || [];
      const updatedCourses = enrolledCourses.map(c =>
        c.courseId === id
          ? { ...c, currentLevel: levelIndex, currentLesson: lessonIndex, progress: progressPercent }
          : c
      );
      await updateDoc(userRef, { enrolledCourses: updatedCourses });
    } catch (error) {
      console.error('Ошибка сохранения прогресса:', error);
    }
  }

  function goToLesson(levelIndex, lessonIndex) {
    if (!course?.levels?.[levelIndex]) return;
    setCurrentLevel(levelIndex);
    setCurrentLesson(lessonIndex);
    setShowTest(false);
    setTestResult(null);

    let completedLessons = 0;
    for (let i = 0; i < levelIndex; i++) {
      const level = course.levels[i];
      completedLessons += level?.lessons?.length || 0;
    }
    completedLessons += lessonIndex + 1;
    const totalLessons = course.levels?.reduce((acc, level) => acc + (level.lessons?.length || 0), 0) || 1;
    const progressPercent = Math.round((completedLessons / totalLessons) * 100);
    saveProgress(levelIndex, lessonIndex, progressPercent);
  }

  function nextLesson() {
    if (!course?.levels) return;
    const currentLevelData = course.levels[currentLevel];
    if (!currentLevelData) return;
    const currentLessons = currentLevelData.lessons || [];
    if (currentLesson + 1 < currentLessons.length) {
      goToLesson(currentLevel, currentLesson + 1);
    } else if (currentLevel + 1 < course.levels.length) {
      const nextLevel = course.levels[currentLevel + 1];
      if (nextLevel && nextLevel.lessons && nextLevel.lessons.length > 0) {
        goToLesson(currentLevel + 1, 0);
      }
    } else {
      alert('🎉 Поздравляем! Вы успешно завершили курс!');
    }
  }

  function prevLesson() {
    if (!course?.levels) return;
    if (currentLesson > 0) {
      goToLesson(currentLevel, currentLesson - 1);
    } else if (currentLevel > 0) {
      const prevLevel = course.levels[currentLevel - 1];
      if (prevLevel && prevLevel.lessons && prevLevel.lessons.length > 0) {
        goToLesson(currentLevel - 1, prevLevel.lessons.length - 1);
      }
    }
  }

  function checkTest() {
    const test = course?.levels[currentLevel]?.test;
    if (!test || !test.questions) return;
    let correct = 0;
    test.questions.forEach((q, idx) => {
      if (testAnswers[idx] === q.correctAnswer) correct++;
    });
    const score = Math.round((correct / test.questions.length) * 100);
    setTestResult(score);
    if (score >= 70) {
      setTimeout(() => {
        nextLesson();
      }, 1500);
    }
  }

  function getYouTubeEmbedUrl(url) {
    if (!url) return '';
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  if (loading) return <div className="course-loading">Загрузка курса...</div>;
  if (!course) return <div className="course-not-found">Курс не найден</div>;

  const currentLevelData = course.levels?.[currentLevel];
  const currentLessonData = currentLevelData?.lessons?.[currentLesson];

  let completedLessons = 0;
  if (course.levels && course.levels.length > 0) {
    for (let i = 0; i < currentLevel; i++) {
      const level = course.levels[i];
      completedLessons += level?.lessons?.length || 0;
    }
    completedLessons += currentLesson + 1;
  }
  const totalLessons = course.levels?.reduce((acc, level) => acc + (level.lessons?.length || 0), 0) || 1;
  const totalProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const hasTest = currentLevelData?.test && !showTest && currentLesson === (currentLevelData.lessons?.length || 1) - 1;

  return (
    <div className="course-page">
      <button className={`sidebar-toggle ${!sidebarOpen ? 'closed' : ''}`} onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
      </button>

      <div className={`course-sidebar ${!sidebarOpen ? 'closed' : ''}`}>
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Назад
          </button>
          <div className="course-title-sidebar">
            <h3>{course.title}</h3>
            <div className="course-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${totalProgress}%` }}></div>
              </div>
              <span>{totalProgress}% завершено</span>
            </div>
          </div>
        </div>

        <div className="levels-container">
          {course.levels?.map((level, lIdx) => {
            const isUnlocked = lIdx <= currentLevel;
            const isCompleted = lIdx < currentLevel;
            const levelProgress = isCompleted ? 100 :
              lIdx === currentLevel ? Math.round((currentLesson / (level.lessons?.length || 1)) * 100) : 0;

            return (
              <div key={level.id || lIdx} className={`level-card ${!isUnlocked ? 'locked' : ''}`}>
                <div className="level-header">
                  <div className="level-number-wrapper">
                    <span className="level-number">{lIdx + 1}</span>
                    {isCompleted && <FaCheckCircle className="level-check" />}
                    {!isUnlocked && <FaLock className="level-lock" />}
                  </div>
                  <div className="level-info">
                    <span className="level-title">{level.title || `Уровень ${lIdx + 1}`}</span>
                    <div className="level-progress">
                      <div className="level-progress-bar">
                        <div className="level-progress-fill" style={{ width: `${levelProgress}%` }}></div>
                      </div>
                      <span>{levelProgress}%</span>
                    </div>
                  </div>
                </div>
                {isUnlocked && (
                  <div className="lessons-list">
                    {level.lessons?.map((lesson, lsnIdx) => (
                      <button
                        key={lesson.id || lsnIdx}
                        className={`lesson-btn ${lIdx === currentLevel && lsnIdx === currentLesson ? 'active' : ''} ${lsnIdx < currentLesson ? 'completed' : ''}`}
                        onClick={() => goToLesson(lIdx, lsnIdx)}
                      >
                        <FaPlay className="lesson-icon" />
                        <span>{lesson.title || `Урок ${lsnIdx + 1}`}</span>
                        {lsnIdx < currentLesson && <FaCheckCircle className="lesson-check" />}
                      </button>
                    ))}
                    {level.test && (
                      <button
                        className={`test-btn ${lIdx === currentLevel && showTest ? 'active' : ''}`}
                        onClick={() => {
                          setShowTest(true);
                          setTestResult(null);
                          setTestAnswers({});
                        }}
                      >
                        <FaQuestionCircle className="test-icon" />
                        <span>Финальный тест</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`course-content ${!sidebarOpen ? 'full-width' : ''}`}>
        {!showTest ? (
          <motion.div
            className="lesson-container"
            key={`${currentLevel}-${currentLesson}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="lesson-header">
              <div className="breadcrumb">
                <FaBookOpen />
                <span>{course.title}</span>
                <FaChevronRight />
                <span>{currentLevelData?.title || `Уровень ${currentLevel + 1}`}</span>
                <FaChevronRight />
                <span className="current">{currentLessonData?.title || `Урок ${currentLesson + 1}`}</span>
              </div>
              <h1>{currentLessonData?.title || `Урок ${currentLesson + 1}`}</h1>
            </div>

            <div className="lesson-body">
              {!currentLessonData ? (
                <div className="text-content">Содержание урока пока не добавлено</div>
              ) : currentLessonData.type === 'text' && (
                <div className="text-content">{currentLessonData.content || 'Содержание урока пока не добавлено'}</div>
              )}

              {currentLessonData?.type === 'video' && currentLessonData?.content && (
                <div className="video-content">
                  <iframe
                    src={getYouTubeEmbedUrl(currentLessonData.content)}
                    title={currentLessonData.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {currentLessonData?.type === 'link' && currentLessonData?.content && (
                <div className="link-content">
                  <a href={currentLessonData.content} target="_blank" rel="noopener noreferrer">
                    <FaLink /> Открыть ссылку
                  </a>
                  <p className="link-url">{currentLessonData.content}</p>
                </div>
              )}

             {currentLessonData?.type === 'image' && currentLessonData?.content && (
  <div className="image-content">
    <img 
      src={currentLessonData.content} 
      alt={currentLessonData.title || 'Изображение'}
      onError={(e) => { 
        e.target.src = 'https://via.placeholder.com/600x400?text=Изображение+не+загружено'; 
        e.target.style.opacity = '0.7';
      }}
      style={{ maxWidth: '100%', borderRadius: '12px', cursor: 'pointer' }}
      onClick={() => window.open(currentLessonData.content, '_blank')}
    />
    <div className="image-caption">
      📸 {currentLessonData.title || 'Изображение'} 
      <button className="open-image-btn" onClick={() => window.open(currentLessonData.content, '_blank')}>
        🔍 Открыть в полном размере
      </button>
    </div>
  </div>
)}

              {currentLessonData?.type === 'file' && currentLessonData?.fileUrl && (
                <div className="lesson-file">
                  <div className="file-card">
                    <div className="file-icon-large">
                      {getFileIcon(currentLessonData.fileName)}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{currentLessonData.fileName || 'Файл'}</div>
                      <div className="file-size">{currentLessonData.fileSize && `(${currentLessonData.fileSize})`}</div>
                    </div>
                    <a
                      href={currentLessonData.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-btn"
                    >
                      <FaDownload /> Скачать
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="lesson-navigation">
              <button
                className="nav-btn prev"
                onClick={prevLesson}
                disabled={currentLevel === 0 && currentLesson === 0}
              >
                <FaChevronLeft /> Предыдущий
              </button>
              <div className="lesson-counter">
                Урок {completedLessons} из {totalLessons}
              </div>
              {hasTest ? (
                <button className="nav-btn test" onClick={() => setShowTest(true)}>
                  Пройти тест <FaChevronRight />
                </button>
              ) : (
                <button className="nav-btn next" onClick={nextLesson}>
                  Следующий <FaChevronRight />
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="test-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="test-header">
              <h2>📝 {currentLevelData?.test?.title || 'Тест'}</h2>
              <p>Проверьте свои знания перед переходом к следующему уровню</p>
            </div>
            {testResult !== null ? (
              <div className="test-result">
                <div className={`result-circle ${testResult >= 70 ? 'passed' : 'failed'}`}>
                  <span className="result-percent">{testResult}%</span>
                </div>
                <div className="result-message">
                  {testResult >= 70 ? (
                    <>
                      <FaCheckCircle className="result-icon success" />
                      <h3>Отлично! Тест пройден</h3>
                      <p>Вы можете перейти к следующему уроку</p>
                    </>
                  ) : (
                    <>
                      <FaQuestionCircle className="result-icon failed" />
                      <h3>Тест не пройден</h3>
                      <p>Вам нужно набрать 70% для продолжения. Попробуйте ещё раз</p>
                      <button className="retry-btn" onClick={() => {
                        setTestResult(null);
                        setTestAnswers({});
                      }}>
                        Пройти заново
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="questions-list">
                  {currentLevelData?.test?.questions?.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="question-card">
                      <div className="question-number">Вопрос {qIdx + 1}</div>
                      <p className="question-text">{q.text || 'Вопрос'}</p>
                      <div className="options-list">
                        {q.options?.map((opt, optIdx) => (
                          <label key={optIdx} className="option">
                            <input
                              type="radio"
                              name={`q_${qIdx}`}
                              value={optIdx}
                              onChange={() => setTestAnswers({ ...testAnswers, [qIdx]: optIdx })}
                            />
                            <span>{opt || `Вариант ${optIdx + 1}`}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="submit-test-btn" onClick={checkTest}>
                  Отправить ответы
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* ОТЗЫВЫ И РЕЙТИНГИ */}
      <Reviews courseId={course.id} courseTitle={course.title} />
    </div>
  );
}