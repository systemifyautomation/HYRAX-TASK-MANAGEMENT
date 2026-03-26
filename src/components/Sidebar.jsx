import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { CheckSquare, FolderOpen, Users, LogOut, ChevronLeft, ChevronRight, Facebook, BarChart3, Settings, Moon, Sun, ClipboardList } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import { isManager, isAdmin } from '../constants/roles';

const Sidebar = ({ onCollapsedChange }) => {
  const { currentUser, logout, darkMode, toggleDarkMode } = useApp();
  const navigate = useNavigate();
  const isManagerUser = currentUser ? isManager(currentUser.role) : false;
  const isAdminUser = currentUser ? isAdmin(currentUser.role) : false;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onCollapsedChange) {
      onCollapsedChange(newState);
    }
  };

  const navItems = [
    { to: '/', icon: CheckSquare, label: 'Tasks', end: true },
    { to: '/campaigns', icon: FolderOpen, label: 'Campaigns' },
    { to: '/performance', icon: BarChart3, label: 'Performance', managerOnly: true },
    { to: '/users', icon: Users, label: 'User Management', managerOnly: true },
    { to: '/ad-accounts', icon: Facebook, label: 'Ad Accounts', managerOnly: true },
    { to: '/monitor-log', icon: ClipboardList, label: 'Monitor Log', adminOnly: true },
  ];

  return (
    <div className={`fixed left-0 top-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 relative flex-shrink-0">
        {!isCollapsed && (
          <>
            <h1 className="text-2xl font-bold text-primary-600">HYRAX</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Task Management</p>
          </>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <h1 className="text-2xl font-bold text-primary-600">H</h1>
          </div>
        )}
        
        {/* Toggle Button */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-primary-600 hover:border-primary-300 transition-colors shadow-sm"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.filter(item => {
          if (item.adminOnly) return isAdminUser;
          if (item.managerOnly) return isManagerUser;
          return true;
        }).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-600 dark:text-white font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
            title={isCollapsed ? item.label : ''}
          >
            <item.icon className="w-5 h-5" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Dark Mode Toggle & User Info at Bottom */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        {/* Dark Mode Toggle */}
        <div className={`px-4 py-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Dark mode button clicked, current mode:', darkMode);
              toggleDarkMode();
            }}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 w-full'} px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer`}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            type="button"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {!isCollapsed && <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
        </div>

        {/* Sign Out Button (appears when user menu is open) */}
        {showUserMenu && !isCollapsed && (
          <div className="px-3 pb-1 border-t border-gray-200 dark:border-gray-700 pt-2">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
        
        {/* User Profile */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => !isCollapsed && setShowUserMenu(!showUserMenu)}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            {currentUser?.profile_picture ? (
              <img src={currentUser.profile_picture} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{currentUser?.name || 'User'}</p>
                  {isAdminUser && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/settings');
                      }}
                      className="p-1 text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.role?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'User'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
