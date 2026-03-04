import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'; // File CSS tổng của bạn

// Import các trang (pages)
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Khai báo các đường dẫn của website */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/qlhh" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;