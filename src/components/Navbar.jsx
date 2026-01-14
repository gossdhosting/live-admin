import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { LayoutDashboard, Clapperboard, Gem, Settings, Crown, LogOut, ArrowUpCircle, CreditCard } from 'lucide-react';
import logoSvg from '/logo.svg';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdminSession = localStorage.getItem('adminToken') !== null;

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const handleReturnToAdmin = () => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      localStorage.removeItem('adminToken');
      localStorage.setItem('token', adminToken);
      window.location.href = '/';
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinks = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/media', label: 'Media', icon: Clapperboard },
    { path: '/plans', label: 'Plans', icon: Gem },
    { path: '/settings', label: 'Settings', icon: Settings },
    ...(user && user.role === 'admin' ? [
      { path: '/admin', label: 'Admin', icon: Crown },
      { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard }
    ] : [])
  ];

  return (
    <nav className="bg-gray-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src={logoSvg} alt="RexStream" style={{ height: '1.8rem' }} />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                    isActive(link.path)
                      ? 'bg-white/20 text-white font-semibold'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center gap-2">
            {isAdminSession && (
              <Button
                onClick={handleReturnToAdmin}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-1.5 text-xs"
              >
                <Crown className="w-3.5 h-3.5" />
                Return to Admin
              </Button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center font-bold text-white text-sm">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <Badge variant="secondary" className="text-xs font-medium">
                {user.plan_name || 'Free'}
              </Badge>
            </div>
            {(!user.plan_name || user.plan_name === 'Free') && (
              <Link to="/plans">
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold gap-1.5 text-xs">
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                  Upgrade
                </Button>
              </Link>
            )}
            <Button
              onClick={handleLogout}
              size="sm"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 font-semibold gap-1.5 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={toggleMobileMenu}
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={`block h-0.5 w-full bg-white transition-all duration-300 ${
                  mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              ></span>
              <span
                className={`block h-0.5 w-full bg-white transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0' : ''
                }`}
              ></span>
              <span
                className={`block h-0.5 w-full bg-white transition-all duration-300 ${
                  mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              ></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden fixed top-16 right-0 w-64 h-[calc(100vh-4rem)] bg-gray-900 shadow-2xl p-4 transition-transform duration-300 ease-in-out overflow-y-auto z-50 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center font-bold text-white">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{user.plan_name || 'Free'} Plan</span>
            <Badge variant="secondary" className="text-xs w-fit">
              {user.plan_name || 'Free'}
            </Badge>
          </div>
        </div>

        {(!user.plan_name || user.plan_name === 'Free') && (
          <Link to="/plans" onClick={() => setMobileMenuOpen(false)}>
            <Button className="w-full mb-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-semibold gap-2">
              <ArrowUpCircle className="w-4 h-4" />
              Upgrade Plan
            </Button>
          </Link>
        )}

        {isAdminSession && (
          <Button
            onClick={() => {
              handleReturnToAdmin();
              setMobileMenuOpen(false);
            }}
            className="w-full mb-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold gap-2"
          >
            <Crown className="w-4 h-4" />
            Return to Admin
          </Button>
        )}

        <div className="space-y-1">
          {navLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-medium ${
                  isActive(link.path)
                    ? 'bg-gray-700 text-white font-semibold'
                    : 'text-gray-200 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <IconComponent className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        <Button
          onClick={() => {
            handleLogout();
            setMobileMenuOpen(false);
          }}
          variant="destructive"
          className="w-full mt-6 bg-red-600 hover:bg-red-700 font-semibold gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 top-16"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}
    </nav>
  );
}

export default Navbar;
