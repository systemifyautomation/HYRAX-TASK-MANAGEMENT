import { X, ChevronLeft, ChevronRight, Upload, XCircle } from 'lucide-react';
import { USER_ROLES } from '../constants/roles';

const UserTasksModal = ({ 
  userTasksModal, 
  setUserTasksModal, 
  currentUser,
  campaigns,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  uploadingCreatives,
  setFeedbackModal,
  updateTask,
  handleCreativeUpload,
  handleCancelUpload
}) => {
  if (!userTasksModal) return null;

  const isVideoEditor = userTasksModal.user.department === 'VIDEO EDITING';
  const isGraphicDesigner = userTasksModal.user.department === 'GRAPHIC DESIGN';

  // Collect all viewer links from all tasks with proper ad numbering
  const allLinks = [];
  
  // Group tasks by campaign to calculate proper ad offset
  const tasksByCampaign = userTasksModal.tasks.reduce((groups, task) => {
    const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
    const campaignName = campaign?.name || 'No Campaign';
    if (!groups[campaignName]) {
      groups[campaignName] = [];
    }
    groups[campaignName].push(task);
    return groups;
  }, {});
  
  // Build links with correct ad numbers
  Object.entries(tasksByCampaign).forEach(([campaignName, campaignTasks]) => {
    campaignTasks.forEach((task, taskIndex) => {
      // Calculate ad offset: sum of all previous tasks' quantities in this campaign
      const adOffset = campaignTasks.slice(0, taskIndex).reduce((sum, prevTask) => {
        const qty = parseInt(prevTask.quantity?.replace('x', '') || '1');
        return sum + qty;
      }, 0);

      const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
      const quantity = parseInt(task.quantity?.replace('x', '') || '1');
      
      if (task.viewerLink && task.viewerLink.length > 0) {
        task.viewerLink.forEach((link, linkIndex) => {
          if (link) {
            const adNumber = adOffset + Math.floor(linkIndex / (isVideoEditor ? 2 : 1)) + 1;
            const formatLabel = isVideoEditor ? (linkIndex % 2 === 0 ? 'Facebook Format' : 'Reel') : null;
            
            allLinks.push({
              url: link,
              taskId: task.id,
              taskTitle: task.title,
              campaignName: campaign?.name || 'No Campaign',
              adNumber: adNumber,
              formatLabel: formatLabel,
              linkIndex: linkIndex,
              approval: task.viewerLinkApproval?.[linkIndex] || 'Not Done',
              feedback: task.viewerLinkFeedback?.[linkIndex] || ''
            });
          }
        });
      }
    });
  });

  const currentAd = allLinks[currentPreviewIndex] || allLinks[0];

  // Convert URL to embeddable format
  const getEmbedUrl = (url) => {
    if (!url) return url;

    // Google Drive: Convert /file/d/{id}/view to /file/d/{id}/preview
    if (url.includes('drive.google.com')) {
      return url.replace('/view', '/preview');
    }

    // YouTube: Convert watch?v={id} to /embed/{id}
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(url.split('?')[1]);
        videoId = urlParams.get('v');
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return url;
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex">
      {/* Left Side - Video Previews (65%) */}
      <div className="w-[65%] bg-gray-900 p-6 overflow-hidden flex flex-col">
        {allLinks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No creatives uploaded yet</p>
            </div>
          </div>
        ) : (
          <>
            {/* Preview Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {currentAd?.campaignName} - Ad {currentAd?.adNumber}
                    {currentAd?.formatLabel && <span className="text-blue-400 ml-2">({currentAd.formatLabel})</span>}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">{currentAd?.taskTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentAd?.approval === 'Approved' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                      : currentAd?.approval === 'Needs Review'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                  }`}>
                    {currentAd?.approval || 'Not Done'}
                  </span>
                  <span className="text-gray-400">
                    {currentPreviewIndex + 1} / {allLinks.length}
                  </span>
                </div>
              </div>
              {currentAd?.feedback && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">Manager Feedback:</p>
                  <p className="text-sm text-yellow-200 whitespace-pre-wrap">{currentAd.feedback}</p>
                </div>
              )}
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-black rounded-lg overflow-hidden relative">
              <iframe
                src={getEmbedUrl(currentAd?.url)}
                className="w-full h-full"
                title={`Ad ${currentAd?.adNumber} Preview`}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
                disabled={currentPreviewIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              <button
                onClick={() => setCurrentPreviewIndex(Math.min(allLinks.length - 1, currentPreviewIndex + 1))}
                disabled={currentPreviewIndex >= allLinks.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right Side - Task Details (35%) */}
      <div className="w-[35%] bg-white overflow-y-auto">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{userTasksModal.user.name}</h1>
              <p className="text-sm text-gray-500">{userTasksModal.user.department}</p>
            </div>
            <button onClick={() => setUserTasksModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-8">
            {Object.entries(
              userTasksModal.tasks.reduce((groups, task) => {
                const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                const campaignName = campaign?.name || 'No Campaign';
                if (!groups[campaignName]) {
                  groups[campaignName] = [];
                }
                groups[campaignName].push(task);
                return groups;
              }, {})
            ).map(([campaignName, campaignTasks]) => (
              <div key={campaignName}>
                <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b-2 border-gray-200">
                  {campaignName}
                </h2>
                
                {campaignTasks.map((task, taskIndex) => {
                  const actualTaskIndex = userTasksModal.tasks.findIndex(t => t.id === task.id);
                  const adOffset = campaignTasks.slice(0, taskIndex).reduce((sum, prevTask) => {
                    const qty = parseInt(prevTask.quantity?.replace('x', '') || '1');
                    return sum + qty;
                  }, 0);

                  const quantity = parseInt(task.quantity?.replace('x', '') || '1');
                  const totalSlots = isVideoEditor ? quantity * 2 : quantity;

                  return (
                    <div key={task.id} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">{task.title}</h3>
                      
                      <div className="space-y-3">
                        {Array.from({ length: totalSlots }).map((_, i) => {
                          const slotIndex = i;
                          const adNumber = adOffset + Math.floor(i / (isVideoEditor ? 2 : 1)) + 1;
                          const formatIndex = isVideoEditor ? i % 2 : 0;
                          const formatLabel = isVideoEditor ? (formatIndex === 0 ? 'Facebook Format' : 'Reel') : null;
                          
                          const hasUpload = task.viewerLink && task.viewerLink[slotIndex];

                          return (
                            <div key={i} className="border border-gray-200 rounded-lg p-3 bg-white">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Ad {adNumber}
                                  </span>
                                  {formatLabel && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                      {formatLabel}
                                    </span>
                                  )}
                                </div>
                                {task.viewerLinkApproval && task.viewerLinkApproval[slotIndex] && (
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    task.viewerLinkApproval[slotIndex] === 'Approved'
                                      ? 'bg-green-100 text-green-700'
                                      : task.viewerLinkApproval[slotIndex] === 'Needs Review'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {task.viewerLinkApproval[slotIndex]}
                                  </span>
                                )}
                              </div>
                              
                              {hasUpload ? (
                                <div className="space-y-2">
                                  <div className="text-xs text-gray-500 truncate">
                                    {task.viewerLink[slotIndex]}
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        const allLinks = [];
                                        userTasksModal.tasks.forEach((t) => {
                                          if (t.viewerLink && t.viewerLink.length > 0) {
                                            t.viewerLink.forEach((link, idx) => {
                                              if (link) {
                                                allLinks.push({ taskId: t.id, linkIndex: idx });
                                              }
                                            });
                                          }
                                        });
                                        
                                        const previewIndex = allLinks.findIndex(
                                          item => item.taskId === task.id && item.linkIndex === slotIndex
                                        );
                                        
                                        if (previewIndex !== -1) {
                                          setCurrentPreviewIndex(previewIndex);
                                        }
                                      }}
                                      className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-300 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    >
                                      Preview
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('Are you sure you want to delete this creative?')) {
                                          const updatedViewerLinks = Array.isArray(task.viewerLink) ? [...task.viewerLink] : [];
                                          const updatedApprovals = Array.isArray(task.viewerLinkApproval) ? [...task.viewerLinkApproval] : [];
                                          const updatedFeedback = Array.isArray(task.viewerLinkFeedback) ? [...task.viewerLinkFeedback] : [];
                                          
                                          updatedViewerLinks[slotIndex] = '';
                                          updatedApprovals[slotIndex] = 'Not Done';
                                          updatedFeedback[slotIndex] = '';
                                          
                                          updateTask(task.id, { 
                                            viewerLink: updatedViewerLinks,
                                            viewerLinkApproval: updatedApprovals,
                                            viewerLinkFeedback: updatedFeedback
                                          });
                                          
                                          const updatedTasks = [...userTasksModal.tasks];
                                          updatedTasks[actualTaskIndex] = { 
                                            ...task, 
                                            viewerLink: updatedViewerLinks,
                                            viewerLinkApproval: updatedApprovals,
                                            viewerLinkFeedback: updatedFeedback
                                          };
                                          setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                        }
                                      }}
                                      className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                  
                                  {/* Manager Actions */}
                                  {(currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN) && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          const existingFeedback = task.viewerLinkFeedback && task.viewerLinkFeedback[slotIndex] 
                                            ? task.viewerLinkFeedback[slotIndex] 
                                            : '';
                                          
                                          setFeedbackModal({
                                            taskId: task.id,
                                            columnKey: 'viewerLink',
                                            itemIndex: slotIndex,
                                            currentFeedback: existingFeedback,
                                            readOnly: false
                                          });
                                        }}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-yellow-600 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                                      >
                                        Leave Feedback
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm('Approve this creative?')) {
                                            const updatedApprovals = Array.isArray(task.viewerLinkApproval) 
                                              ? [...task.viewerLinkApproval] 
                                              : [];
                                            
                                            while (updatedApprovals.length <= slotIndex) {
                                              updatedApprovals.push('Not Done');
                                            }
                                            
                                            updatedApprovals[slotIndex] = 'Approved';
                                            
                                            const updatedTasks = [...userTasksModal.tasks];
                                            updatedTasks[actualTaskIndex] = { 
                                              ...task, 
                                              viewerLinkApproval: updatedApprovals
                                            };
                                            setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                                            updateTask(task.id, { 
                                              viewerLinkApproval: updatedApprovals
                                            });
                                          }
                                        }}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 border border-green-300 rounded-md hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                                      >
                                        Approve
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Display existing feedback */}
                                  {task.viewerLinkFeedback && task.viewerLinkFeedback[slotIndex] && (
                                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                      <p className="text-xs font-semibold text-gray-700 mb-1">Manager Feedback:</p>
                                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{task.viewerLinkFeedback[slotIndex]}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  {uploadingCreatives[`${task.id}-${slotIndex}`] !== undefined ? (
                                    <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                                      <div className="text-blue-600 mb-2">
                                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                      </div>
                                      <p className="text-sm font-medium text-blue-700 mb-1">
                                        Uploading... {uploadingCreatives[`${task.id}-${slotIndex}`]}%
                                      </p>
                                      <button
                                        onClick={() => handleCancelUpload(`${task.id}-${slotIndex}`)}
                                        className="mt-2 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-300 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                                      >
                                        <XCircle className="w-3 h-3" />
                                        Cancel Upload
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                      <span className="text-sm text-gray-600">Click to upload</span>
                                      <span className="text-xs text-gray-400 mt-1">
                                        {isVideoEditor ? 'MP4 video' : 'JPG or PNG image'}
                                      </span>
                                      <input
                                        type="file"
                                        accept={isVideoEditor ? ".mp4,video/mp4" : ".jpg,.jpeg,.png,image/jpeg,image/png"}
                                        className="hidden"
                                        onChange={(e) => {
                                          const file = e.target.files[0];
                                          if (file) {
                                            const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                                            handleCreativeUpload(
                                              task.id, 
                                              slotIndex, 
                                              file, 
                                              task, 
                                              userTasksModal.user, 
                                              campaign
                                            );
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTasksModal;
