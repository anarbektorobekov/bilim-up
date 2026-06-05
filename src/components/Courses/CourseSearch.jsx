import React from 'react';

export default function CourseSearch({ onSearch }) {
  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Поиск курсов..."
        onChange={(e) => onSearch(e.target.value)}
        className="search-input"
      />
    </div>
  );
}