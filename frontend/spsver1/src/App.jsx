import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';

import Login from './pages/Login';
import AdminWorkspace from './pages/AdminWorkspace';
import StaffWorkspace from './pages/StaffWorkspace';
import { getSessionUser } from './utils/session';

const RoleProtectedRoute = ({ role, element }) => {
  const user = getSessionUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    const redirect = user.role === 'admin' ? '/admin' : '/staff';
    return <Navigate to={redirect} replace />;
  }

  return element;
};

const RootRedirect = () => {
  const user = getSessionUser();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/staff'} replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/staff" replace />} />
        <Route path="/qlhh" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<RoleProtectedRoute role="admin" element={<AdminWorkspace />} />} />
        <Route path="/staff" element={<RoleProtectedRoute role="staff" element={<StaffWorkspace />} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;