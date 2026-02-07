import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '@/App.css';
import { Toaster } from 'sonner';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import LeadFormPage from './pages/LeadFormPage';
import AgentRegistration from './pages/AgentRegistration';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AgentLeadCreate from './pages/AgentLeadCreate';
import CRMPage from './pages/CRMPage';
import LeadDetailPage from './pages/LeadDetailPage';

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/lead-form" element={<LeadFormPage />} />
          <Route path="/agent-registration" element={<AgentRegistration />} />
          <Route path="/partner-registration" element={<PartnerRegistration />} />
          
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operations']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/agent/dashboard"
            element={
              <ProtectedRoute allowedRoles={['sales_agent']}>
                <AgentDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/partner/dashboard/:partnerId"
            element={
              <ProtectedRoute>
                <PartnerDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/partner/create-lead"
            element={
              <ProtectedRoute allowedRoles={['partner']}>
                <PartnerLeadCreate />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/crm"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operations', 'sales_agent']}>
                <CRMPage />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/crm/lead/:leadId"
            element={
              <ProtectedRoute allowedRoles={['admin', 'operations', 'sales_agent']}>
                <LeadDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;