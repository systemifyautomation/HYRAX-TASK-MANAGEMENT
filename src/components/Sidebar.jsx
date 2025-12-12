import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CheckSquare, FolderOpen, Users, LogOut } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { isAdmin } from '../constants/roles';

const Sidebar = () => {
  const { currentUser, logout } = useApp();
  const isAdminUser = currentUser ? isAdmin(currentUser.role) : false;
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { to: '/', icon: CheckSquare, label: 'Tasks', end: true },
    { to: '/campaigns', icon: FolderOpen, label: 'Campaigns' },
    { to: '/users', icon: Users, label: 'User Management', adminOnly: true },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-600">HYRAX</h1>
        <p className="text-sm text-gray-500 mt-1">Task Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(item => !item.adminOnly || isAdminUser).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info at Bottom */}
      <div className="border-t border-gray-200">
        {/* Sign Out Button (appears when user menu is open) */}
        {showUserMenu && (
          <div className="p-3 border-b border-gray-200">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
        
        {/* User Profile */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{currentUser?.role || 'USER'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
