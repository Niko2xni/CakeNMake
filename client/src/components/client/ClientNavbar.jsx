import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Plus, LayoutTemplate, Bot, Trash2, MessageSquare, Clock } from 'lucide-react';

export default function ClientNavbar() {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Add logout logic here
    navigate('/login');
  };

  return (
    <nav className="fixed left-0 top-0 h-screen w-[70px] bg-white/90 backdrop-blur-md shadow-lg border-r border-pink-100 z-50 flex flex-col">
      {/* Navigation Items */}
      <div className="flex-1 flex flex-col py-6 px-2 gap-2">
        {/* Create Button */}
        <Link 
          to="/designer"
          className="flex flex-col items-center gap-1 px-2 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-semibold hover:from-pink-600 hover:to-rose-600 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="text-xs">Create</span>
        </Link>

        {/* Recents Button */}
        <Link 
          to="/client"
          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-colors ${
            location.pathname === '/client' 
              ? 'text-pink-500 bg-pink-50' 
              : 'text-gray-700 hover:text-pink-500 hover:bg-pink-50'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-xs">Recents</span>
        </Link>

        {/* Templates Button */}
        <Link 
          to="/templates"
          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-colors ${
            location.pathname === '/templates' 
              ? 'text-pink-500 bg-pink-50' 
              : 'text-gray-700 hover:text-pink-500 hover:bg-pink-50'
          }`}
        >
          <LayoutTemplate className="w-5 h-5" />
          <span className="text-xs">Templates</span>
        </Link>

        {/* Cake AI Button */}
        <Link 
          to="/cake-ai"
          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-colors ${
            location.pathname === '/cake-ai' 
              ? 'text-pink-500 bg-pink-50' 
              : 'text-gray-700 hover:text-pink-500 hover:bg-pink-50'
          }`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-xs text-center">Cake AI</span>
        </Link>

        {/* Trash Button */}
        <Link 
          to="/trash"
          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-colors ${
            location.pathname === '/trash' 
              ? 'text-pink-500 bg-pink-50' 
              : 'text-gray-700 hover:text-pink-500 hover:bg-pink-50'
          }`}
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-xs">Trash</span>
        </Link>

        {/* Spacer to push bottom items */}
        <div className="flex-1"></div>

        {/* Chats Button */}
        <Link 
          to="/chats"
          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-colors ${
            location.pathname === '/chats' 
              ? 'text-pink-500 bg-pink-50' 
              : 'text-gray-700 hover:text-pink-500 hover:bg-pink-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs">Chats</span>
        </Link>

        {/* User Icon with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex flex-col items-center gap-1 w-full px-2 py-3 text-gray-700 hover:text-pink-500 hover:bg-pink-50 rounded-xl transition-colors"
          >
            <User className="w-5 h-5" />
            <span className="text-xs">User</span>
          </button>

          {/* User Dropdown */}
          {userDropdownOpen && (
            <div className="absolute left-0 bottom-full mb-2 w-56 bg-white rounded-xl shadow-xl border border-pink-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-pink-100">
                <p className="font-semibold text-gray-800">Welcome!</p>
                <p className="text-sm text-gray-600">user@example.com</p>
              </div>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                onClick={() => setUserDropdownOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors"
                onClick={() => setUserDropdownOpen(false)}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setUserDropdownOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 hover:bg-pink-50 hover:text-pink-600 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
