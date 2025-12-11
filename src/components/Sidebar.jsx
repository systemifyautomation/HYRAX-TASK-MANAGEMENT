import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Calendar, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Sidebar = () => {
  const { currentUser, getTasksNeedingReview, getMyTasks } = useApp();
  const isManager = currentUser.role === 'manager';
  
  const tasksNeedingReview = isManager ? getTasksNeedingReview().length : 0;
  const myTasks = !isManager ? getMyTasks().length : 0;

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/campaigns', icon: FolderOpen, label: 'Campaigns' },
    { to: '/weekly', icon: Calendar, label: 'Weekly View' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-600">HYRAX</h1>
        <p className="text-sm text-gray-500 mt-1">Task Management</p>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-medium">
            {currentUser.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
            <p className="text-xs text-gray-500 capitalize">{currentUser.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
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

      {/* Stats */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {isManager ? (
          <div className="flex items-center justify-between px-4 py-2 bg-amber-50 rounded-lg">
            <span className="text-sm text-gray-700">Pending Reviews</span>
            <span className="text-sm font-bold text-amber-600">{tasksNeedingReview}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-gray-700">My Tasks</span>
            <span className="text-sm font-bold text-primary-600">{myTasks}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
