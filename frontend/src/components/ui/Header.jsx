import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, Video, Menu, X, User, Bell, LogOut, Settings, BookOpen } from 'lucide-react';
import { Avatar } from './avatar';

export const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [chatNotifications, setChatNotifications] = useState(0);
  const [callNotifications, setCallNotifications] = useState(false);

  // Handle scroll event to change header appearance
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Close user dropdown when toggling main menu
    setIsUserDropdownOpen(false);
  };

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className={`${isScrolled ? 'shadow-md' : ''} bg-gradient-to-r from-primary-600 to-primary-800 sticky top-0 z-50 transition-shadow duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xl md:text-2xl font-bold text-white">
                MentorConnect
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* User Dropdown */}
                <div className="relative">
                  <button 
                    className="flex items-center space-x-2 text-white hover:text-primary-100 transition-colors focus:outline-none"
                    onClick={toggleUserDropdown}
                  >
                    <span className="hidden lg:inline-block">{user.name || 'User'}</span>
                    <Avatar 
                      src={user.profileImage}
                      name={user.name || 'User'}
                      alt="User avatar" 
                      size="sm"
                      border={true}
                      borderColor="white"
                      className="ring-2 ring-white/10"
                    />
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-lg shadow-xl z-10">
                      <Link 
                        to="/dashboard" 
                        className="block px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        to="/chat" 
                        className="block px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        Messages
                      </Link>
                      <Link 
                        to="/profile" 
                        className="block px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
                        onClick={() => setIsUserDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <hr className="my-1 border-neutral-200" />
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-neutral-700 hover:bg-primary-50 hover:text-primary-700"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="px-4 py-2 text-white hover:text-primary-100 font-medium transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-primary-50 font-medium transition-all shadow-md hover:shadow-lg"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg text-white hover:bg-white/10 focus:outline-none"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 pointer-events-none'} md:hidden bg-white shadow-lg overflow-hidden transition-all duration-300 ease-in-out`}>
        <div className="px-4 py-3 space-y-1">
          {user ? (
            <>
              <div className="flex items-center space-x-3 py-3 border-b border-neutral-100">
                <Avatar 
                  src={user.profileImage}
                  name={user.name || 'User'}
                  alt="User avatar" 
                  size="md"
                  border={true}
                  borderColor="primary"
                />
                <div>
                  <p className="font-semibold text-neutral-900">{user.name || 'User'}</p>
                  <p className="text-sm text-neutral-500">{user.email || ''}</p>
                </div>
              </div>
              
              {/* Main Navigation Section */}
              <div className="pt-2 pb-1">
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold px-4 py-1">Main</h3>
                <MobileNavLink to="/dashboard" onClick={toggleMenu}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </MobileNavLink>
              </div>
              
              {/* Communication Section - Modified to remove Connections */}
              <div className="pt-2 pb-1">
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold px-4 py-1">Communication</h3>
                <MobileNavLink to="/chat" onClick={toggleMenu}>
                  <div className="flex items-center">
                    <div className="relative">
                      <MessageCircle className="w-5 h-5 mr-3" />
                      {chatNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {chatNotifications > 9 ? '9+' : chatNotifications}
                        </span>
                      )}
                    </div>
                    Messages
                  </div>
                </MobileNavLink>
                <MobileNavLink to="/video-call" onClick={toggleMenu}>
                  <div className="flex items-center">
                    <div className="relative">
                      <Video className="w-5 h-5 mr-3" />
                      {callNotifications && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          !
                        </span>
                      )}
                    </div>
                    Video Call
                  </div>
                </MobileNavLink>
              </div>
              
              {/* Progress Section */}
              <div className="pt-2 pb-1">
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold px-4 py-1">Progress</h3>
                <MobileNavLink to="/goal-tracking" onClick={toggleMenu}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Goal Tracker
                </MobileNavLink>
                <MobileNavLink to="/sessions" onClick={toggleMenu}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Sessions
                </MobileNavLink>
              </div>
              
              {/* Account Section - Removed Settings */}
              <div className="pt-2 pb-1">
                <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold px-4 py-1">Account</h3>
                <MobileNavLink to="/profile" onClick={toggleMenu}>
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </MobileNavLink>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-3 text-left text-neutral-700 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-3 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col space-y-3 py-4">
              <button
                onClick={() => {
                  toggleMenu();
                  navigate("/login");
                }}
                className="w-full px-4 py-3 text-center text-primary-600 hover:bg-primary-50 font-medium transition-colors rounded-lg"
              >
                Login
              </button>
              <button
                onClick={() => {
                  toggleMenu();
                  navigate("/signup");
                }}
                className="w-full px-4 py-3 bg-primary-600 text-white hover:bg-primary-700 font-medium transition-all rounded-lg shadow-md"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// NavLink Component for Desktop
const NavLink = ({ to, children }) => (
  <Link 
    to={to} 
    className="px-3 py-2 text-white hover:text-primary-100 font-medium transition-colors"
  >
    {children}
  </Link>
);

// NavLink Component for Mobile
const MobileNavLink = ({ to, children, onClick }) => (
  <Link 
    to={to} 
    className="flex items-center px-4 py-3 text-neutral-700 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors"
    onClick={onClick}
  >
    {children}
  </Link>
); 