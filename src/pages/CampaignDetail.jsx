import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Calendar, DollarSign } from 'lucide-react';
import { useApp } from '../context/AuthContext';
import TaskCard from '../components/TaskCard';
import { format } from 'date-fns';

const CampaignDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCampaignById, getTasksByCampaign } = useApp();

  const campaign = getCampaignById(parseInt(id));
  const tasks = getTasksByCampaign(parseInt(id));

  if (!campaign) {
    return (
      <div className="p-8">
        <div className="card text-center py-12">
          <p className="text-gray-600">Campaign not found</p>
          <button onClick={() => navigate('/campaigns')} className="btn-primary mt-4">
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      planning: 'bg-amber-100 text-amber-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const tasksByType = {
    copy: tasks.filter(t => t.type === 'copy'),
    image: tasks.filter(t => t.type === 'image'),
    video: tasks.filter(t => t.type === 'video'),
    script: tasks.filter(t => t.type === 'script'),
  };

  return (
    <div className="p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/campaigns')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Campaigns</span>
      </button>

      {/* Campaign Header */}
      <div className="card mb-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
              <FolderOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign.name}</h1>
              <p className="text-gray-600">{campaign.client}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${getStatusColor(campaign.status)}`}>
            {campaign.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Duration</p>
              <p className="font-medium text-gray-900">
                {format(new Date(campaign.startDate), 'MMM d')} - {format(new Date(campaign.endDate), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Budget</p>
              <p className="font-medium text-gray-900">{campaign.budget}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Platform</p>
              <p className="font-medium text-gray-900">{campaign.platform}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks by Type */}
      <div className="space-y-8">
        {Object.entries(tasksByType).map(([type, typeTasks]) => {
          if (typeTasks.length === 0) return null;
          
          return (
            <div key={type}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 capitalize">
                {type} Tasks ({typeTasks.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {typeTasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-600">No tasks found for this campaign</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDetail;
