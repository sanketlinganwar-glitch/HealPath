import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/Toast';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PatientRegisterPage } from './pages/PatientRegisterPage';
import { PatientTrackPage } from './pages/PatientTrackPage';
import { PatientLookupPage } from './pages/PatientLookupPage';
import { ReceptionDashboard } from './pages/ReceptionDashboard';
import { DoctorConsole } from './pages/DoctorConsole';
import { AdminDashboard } from './pages/AdminDashboard';
import { DisplayBoard } from './pages/DisplayBoard';
import { DoctorsInfoPage } from './pages/DoctorsInfoPage';
import { DemoControlsPage } from './pages/DemoControlsPage';

// Protected Route by Role
function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // If logged in as doctor, redirect to doctor; if reception, redirect to reception
    if (user?.role === 'doctor') return <Navigate to="/doctor" replace />;
    if (user?.role === 'receptionist') return <Navigate to="/reception" replace />;
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

// Layout wrapper to conditionally show/hide Navbar and Footer (e.g. for TV Display Board)
function AppLayout() {
  const location = useLocation();
  const isDisplayBoard = location.pathname.startsWith('/display');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {!isDisplayBoard && <Navbar />}
      
      <main className="flex-1">
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/patient" element={<PatientRegisterPage />} />
          <Route path="/patient/track/:id" element={<PatientTrackPage />} />
          <Route path="/patient/lookup" element={<PatientLookupPage />} />
          <Route path="/display" element={<DisplayBoard />} />
          <Route path="/doctors-info" element={<DoctorsInfoPage />} />
          <Route path="/demo" element={<DemoControlsPage />} />

          {/* Protected Staff Pages */}
          <Route
            path="/reception"
            element={
              <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
                <ReceptionDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                <DoctorConsole />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isDisplayBoard && <Footer />}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <HashRouter>
          <AppLayout />
        </HashRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
