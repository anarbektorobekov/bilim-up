import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { collection, doc, getDoc, setDoc, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { FaSave, FaArrowLeft, FaPlus, FaTrash, FaEdit, FaQuestionCircle, FaFileAlt, FaVideo, FaLink, FaImage, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive, FaFile, FaDownload } from 'react-icons/fa';
import '../../styles/constructor.css';

// Массив иконок для выбора
const courseIcons = [
  { value: '📚', label: 'Книга' }, { value: '💻', label: 'Компьютер' }, { value: '🎨', label: 'Дизайн' },
  { value: '📱', label: 'Мобильная разработка' }, { value: '🤖', label: 'AI/Роботы' }, { value: '🎓', label: 'Образование' },
  { value: '⚛️', label: 'React' }, { value: '🐍', label: 'Python' }, { value: '☕', label: 'Java' },
  { value: '💎', label: 'Ruby' }, { value: '🔷', label: 'C#' }, { value: '🟨', label: 'JavaScript' },
  { value: '🟦', label: 'TypeScript' }, { value: '🐘', label: 'PHP' }, { value: '🌐', label: 'HTML/CSS' },
  { value: '🗄️', label: 'Базы данных' }, { value: '🔒', label: 'Кибербезопасность' }, { value: '☁️', label: 'Облачные технологии' },
  { value: '📊', label: 'Аналитика данных' }, { value: '🎮', label: 'GameDev' }, { value: '📷', label: 'Фото/Видео' },
  { value: '🎵', label: 'Музыка' }, { value: '🏗️', label: 'Архитектура' }, { value: '💰', label: 'Бизнес' },
  { value: '📈', label: 'Маркетинг' }, { value: '✍️', label: 'Копирайтинг' }, { value: '🗣️', label: 'Языки' },
  { value: '🧠', label: 'Психология' }, { value: '⚙️', label: 'Инжиниринг' }, { value: '🔬', label: 'Наука' },
];

export default function Constructor() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [myCourses, setMyCourses] = useState([]);
  const [showCourseList, setShowCourseList] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);

  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    level: 'Начинающий',
    duration: '',
    price: 'Бесплатно',
    imageUrl: '',
    icon: '📚',
    levels: []
  });

  const [currentLevel, setCurrentLevel] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentTest, setCurrentTest] = useState(null);
  const [activeTab, setActiveTab] = useState('main');

  useEffect(() => { 
    fetchMyCourses(); 
  }, [currentUser]);

  useEffect(() => { 
    if (editId) { 
      setShowCourseList(false); 
      setCurrentCourseId(editId); 
      loadCourseForEdit(editId); 
    } 
  }, [editId]);

  async function fetchMyCourses() {
    try {
      const q = query(collection(db, 'courses'), where('teacherId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      setMyCourses(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoadingCourses(false); 
    }
  }

  // ЗАГРУЗКА КУРСА ДЛЯ РЕДАКТИРОВАНИЯ (С ТЕСТАМИ)
  async function loadCourseForEdit(courseId) {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      if (courseDoc.exists()) {
        const data = courseDoc.data();
        
        setCourseData({
          title: data.title || '',
          description: data.description || '',
          level: data.level || 'Начинающий',
          duration: data.duration || '',
          price: data.price || 'Бесплатно',
          imageUrl: data.imageUrl || '',
          icon: data.icon || '📚',
          levels: data.levels || []
        });

        if (data.levels && data.levels.length > 0) {
          setCurrentLevel(data.levels[0]);
          // Загружаем тест первого уровня
          if (data.levels[0].test) {
            setCurrentTest(data.levels[0].test);
          } else {
            setCurrentTest(null);
          }
        }
      }
    } catch (error) { 
      console.error('Ошибка загрузки курса:', error); 
    }
  }

  // ВЫБОР УРОВНЯ (С ЗАГРУЗКОЙ ТЕСТА)
  function selectLevel(level) {
    setCurrentLevel(level);
    setCurrentLesson(null);
    if (level.test) {
      setCurrentTest(level.test);
    } else {
      setCurrentTest(null);
    }
    setActiveTab('levels');
  }

  async function deleteCourse(courseId) {
    if (window.confirm('Удалить этот курс?')) {
      try { 
        await deleteDoc(doc(db, 'courses', courseId)); 
        fetchMyCourses(); 
        alert('Курс удален'); 
      } catch (error) { 
        alert('Ошибка при удалении'); 
      }
    }
  }

  function createNewCourse() {
    setCurrentCourseId(null);
    setCourseData({ 
      title: '', description: '', level: 'Начинающий', duration: '', 
      price: 'Бесплатно', imageUrl: '', icon: '📚', levels: [] 
    });
    setCurrentLevel(null); 
    setCurrentLesson(null); 
    setCurrentTest(null);
    setActiveTab('main'); 
    setShowCourseList(false);
  }

  function addLevel() {
    const newLevel = { 
      id: Date.now(), 
      title: `Уровень ${courseData.levels.length + 1}`, 
      description: '', 
      lessons: [], 
      test: null 
    };
    setCourseData(prev => ({ ...prev, levels: [...prev.levels, newLevel] }));
    setCurrentLevel(newLevel); 
    setActiveTab('levels');
  }

  function updateLevel(levelId, field, value) {
    setCourseData(prev => ({ 
      ...prev, 
      levels: prev.levels.map(l => l.id === levelId ? { ...l, [field]: value } : l) 
    }));
    if (currentLevel?.id === levelId) {
      setCurrentLevel(prev => ({ ...prev, [field]: value }));
    }
  }

  function deleteLevel(levelId) {
    if (window.confirm('Удалить этот уровень?')) {
      const updated = courseData.levels.filter(l => l.id !== levelId);
      setCourseData(prev => ({ ...prev, levels: updated }));
      if (currentLevel?.id === levelId) {
        setCurrentLevel(updated[0] || null);
      }
    }
  }

  function addLesson() {
    if (!currentLevel) return;
    const newLesson = { 
      id: Date.now(), 
      title: `Урок ${currentLevel.lessons.length + 1}`, 
      content: '', 
      type: 'text', 
      fileUrl: '', 
      fileName: '', 
      fileSize: '', 
      duration: '' 
    };
    const updatedLevel = { ...currentLevel, lessons: [...currentLevel.lessons, newLesson] };
    setCourseData(prev => ({ 
      ...prev, 
      levels: prev.levels.map(l => l.id === currentLevel.id ? updatedLevel : l) 
    }));
    setCurrentLevel(updatedLevel); 
    setCurrentLesson(newLesson); 
    setActiveTab('lessons');
  }

  function updateLesson(lessonId, field, value) {
    if (!currentLevel) return;
    const updatedLessons = currentLevel.lessons.map(l => l.id === lessonId ? { ...l, [field]: value } : l);
    const updatedLevel = { ...currentLevel, lessons: updatedLessons };
    setCourseData(prev => ({ 
      ...prev, 
      levels: prev.levels.map(l => l.id === currentLevel.id ? updatedLevel : l) 
    }));
    setCurrentLevel(updatedLevel);
    if (currentLesson?.id === lessonId) {
      setCurrentLesson(prev => ({ ...prev, [field]: value }));
    }
  }

  function deleteLesson(lessonId) {
    if (!currentLevel) return;
    if (window.confirm('Удалить этот урок?')) {
      const updatedLessons = currentLevel.lessons.filter(l => l.id !== lessonId);
      const updatedLevel = { ...currentLevel, lessons: updatedLessons };
      setCourseData(prev => ({ 
        ...prev, 
        levels: prev.levels.map(l => l.id === currentLevel.id ? updatedLevel : l) 
      }));
      setCurrentLevel(updatedLevel); 
      setCurrentLesson(null);
    }
  }

  async function handleFileUpload(e, lessonId) {
    const file = e.target.files[0];
    if (!file) return;
    if (!currentCourseId) { 
      alert('Сначала сохраните курс, затем загружайте файлы'); 
      return; 
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'course_materials');
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/dukzm8szz/upload`, { 
        method: 'POST', 
        body: formData 
      });
      const data = await response.json();
      if (data.secure_url) {
        const newLevels = JSON.parse(JSON.stringify(courseData.levels));
        const levelIndex = newLevels.findIndex(l => l.id === currentLevel.id);
        if (levelIndex !== -1) {
          const lessonIndex = newLevels[levelIndex].lessons.findIndex(l => l.id === lessonId);
          if (lessonIndex !== -1) {
            newLevels[levelIndex].lessons[lessonIndex].fileUrl = data.secure_url;
            newLevels[levelIndex].lessons[lessonIndex].fileName = file.name;
            newLevels[levelIndex].lessons[lessonIndex].fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';
            setCourseData(prev => ({ ...prev, levels: newLevels }));
            const courseRef = doc(db, 'courses', currentCourseId);
            await updateDoc(courseRef, { levels: newLevels });
          }
        }
        alert(`Файл "${file.name}" успешно загружен!`);
      }
    } catch (error) { 
      console.error(error); 
      alert('Ошибка при загрузке файла'); 
    } finally { 
      setUploading(false); 
    }
  }

  async function deleteFile(lessonId, fileUrl) {
    if (!fileUrl) return;
    try {
      const newLevels = JSON.parse(JSON.stringify(courseData.levels));
      const levelIndex = newLevels.findIndex(l => l.id === currentLevel.id);
      if (levelIndex !== -1) {
        const lessonIndex = newLevels[levelIndex].lessons.findIndex(l => l.id === lessonId);
        if (lessonIndex !== -1) {
          newLevels[levelIndex].lessons[lessonIndex].fileUrl = '';
          newLevels[levelIndex].lessons[lessonIndex].fileName = '';
          newLevels[levelIndex].lessons[lessonIndex].fileSize = '';
          setCourseData(prev => ({ ...prev, levels: newLevels }));
          if (currentCourseId) {
            const courseRef = doc(db, 'courses', currentCourseId);
            await updateDoc(courseRef, { levels: newLevels });
          }
        }
      }
      alert('Файл удален');
    } catch (error) { 
      console.error(error); 
      alert('Ошибка при удалении файла'); 
    }
  }

  // ===== ТЕСТЫ =====
  function addTest() {
    if (!currentLevel) return;
    const newTest = { 
      id: Date.now(), 
      title: 'Тест', 
      questions: [{ 
        id: Date.now(), 
        text: 'Вопрос 1', 
        options: ['', '', '', ''], 
        correctAnswer: 0 
      }] 
    };
    const updatedLevel = { ...currentLevel, test: newTest };
    setCourseData(prev => ({ 
      ...prev, 
      levels: prev.levels.map(l => l.id === currentLevel.id ? updatedLevel : l) 
    }));
    setCurrentLevel(updatedLevel); 
    setCurrentTest(newTest); 
    setActiveTab('tests');
  }

  function addQuestion() {
    if (!currentTest) return;
    const newQuestion = { 
      id: Date.now(), 
      text: `Вопрос ${currentTest.questions.length + 1}`, 
      options: ['', '', '', ''], 
      correctAnswer: 0 
    };
    updateTest({ ...currentTest, questions: [...currentTest.questions, newQuestion] });
  }

  function updateQuestion(questionId, field, value) {
    if (!currentTest) return;
    updateTest({ 
      ...currentTest, 
      questions: currentTest.questions.map(q => q.id === questionId ? { ...q, [field]: value } : q) 
    });
  }

  function updateOption(questionId, optionIndex, value) {
    if (!currentTest) return;
    updateTest({ 
      ...currentTest, 
      questions: currentTest.questions.map(q => q.id === questionId 
        ? { ...q, options: q.options.map((opt, i) => i === optionIndex ? value : opt) } 
        : q
      ) 
    });
  }

  function updateTest(updatedTest) {
    if (!currentLevel) return;
    const updatedLevel = { ...currentLevel, test: updatedTest };
    setCourseData(prev => ({ 
      ...prev, 
      levels: prev.levels.map(l => l.id === currentLevel.id ? updatedLevel : l) 
    }));
    setCurrentLevel(updatedLevel); 
    setCurrentTest(updatedTest);
  }

  function deleteQuestion(questionId) {
    if (!currentTest) return;
    updateTest({ 
      ...currentTest, 
      questions: currentTest.questions.filter(q => q.id !== questionId) 
    });
  }

  function deleteTest() {
    if (window.confirm('Удалить тест?')) {
      const updatedLevel = { ...currentLevel, test: null };
      setCourseData(prev => ({ 
        ...prev, 
        levels: prev.levels.map(l => l.id === currentLevel.id ? updatedLevel : l) 
      }));
      setCurrentLevel(updatedLevel); 
      setCurrentTest(null); 
      setActiveTab('levels');
    }
  }

  async function saveCourse(isPublished = false) {
    if (!courseData.title || courseData.title.trim() === '') {
      alert('Введите название курса');
      const titleInput = document.querySelector('input[placeholder="Например: JavaScript с нуля"]');
      if (titleInput) titleInput.focus();
      return;
    }
    setSaving(true);
    try {
      const dataToSave = {
        ...courseData,
        teacherId: currentUser.uid,
        teacherName: currentUser.email,
        updatedAt: new Date().toISOString(),
        status: isPublished ? 'published' : 'draft'
      };
      if (!currentCourseId) {
        dataToSave.createdAt = new Date().toISOString();
        dataToSave.studentsCount = 0;
        dataToSave.rating = 0;
      }
      if (currentCourseId) {
        const courseRef = doc(db, 'courses', currentCourseId);
        await updateDoc(courseRef, dataToSave);
        alert(isPublished ? '✅ Курс успешно опубликован!' : '💾 Курс сохранён как черновик');
      } else {
        const courseId = `course_${Date.now()}`;
        await setDoc(doc(db, 'courses', courseId), { ...dataToSave, id: courseId });
        setCurrentCourseId(courseId);
        alert(isPublished ? '✅ Курс успешно опубликован!' : '💾 Курс сохранён как черновик');
      }
      navigate('/teacher-dashboard');
    } catch (error) {
      console.error(error);
      alert('Ошибка при сохранении курса: ' + error.message);
    } finally { 
      setSaving(false); 
    }
  }

  function cancelEdit() {
    setShowCourseList(true); 
    setCurrentCourseId(null);
    setCourseData({ 
      title: '', description: '', level: 'Начинающий', duration: '', 
      price: 'Бесплатно', imageUrl: '', icon: '📚', levels: [] 
    });
    setCurrentLevel(null); 
    setCurrentLesson(null); 
    setCurrentTest(null);
  }

  const lessonTypes = [
    { value: 'text', label: '📝 Текст' },
    { value: 'video', label: '🎥 Видео' },
    { value: 'link', label: '🔗 Ссылка' },
    { value: 'image', label: '🖼️ Изображение' },
    { value: 'file', label: '📎 Файл' },
  ];

  const getFileIcon = (fileName) => {
    if (!fileName) return <FaFile />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FaFilePdf style={{ color: '#ef4444' }} />;
    if (ext === 'doc' || ext === 'docx') return <FaFileWord style={{ color: '#3b82f6' }} />;
    if (ext === 'xls' || ext === 'xlsx') return <FaFileExcel style={{ color: '#10b981' }} />;
    if (ext === 'ppt' || ext === 'pptx') return <FaFilePowerpoint style={{ color: '#f59e0b' }} />;
    if (ext === 'zip' || ext === 'rar') return <FaFileArchive style={{ color: '#8b5cf6' }} />;
    return <FaFile />;
  };

  // === СПИСОК КУРСОВ ===
  if (showCourseList) {
    return (
      <div className="constructor-container">
        <div className="constructor-header">
          <h1>Конструктор курсов</h1>
          <button className="create-course-btn" onClick={createNewCourse}>
            <FaPlus /> Создать новый курс
          </button>
        </div>
        <div className="my-courses-list">
          <h3>Мои курсы ({myCourses.length})</h3>
          {loadingCourses ? (
            <div className="loading">Загрузка...</div>
          ) : myCourses.length === 0 ? (
            <div className="empty-state">Нет курсов</div>
          ) : (
            <div className="courses-grid-constructor">
              {myCourses.map(course => (
                <div key={course.id} className="course-card-constructor">
                  <div className="course-card-icon">{course.icon || '📚'}</div>
                  <div className="course-card-info">
                    <h4>{course.title}</h4>
                    <p>{course.description?.substring(0, 60)}</p>
                    <div className="course-card-meta">
                      <span>{course.level || 'Начинающий'}</span>
                      <span>{course.duration || '40ч'}</span>
                    </div>
                  </div>
                  <div className="course-card-actions">
                    <button className="edit-course" onClick={() => { 
                      setCurrentCourseId(course.id); 
                      loadCourseForEdit(course.id); 
                      setShowCourseList(false); 
                    }}>
                      <FaEdit /> Редактировать
                    </button>
                    <button className="delete-course" onClick={() => deleteCourse(course.id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === РЕДАКТОР КУРСА ===
  return (
    <div className="constructor-container">
      <div className="constructor-header">
        <div className="header-left">
          <button className="back-btn" onClick={cancelEdit}>
            <FaArrowLeft /> Назад
          </button>
          <h1>{currentCourseId ? `Редактирование: ${courseData.title || 'курса'}` : 'Создание нового курса'}</h1>
        </div>
        <div className="constructor-actions">
          <button className="save-draft-btn" onClick={() => saveCourse(false)} disabled={saving}>
            <FaSave /> {saving ? 'Сохранение...' : '💾 Сохранить черновик'}
          </button>
          <button className="publish-btn" onClick={() => saveCourse(true)} disabled={saving}>
            <FaSave /> {saving ? 'Публикация...' : '📢 Опубликовать курс'}
          </button>
        </div>
      </div>

      <div className="constructor-tabs">
        <button className={`tab ${activeTab === 'main' ? 'active' : ''}`} onClick={() => setActiveTab('main')}>
          📋 Основное
        </button>
        <button className={`tab ${activeTab === 'levels' ? 'active' : ''}`} onClick={() => setActiveTab('levels')}>
          📚 Уровни ({courseData.levels.length})
        </button>
        {currentLevel && (
          <button className={`tab ${activeTab === 'lessons' ? 'active' : ''}`} onClick={() => setActiveTab('lessons')}>
            📖 Уроки ({currentLevel.lessons?.length || 0})
          </button>
        )}
        {currentLevel?.test && (
          <button className={`tab ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>
            📝 Тест
          </button>
        )}
      </div>

      {activeTab === 'main' && (
        <div className="main-info">
          <div className="form-group">
            <label>Название курса *</label>
            <input 
              type="text" 
              value={courseData.title} 
              onChange={(e) => setCourseData({ ...courseData, title: e.target.value })} 
              placeholder="Например: JavaScript с нуля" 
            />
            {!courseData.title && <small style={{ color: '#ef4444' }}>Обязательное поле</small>}
          </div>
          <div className="form-group">
            <label>Описание курса</label>
            <textarea 
              value={courseData.description} 
              onChange={(e) => setCourseData({ ...courseData, description: e.target.value })} 
              rows="4" 
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Уровень</label>
              <select value={courseData.level} onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}>
                <option>Начинающий</option>
                <option>Средний</option>
                <option>Продвинутый</option>
              </select>
            </div>
            <div className="form-group">
              <label>Длительность</label>
              <input 
                type="text" 
                value={courseData.duration} 
                onChange={(e) => setCourseData({ ...courseData, duration: e.target.value })} 
                placeholder="40 часов" 
              />
            </div>
          </div>

          {/* БЛОК ВЫБОРА ИКОНОК */}
          <div className="form-group">
            <label>🎨 Иконка курса</label>
            <div className="icon-grid">
              {courseIcons.map(icon => (
                <button 
                  key={icon.value} 
                  type="button" 
                  className={`icon-btn ${courseData.icon === icon.value ? 'active' : ''}`} 
                  onClick={() => setCourseData({ ...courseData, icon: icon.value })} 
                  title={icon.label}
                >
                  {icon.value}
                </button>
              ))}
            </div>
            <input 
              type="text" 
              value={courseData.icon} 
              onChange={(e) => setCourseData({ ...courseData, icon: e.target.value })} 
              placeholder="📚" 
              style={{ marginTop: '8px' }} 
            />
            <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
              Выберите иконку из списка или введите свою
            </small>
          </div>

          <div className="form-group">
            <label>Цена</label>
            <input 
              type="text" 
              value={courseData.price} 
              onChange={(e) => setCourseData({ ...courseData, price: e.target.value })} 
              placeholder="Бесплатно" 
            />
          </div>
        </div>
      )}

      {activeTab === 'levels' && (
        <div className="levels-container">
          <div className="levels-list">
            {courseData.levels.map((level, i) => (
              <div 
                key={level.id} 
                className={`level-item ${currentLevel?.id === level.id ? 'active' : ''}`} 
                onClick={() => selectLevel(level)}
              >
                <span className="level-number">{i + 1}</span>
                <input 
                  value={level.title} 
                  onChange={(e) => updateLevel(level.id, 'title', e.target.value)} 
                  onClick={(e) => e.stopPropagation()} 
                />
                <button className="delete-level" onClick={(e) => { e.stopPropagation(); deleteLevel(level.id); }}>
                  <FaTrash />
                </button>
              </div>
            ))}
            <button className="add-level" onClick={addLevel}>
              <FaPlus /> Добавить уровень
            </button>
          </div>
          {currentLevel && (
            <div className="level-editor">
              <textarea 
                value={currentLevel.description || ''} 
                onChange={(e) => updateLevel(currentLevel.id, 'description', e.target.value)} 
                rows="3" 
                placeholder="Описание уровня..." 
              />
              <div className="level-buttons">
                <button className="add-lesson" onClick={addLesson}>+ Добавить урок</button>
                {!currentLevel.test ? (
                  <button className="add-test" onClick={addTest}>+ Добавить тест</button>
                ) : (
                  <>
                    <button className="edit-test" onClick={() => setActiveTab('tests')}>✏️ Редактировать тест</button>
                    <span className="test-exists-badge">✅ Тест создан</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'lessons' && currentLevel && (
        <div className="lessons-container">
          <div className="lessons-list">
            {currentLevel.lessons.map((lesson, i) => (
              <div 
                key={lesson.id} 
                className={`lesson-item ${currentLesson?.id === lesson.id ? 'active' : ''}`} 
                onClick={() => setCurrentLesson(lesson)}
              >
                <span className="lesson-number">{i + 1}</span>
                <span>{lesson.title}</span>
                <button className="delete-lesson" onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id); }}>
                  <FaTrash />
                </button>
              </div>
            ))}
            <button className="add-lesson" onClick={addLesson}>+ Добавить урок</button>
          </div>
          {currentLesson && (
  <div className="lesson-editor">
    <div className="form-group">
      <label>Название урока</label>
      <input
        value={currentLesson.title || ''}
        onChange={(e) => updateLesson(currentLesson.id, 'title', e.target.value)}
        placeholder="Название урока"
      />
    </div>

    <div className="form-group">
      <label>Тип контента</label>
      <select value={currentLesson.type || 'text'} onChange={(e) => updateLesson(currentLesson.id, 'type', e.target.value)}>
        <option value="text">📝 Текст</option>
        <option value="video">🎥 Видео (YouTube)</option>
        <option value="link">🔗 Ссылка</option>
        <option value="image">🖼️ Изображение</option>
        <option value="file">📎 Файл</option>
      </select>
    </div>

    {currentLesson.type === 'text' && (
      <div className="form-group">
        <label>📝 Содержание урока</label>
        <textarea
          value={currentLesson.content || ''}
          onChange={(e) => updateLesson(currentLesson.id, 'content', e.target.value)}
          rows="10"
          placeholder="Введите текст урока..."
        />
      </div>
    )}

    {currentLesson.type === 'video' && (
      <div className="form-group">
        <label>🎥 Ссылка на видео (YouTube)</label>
        <input
          value={currentLesson.content || ''}
          onChange={(e) => updateLesson(currentLesson.id, 'content', e.target.value)}
          placeholder="https://www.youtube.com/watch?v=xxxxx"
        />
        <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
          Поддерживаются ссылки YouTube и Vimeo
        </small>
      </div>
    )}

    {currentLesson.type === 'link' && (
      <div className="form-group">
        <label>🔗 Ссылка</label>
        <input
          value={currentLesson.content || ''}
          onChange={(e) => updateLesson(currentLesson.id, 'content', e.target.value)}
          placeholder="https://example.com"
        />
        <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
          Студент откроет ссылку в новой вкладке
        </small>
      </div>
    )}

    {currentLesson.type === 'image' && (
  <div className="form-group">
    <label>🖼️ URL изображения</label>
    <input
      value={currentLesson.content || ''}
      onChange={(e) => updateLesson(currentLesson.id, 'content', e.target.value)}
      placeholder="https://example.com/image.jpg"
    />
    {currentLesson.content && (
      <div className="image-preview" style={{ marginTop: '8px' }}>
        <img 
          src={currentLesson.content} 
          alt="Preview" 
          style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '8px' }}
          onError={(e) => { e.target.src = 'https://via.placeholder.com/200x150?text=Не+загрузилось'; }}
        />
        <small>Предпросмотр изображения</small>
      </div>
    )}
    <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
      Вставьте прямую ссылку на изображение (можно из Google Картинок)
    </small>
  </div>
)}

    {currentLesson.type === 'file' && (
      <div className="form-group">
        <label>📎 Файл для студентов</label>
        <input
          type="file"
          onChange={(e) => handleFileUpload(e, currentLesson.id)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.jpg,.jpeg,.png,.gif,.mp4,.mp3"
        />
        {currentLesson.fileUrl && (
          <div className="file-preview" style={{ marginTop: '8px' }}>
            <span>✅ {currentLesson.fileName} ({currentLesson.fileSize})</span>
            <a href={currentLesson.fileUrl} target="_blank" rel="noopener noreferrer">📥 Скачать</a>
            <button onClick={() => deleteFile(currentLesson.id, currentLesson.fileUrl)}>🗑️ Удалить</button>
          </div>
        )}
        {uploading && <div>⏳ Загрузка файла...</div>}
        <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>
          Поддерживаемые форматы: PDF, DOC, XLS, PPT, ZIP, JPG, PNG, MP4, MP3
        </small>
      </div>
    )}
  </div>
)}
        </div>
      )}

      {activeTab === 'tests' && currentLevel?.test && (
        <div className="tests-container">
          <button className="delete-test" onClick={deleteTest}>🗑️ Удалить тест</button>
          {currentLevel.test.questions.map((q, idx) => (
            <div key={q.id} className="question-item">
              <div className="question-header">
                <span>Вопрос {idx + 1}</span>
                <button onClick={() => deleteQuestion(q.id)}>🗑️</button>
              </div>
              <input 
                value={q.text} 
                onChange={(e) => updateQuestion(q.id, 'text', e.target.value)} 
                placeholder="Вопрос" 
              />
              <div className="options-list">
                {q.options.map((opt, oidx) => (
                  <div key={oidx} className="option-item">
                    <input 
                      type="radio" 
                      checked={q.correctAnswer === oidx} 
                      onChange={() => updateQuestion(q.id, 'correctAnswer', oidx)} 
                    />
                    <input 
                      value={opt} 
                      onChange={(e) => updateOption(q.id, oidx, e.target.value)} 
                      placeholder={`Вариант ${oidx + 1}`} 
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="add-question" onClick={addQuestion}>+ Добавить вопрос</button>
        </div>
      )}
    </div>
  );
}