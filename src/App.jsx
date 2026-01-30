import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import AdminSettings from './pages/AdminSettings';
import MediaManager from './pages/MediaManager';
import Plans from './pages/Plans';
import Subscriptions from './pages/Subscriptions';
import Platforms from './pages/Platforms';
import Help from './pages/Help';
import Tickets from './pages/Tickets';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import api from './services/api';
import { AlertDialogProvider } from './components/ui/alert-dialog-modern';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <AlertDialogProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          {user && <Navbar user={user} onLogout={handleLogout} />}
          <main className="flex-1">
            <Routes>
              <Route
                path="/login"
                element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
              />
              <Route
                path="/register"
                element={user ? <Navigate to="/" /> : <Register />}
              />
              <Route
                path="/forgot-password"
                element={user ? <Navigate to="/" /> : <ForgotPassword />}
              />
              <Route
                path="/reset-password"
                element={user ? <Navigate to="/" /> : <ResetPassword />}
              />
              <Route
                path="/"
                element={user ? <Dashboard user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/settings"
                element={user ? <Settings user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/admin"
                element={user && user.role === 'admin' ? <AdminSettings user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/media"
                element={user ? <MediaManager user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/plans"
                element={user ? <Plans user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/subscriptions"
                element={user && user.role === 'admin' ? <Subscriptions user={user} /> : <Navigate to="/" />}
              />
              <Route
                path="/platforms"
                element={user ? <Platforms user={user} /> : <Navigate to="/login" />}
              />
              <Route
                path="/help"
                element={user ? <Help /> : <Navigate to="/login" />}
              />
              <Route
                path="/tickets"
                element={user && user.role === 'admin' ? <Tickets user={user} /> : <Navigate to="/" />}
              />
            </Routes>
          </main>
          {user && <Footer />}
        </div>
      </Router>
    </AlertDialogProvider>
  );
}

export default App;
