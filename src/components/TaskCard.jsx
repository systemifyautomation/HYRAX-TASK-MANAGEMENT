import React, { useState } from 'react';
import { FileText, Image, Video, FileCode, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { taskStatus as taskStatusEnum } from '../data/mockData';

const TaskCard = ({ task, showCampaign = false }) => {
  const { currentUser, getUserById, getCampaignById, updateTaskStatus, submitTask } = useApp();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  
  const isManager = currentUser.role === 'manager';
  const isAssignedToMe = task.assignedTo === currentUser.id;
  const assignedUser = getUserById(task.assignedTo);
  const campaign = getCampaignById(task.campaignId);

  const getTaskIcon = () => {
    switch (task.type) {
      case 'copy': return <FileText className="w-5 h-5" />;
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'script': return <FileCode className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      not_started: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Not Started', icon: Clock },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', icon: Clock },
      submitted: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Submitted', icon: AlertCircle },
      needs_revision: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Needs Revision', icon: XCircle },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved', icon: CheckCircle },
    };

    const config = statusConfig[task.status] || statusConfig.not_started;
    const StatusIcon = config.icon;

    return (
      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <StatusIcon className="w-3 h-3" />
        <span>{config.label}</span>
      </span>
    );
  };

  const handleSubmit = () => {
    if (submissionContent.trim()) {
      submitTask(task.id, submissionContent);
      setShowSubmitModal(false);
      setSubmissionContent('');
    }
  };

  const handleApprove = () => {
    updateTaskStatus(task.id, taskStatusEnum.APPROVED, reviewFeedback || 'Approved');
    setShowReviewModal(false);
    setReviewFeedback('');
  };

  const handleRequestRevision = () => {
    if (reviewFeedback.trim()) {
      updateTaskStatus(task.id, taskStatusEnum.NEEDS_REVISION, reviewFeedback);
      setShowReviewModal(false);
      setReviewFeedback('');
    }
  };

  return (
    <>
      <div className="card hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
              {getTaskIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
              <p className="text-sm text-gray-500 truncate">{task.description}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {showCampaign && campaign && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">Campaign: </span>
            <span className="text-xs font-medium text-gray-700">{campaign.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-gray-500">Assigned to: </span>
              <span className="font-medium">{assignedUser.name}</span>
            </div>
            <div>
              <span className="text-gray-500">Due: </span>
              <span className="font-medium">{format(new Date(task.dueDate), 'MMM d')}</span>
            </div>
          </div>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{task.type}</span>
        </div>

        {task.feedback && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Feedback:</p>
            <p className="text-sm text-gray-700">{task.feedback}</p>
          </div>
        )}

        {task.submittedContent && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Submitted Content:</p>
            {task.type === 'image' || task.type === 'video' ? (
              <a href={task.submittedContent} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">
                View {task.type}
              </a>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.submittedContent}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          {isAssignedToMe && !isManager && (task.status === taskStatusEnum.NOT_STARTED || task.status === taskStatusEnum.IN_PROGRESS || task.status === taskStatusEnum.NEEDS_REVISION) && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn-primary text-sm flex-1"
            >
              {task.status === taskStatusEnum.NEEDS_REVISION ? 'Resubmit' : 'Submit Work'}
            </button>
          )}

          {isManager && task.status === taskStatusEnum.SUBMITTED && (
            <button
              onClick={() => setShowReviewModal(true)}
              className="btn-primary text-sm flex-1"
            >
              Review Submission
            </button>
          )}

          {task.status === taskStatusEnum.NOT_STARTED && isAssignedToMe && !isManager && (
            <button
              onClick={() => updateTaskStatus(task.id, taskStatusEnum.IN_PROGRESS)}
              className="btn-secondary text-sm flex-1"
            >
              Mark In Progress
            </button>
          )}
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Submit Task</h3>
            <p className="text-sm text-gray-600 mb-4">{task.title}</p>
            
            <textarea
              value={submissionContent}
              onChange={(e) => setSubmissionContent(e.target.value)}
              placeholder={task.type === 'image' || task.type === 'video' ? 'Enter URL to your work...' : 'Enter your work...'}
              className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
            
            <div className="flex space-x-3 mt-4">
              <button onClick={handleSubmit} className="btn-primary flex-1">
                Submit
              </button>
              <button onClick={() => setShowSubmitModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Review Submission</h3>
            <p className="text-sm text-gray-600 mb-2">{task.title}</p>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Submitted Content:</p>
              {task.type === 'image' || task.type === 'video' ? (
                <a href={task.submittedContent} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">
                  View {task.type}
                </a>
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.submittedContent}</p>
              )}
            </div>
            
            <textarea
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
              placeholder="Enter feedback (optional for approval, required for revision)..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none mb-4"
            />
            
            <div className="flex space-x-3">
              <button onClick={handleApprove} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">
                Approve
              </button>
              <button 
                onClick={handleRequestRevision} 
                className="btn-primary flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={!reviewFeedback.trim()}
              >
                Request Revision
              </button>
              <button onClick={() => setShowReviewModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskCard;
