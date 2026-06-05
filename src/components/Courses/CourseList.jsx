import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const CourseList = () => {
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'courses'));
      const coursesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);
      setFilteredCourses(coursesData);
    } catch (error) {
      console.error('Ошибка загрузки курсов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (!term.trim()) {
      setFilteredCourses(courses);
      return;
    }
    
    const filtered = courses.filter(course => 
      course.title?.toLowerCase().includes(term) ||
      course.description?.toLowerCase().includes(term)
    );
    setFilteredCourses(filtered);
  };

  if (loading) {
    return <div className="loading">Загрузка курсов...</div>;
  }

  return (
    <div className="courses-page">
      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск курсов по названию или описанию..."
          value={searchTerm}
          onChange={handleSearch}
          className="course-search-input"
          style={{width: '100%', padding: '10px', marginBottom: '20px'}}
        />
      </div>
      <div className="courses-grid">
        {filteredCourses.length === 0 ? (
          <p className="no-courses">Курсы не найдены</p>
        ) : (
          filteredCourses.map(course => (
            <div key={course.id} className="course-card">
              <h3>{course.title}</h3>
              <p>{course.description}</p>
              <div className="course-meta">
                <span>Преподаватель: {course.teacherName || 'Не указан'}</span>
                <span>Длительность: {course.duration || 'Не указана'}</span>
              </div>
              <button className="btn-secondary">Подробнее</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CourseList;