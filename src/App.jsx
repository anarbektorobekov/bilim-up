import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Layout/Navbar';
import HomePage from './components/HomePage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import StudentDashboard from './components/Student/StudentDashboard';
import TeacherDashboard from './components/Teacher/TeacherDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminPanel from './components/Admin/AdminPanel';
import PrivateRoute from './components/Auth/PrivateRoute';
import Profile from './components/Profile/Profile';
import MyCourses from './components/MyCourses/MyCourses';
import Certificates from './components/Certificates/Certificates';
import Chat from './components/Chat/Chat';
import Constructor from './components/Constructor/Constructor';
import CoursePage from './components/Course/CoursePage';
import './styles/global.css';
import './styles/responsive.css';

function AppContent() {
  const { userRole } = useAuth();

  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container">
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Защищённые маршруты для всех авторизованных */}
            <Route path="/profile" element={
              <PrivateRoute allowedRoles={['student', 'teacher', 'admin']}>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="/my-courses" element={
              <PrivateRoute allowedRoles={['student', 'teacher', 'admin']}>
                <MyCourses />
              </PrivateRoute>
            } />
            <Route path="/certificates" element={
              <PrivateRoute allowedRoles={['student', 'teacher', 'admin']}>
                <Certificates />
              </PrivateRoute>
            } />
            <Route path="/chat" element={
              <PrivateRoute allowedRoles={['student', 'teacher', 'admin']}>
                <Chat />
              </PrivateRoute>
            } />
            <Route path="/course/:id" element={
              <PrivateRoute allowedRoles={['student', 'teacher', 'admin']}>
                <CoursePage />
              </PrivateRoute>
            } />
            
            {/* Маршруты для студентов */}
            <Route path="/student-dashboard" element={
              <PrivateRoute allowedRoles={['student']}>
                <StudentDashboard />
              </PrivateRoute>
            } />
            
            {/* Маршруты для преподавателей */}
            <Route path="/teacher-dashboard" element={
              <PrivateRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </PrivateRoute>
            } />
            <Route path="/constructor" element={
              <PrivateRoute allowedRoles={['teacher']}>
                <Constructor />
              </PrivateRoute>
            } />
            
            {/* Маршруты для администраторов */}
            <Route path="/admin-dashboard" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminPanel />
              </PrivateRoute>
            } />
            
            {/* 404 - перенаправление на главную */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;