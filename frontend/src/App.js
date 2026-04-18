import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StreamManagement from './pages/StreamManagement';
import MediaLibrary from './pages/MediaLibrary';
import UserManagement from './pages/UserManagement';
import Statistics from './pages/Statistics';
import AutoDJ from './pages/AutoDJ';
import ServerSettings from './pages/ServerSettings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Toaster } from './components/ui/toaster';
import './App.css';
import MiniPlayer from './components/MiniPlayer';
import { PlayerProvider } from './contexts/PlayerContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  return user ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 pb-20">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/streams" element={
              <ProtectedRoute>
                <AppLayout>
                  <StreamManagement />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/media" element={
              <ProtectedRoute>
                <AppLayout>
                  <MediaLibrary />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/autodj" element={
              <ProtectedRoute>
                <AppLayout>
                  <AutoDJ />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/statistics" element={
              <ProtectedRoute>
                <AppLayout>
                  <Statistics />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute>
                <AppLayout>
                  <UserManagement />
                </AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout>
                  <ServerSettings />
                </AppLayout>
              </ProtectedRoute>
            } />
          </Routes>
          <MiniPlayer />
          <Toaster />
        </div>
      </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;