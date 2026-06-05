import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function CourseDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState(0);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const courseDoc = await getDoc(doc(db, 'courses', id));
      if (courseDoc.exists()) {
        setCourse({ id: courseDoc.id, ...courseDoc.data() });
      }
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!currentUser) {
      navigate('/register');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        enrolledCourses: arrayUnion({
          courseId: id,
          courseTitle: course.title,
          progress: 0,
          enrolledAt: new Date().toISOString()
        })
      });
      alert('Вы успешно записались на курс!');
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (!course) return <div className="loading">Курс не найден</div>;

  return (
    <div className="course-detail">
      <div className="course-header">
        <h1>{course.title}</h1>
        <p>{course.description}</p>
      </div>
      
      <div className="course-content">
        <div className="course-main">
          <h2>Содержание курса</h2>
          {course.levels && course.levels.map((level, index) => (
            <div key={index} className="level-item">
              <h3>{level.title}</h3>
              <p>{level.description}</p>
              {currentLevel >= index && (
                <button className="btn-secondary">Начать уровень {index + 1}</button>
              )}
            </div>
          ))}
        </div>
        
        <div className="course-sidebar">
          <div className="course-info-card">
            <h3>Информация о курсе</h3>
            <p>Преподаватель: {course.teacherName}</p>
            <p>Длительность: {course.duration}</p>
            <button onClick={handleEnroll} className="btn-primary btn-full">
              Записаться на курс
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}