import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function MyCourses() {
  const { currentUser } = useAuth();

  return (
    <div className="dashboard">
      <h1>Мои курсы</h1>
      <div className="dashboard-info">
        <p><strong>Email:</strong> {currentUser?.email}</p>
      </div>
      <div className="dashboard-section">
        <h2>Курсы в процессе</h2>
        <p>Здесь будут ваши курсы</p>
      </div>
    </div>
  );
}