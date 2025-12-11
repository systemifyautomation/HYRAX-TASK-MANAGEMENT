import React from 'react';
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import TaskCard from '../components/TaskCard';
import { taskStatus } from '../data/mockData';

const Dashboard = () => {
  const { currentUser, tasks, campaigns, getTasksNeedingReview, getMyTasks } = useApp();
  const isManager = currentUser.role === 'manager';

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const tasksNeedingReview = getTasksNeedingReview();
  const myTasks = getMyTasks();

  const approvedTasks = tasks.filter(t => t.status === taskStatus.APPROVED).length;

  const stats = isManager ? [
    { label: 'Active Campaigns', value: activeCampaigns, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Reviews', value: tasksNeedingReview.length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Approved Tasks', value: approvedTasks, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Tasks', value: tasks.length, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  ] : [
    { label: 'My Tasks', value: myTasks.length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'In Progress', value: myTasks.filter(t => t.status === taskStatus.IN_PROGRESS).length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed', value: myTasks.filter(t => t.status === taskStatus.APPROVED).length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Need Revision', value: myTasks.filter(t => t.status === taskStatus.NEEDS_REVISION).length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isManager ? 'Manager Dashboard' : 'My Dashboard'}
        </h1>
        <p className="text-gray-600">
          {isManager ? 'Overview of all campaigns and tasks' : 'Track your tasks and progress'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Tasks Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isManager ? 'Tasks Needing Review' : 'My Recent Tasks'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isManager ? (
            tasksNeedingReview.length > 0 ? (
              tasksNeedingReview.slice(0, 4).map(task => (
                <TaskCard key={task.id} task={task} showCampaign={true} />
              ))
            ) : (
              <div className="col-span-2 card text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">All caught up! No tasks pending review.</p>
              </div>
            )
          ) : (
            myTasks.length > 0 ? (
              myTasks.slice(0, 4).map(task => (
                <TaskCard key={task.id} task={task} showCampaign={true} />
              ))
            ) : (
              <div className="col-span-2 card text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No tasks assigned yet.</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Active Campaigns */}
      {isManager && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.filter(c => c.status === 'active').map(campaign => (
              <div key={campaign.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full capitalize">
                    {campaign.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{campaign.client}</p>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Budget:</span>
                    <span className="font-medium">{campaign.budget}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform:</span>
                    <span className="font-medium">{campaign.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tasks:</span>
                    <span className="font-medium">{tasks.filter(t => t.campaignId === campaign.id).length}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
