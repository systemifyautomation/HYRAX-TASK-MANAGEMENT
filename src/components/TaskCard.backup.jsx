import React, { useState } from 'react';
import { FileText, Image, Video, FileCode, Clock, CheckCircle, XCircle, AlertCircle, Flag, MessageSquare, CheckSquare, Timer, ExternalLink, Eye, Edit } from 'lucide-react';
import { format, isToday, isThisWeek } from 'date-fns';
import { useApp } from '../context/AuthContext';
import { taskStatus as taskStatusEnum } from '../data/mockData';
import { isManager as checkIsManager } from '../constants/roles';
import { isMediaBuyer, isCreative } from '../constants/roles';

const TaskCard = ({ task, showCampaign = false, onTaskClick }) => {
  const { currentUser, getUserById, getCampaignById, updateTaskStatus, submitTask, tasks, scheduledTasks, updateTask, updateScheduledTask } = useApp();
  const { currentUser, getUserById, getCampaignById, updateTaskStatus, submitTask, tasks, scheduledTasks, updateTask, updateScheduledTask } = useApp();
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [timeFilter, setTimeFilter] = useState('week'); // 'today' or 'week'
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [newComment, setNewComment] = useState('');
  
  const isManagerRole = checkIsManager(currentUser?.role);
  const isAssignedToMe = task.assignedTo === currentUser.id;
  const assignedUser = getUserById(task.assignedTo);
  const campaign = getCampaignById(task.campaignId);
  const userDepartment = currentUser?.department;

  // Helper function to get status color
  const getStatusColor = (status) => {
    const statusColors = {
      'Approved': 'bg-green-100 text-green-700 border-green-200',
      'Needs Review': 'bg-orange-100 text-orange-700 border-orange-200',
      'Left feedback': 'bg-blue-100 text-blue-700 border-blue-200',
      'Unchecked': 'bg-gray-100 text-gray-600 border-gray-200',
      'Revisit Later': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  };

  // Helper to check if timestamp matches filter
  const matchesTimeFilter = (timestamp) => {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return timeFilter === 'today' ? isToday(date) : isThisWeek(date, { weekStartsOn: 1 });
  };

  // For Media Buyers: Get all tasks for current week
  const getWeeklyProgress = () => {
    const allTasks = [...(tasks || []), ...(scheduledTasks || [])];
    const weekTasks = allTasks.filter(t => 
      t.campaignId === task.campaignId && 
      t.week === task.week
    );
    const copiesWritten = weekTasks.filter(t => t.copyWritten === true).length;
    return { written: copiesWritten, total: weekTasks.length };
  };

  // For Creatives: Get approved copies
  const getApprovedCopies = () => {
    const allTasks = [...(tasks || []), ...(scheduledTasks || [])];
    return allTasks.filter(t => 
      t.assignedTo === currentUser.id &&
      t.copyApproval === 'Approved' &&
      (timeFilter === 'today' ? matchesTimeFilter(t.copyApprovalAt) : matchesTimeFilter(t.copyApprovalAt))
    );
  };

  // For Creatives: Get viewer links with status
  const getViewerLinksWithStatus = () => {
    if (!Array.isArray(task.viewerLink)) return [];
    return task.viewerLink.map((link, idx) => ({
      link,
      approval: task.viewerLinkApproval?.[idx] || 'Unchecked',
      timestamp: task.viewerLinkApprovalAt?.[idx]
    })).filter(item => item.link);
  };

  const handleCardClick = () => {
    if (isManagerRole) {
      setShowDetailModal(true);
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'normal': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = () => {
    switch (task.priority) {
      case 'urgent': return 'URGENT';
      case 'high': return 'High';
      case 'normal': return 'Normal';
      case 'low': return 'Low';
      default: return 'Normal';
    }
  };

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
        {/* Header with Priority and Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 flex-shrink-0">
              {getTaskIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{task.title}</h3>
              <p className="text-sm text-gray-500 truncate">{task.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${getPriorityColor()}`}>
              <Flag className="w-3 h-3 mr-1" />
              {getPriorityLabel()}
            </span>
            {getStatusBadge()}
          </div>
        </div>

        {showCampaign && campaign && (
          <div className="mb-3 pb-3 border-b border-gray-100">
            <span className="text-xs text-gray-500">Campaign: </span>
            <span className="text-xs font-medium text-gray-700">{campaign.name}</span>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {task.tags.map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Task Info */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-gray-500">Assigned to: </span>
            <span className="font-medium text-gray-900">{assignedUser.name}</span>
          </div>
          <div>
            <span className="text-gray-500">Due: </span>
            <span className="font-medium text-gray-900">{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
          </div>
          {task.estimatedHours && (
            <>
              <div className="flex items-center space-x-1">
                <Timer className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Est: </span>
                <span className="font-medium text-gray-900">{task.estimatedHours}h</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-500">Logged: </span>
                <span className="font-medium text-gray-900">{task.timeSpent}h</span>
              </div>
            </>
          )}
        </div>

        {/* Checklist Progress */}
        {task.checklist && task.checklist.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowChecklist(!showChecklist)}
              className="flex items-center justify-between w-full p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Checklist: {task.checklist.filter(item => item.completed).length}/{task.checklist.length}
                </span>
              </div>
              <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${(task.checklist.filter(item => item.completed).length / task.checklist.length) * 100}%` }}
                />
              </div>
            </button>
            
            {showChecklist && (
              <div className="mt-2 space-y-2 pl-6">
                {task.checklist.map((item) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      readOnly
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className={`text-sm ${item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {task.feedback && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-semibold mb-1 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Manager Feedback:
            </p>
            <p className="text-sm text-amber-900">{task.feedback}</p>
          </div>
        )}

        {task.submittedContent && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 font-semibold mb-1">Submitted Content:</p>
            {task.type === 'image' || task.type === 'video' ? (
              <a href={task.submittedContent} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline">
                View {task.type}
              </a>
            ) : (
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{task.submittedContent}</p>
            )}
          </div>
        )}

        {/* Comments Section */}
        {task.comments && task.comments.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{task.comments.length} {task.comments.length === 1 ? 'comment' : 'comments'}</span>
            </button>
            
            {showComments && (
              <div className="mt-2 space-y-2 pl-6 max-h-48 overflow-y-auto">
                {task.comments.map((comment) => {
                  const commentUser = getUserById(comment.userId);
                  return (
                    <div key={comment.id} className="bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs font-semibold text-primary-700">
                          {commentUser.avatar}
                        </div>
                        <span className="text-xs font-medium text-gray-900">{commentUser.name}</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.timestamp), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 pl-8">{comment.text}</p>
                    </div>
                  );
                })}
              </div>
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
