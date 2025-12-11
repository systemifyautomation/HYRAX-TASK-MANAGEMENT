import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import TaskCard from '../components/TaskCard';
import { getCurrentWeekNumber } from '../data/mockData';

const WeeklyView = () => {
  const { tasks } = useApp();
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekNumber());

  // Get unique weeks from tasks
  const uniqueWeeks = [...new Set(tasks.map(t => t.weekNumber))].sort((a, b) => a - b);
  
  const tasksThisWeek = tasks.filter(t => t.weekNumber === currentWeek);

  const goToPreviousWeek = () => {
    const currentIndex = uniqueWeeks.indexOf(currentWeek);
    if (currentIndex > 0) {
      setCurrentWeek(uniqueWeeks[currentIndex - 1]);
    }
  };

  const goToNextWeek = () => {
    const currentIndex = uniqueWeeks.indexOf(currentWeek);
    if (currentIndex < uniqueWeeks.length - 1) {
      setCurrentWeek(uniqueWeeks[currentIndex + 1]);
    }
  };

  const tasksByStatus = {
    not_started: tasksThisWeek.filter(t => t.status === 'not_started'),
    in_progress: tasksThisWeek.filter(t => t.status === 'in_progress'),
    submitted: tasksThisWeek.filter(t => t.status === 'submitted'),
    needs_revision: tasksThisWeek.filter(t => t.status === 'needs_revision'),
    approved: tasksThisWeek.filter(t => t.status === 'approved'),
  };

  const statusLabels = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    submitted: 'Submitted',
    needs_revision: 'Needs Revision',
    approved: 'Approved',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Weekly View</h1>
        <p className="text-gray-600">View and manage tasks by week</p>
      </div>

      {/* Week Selector */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Week {currentWeek}</h2>
              <p className="text-sm text-gray-600">{tasksThisWeek.length} tasks this week</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={goToPreviousWeek}
              disabled={uniqueWeeks.indexOf(currentWeek) === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToNextWeek}
              disabled={uniqueWeeks.indexOf(currentWeek) === uniqueWeeks.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-200">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <div key={status} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{statusTasks.length}</p>
              <p className="text-xs text-gray-600 mt-1">{statusLabels[status]}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks by Status */}
      {tasksThisWeek.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => {
            if (statusTasks.length === 0) return null;

            return (
              <div key={status}>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {statusLabels[status]} ({statusTasks.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {statusTasks.map(task => (
                    <TaskCard key={task.id} task={task} showCampaign={true} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No tasks scheduled for week {currentWeek}</p>
        </div>
      )}
    </div>
  );
};

export default WeeklyView;
