import { X, ChevronLeft, ChevronRight, Upload, XCircle, Eye, RefreshCw, MessageSquare, Check, History, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { USER_ROLES } from '../constants/roles';

// Hash function to generate code
const hashThreeInputs = async (input1, input2, input3) => {
  const combined = input1.toString() + input2.toString() + input3.toString();
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Helper function to get today's date in UTC format dd/MM/yyyy
const getTodayUTC = () => {
  const now = new Date();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const year = now.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

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
  const [adDetailsOpen, setAdDetailsOpen] = useState(null); // { taskId, adIndex, taskData }
  const [adVersions, setAdVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionPreview, setSelectedVersionPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('versions'); // 'versions' or 'feedback'

  // Fetch ad version history when sidebar opens
  useEffect(() => {
    const fetchAdVersions = async () => {
      if (!adDetailsOpen) {
        setAdVersions([]);
        return;
      }

      setLoadingVersions(true);
      try {
        const todayUTC = getTodayUTC();
        const adminEmail = currentUser.email;
        const adminPassword = localStorage.getItem('admin_password') || '';
        const code = await hashThreeInputs(adminEmail, adminPassword, todayUTC);

        // Get the current creative URL
        const currentUrl = adDetailsOpen.taskData.viewerLink?.[adDetailsOpen.adIndex];
        if (!currentUrl) {
          setAdVersions([]);
          setLoadingVersions(false);
          return;
        }

        const webhookUrl = 'https://workflows.wearehyrax.com/webhook/creative-history';
        const params = new URLSearchParams({
          code: code,
          requested_by: adminEmail,
          creative_url: currentUrl
        });

        const response = await fetch(`${webhookUrl}?${params}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const historyData = data[0];
            
            // Parse history URLs and timestamps
            const historyUrls = JSON.parse(historyData.history_url || '[]');
            const historyTimestamps = JSON.parse(historyData.history_createdAt || '[]');
            const feedbackHistory = JSON.parse(historyData.feedback_history || '[]');
            const feedbackTimestamps = JSON.parse(historyData.feedback_createdAt || '[]');
            
            // Build combined timeline
            const timeline = [];
            
            // Add current version
            timeline.push({
              type: 'creative',
              url: historyData.last_update_url,
              timestamp: historyData.updatedAt,
              isCurrent: true
            });
            
            // Add historical versions
            historyUrls.forEach((url, index) => {
              timeline.push({
                type: 'creative',
                url: url,
                timestamp: historyTimestamps[index] || historyData.createdAt,
                isCurrent: false
              });
            });
            
            // Add feedback
            feedbackHistory.forEach((feedback, index) => {
              timeline.push({
                type: 'feedback',
                feedback: feedback,
                timestamp: feedbackTimestamps[index] || historyData.createdAt
              });
            });
            
            // Sort by timestamp descending (newest first)
            timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            setAdVersions(timeline);
          } else {
            setAdVersions([]);
          }
        } else {
          console.error('Failed to fetch creative history:', response.status);
          setAdVersions([]);
        }
      } catch (err) {
        console.error('Error fetching creative history:', err);
        setAdVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    };

    fetchAdVersions();
  }, [adDetailsOpen, currentUser]);

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

    // Google Drive: Convert to proper embed format
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      let fileId = null;
      
      // Format: https://drive.google.com/file/d/{id}/view
      const fileMatch = url.match(/\/file\/d\/([^\/]+)/);
      if (fileMatch) {
        fileId = fileMatch[1];
      }
      
      // Format: https://drive.google.com/open?id={id}
      const openMatch = url.match(/[?&]id=([^&]+)/);
      if (openMatch) {
        fileId = openMatch[1];
      }
      
      // If we found a file ID, return the proper embed URL
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
      
      // Fallback: just replace /view with /preview
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
                  {selectedVersionPreview ? (
                    <>
                      <h2 className="text-2xl font-bold text-white">
                        {currentAd?.campaignName} - Ad {currentAd?.adNumber}
                        {currentAd?.formatLabel && <span className="text-blue-400 ml-2">({currentAd.formatLabel})</span>}
                      </h2>
                      <p className="text-gray-400 text-sm mt-1">
                        {selectedVersionPreview.isCurrent ? 'Current Version' : 'Previous Version'} - {new Date(selectedVersionPreview.timestamp).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold text-white">
                        {currentAd?.campaignName} - Ad {currentAd?.adNumber}
                        {currentAd?.formatLabel && <span className="text-blue-400 ml-2">({currentAd.formatLabel})</span>}
                      </h2>
                      <p className="text-gray-400 text-sm mt-1">{currentAd?.taskTitle}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {selectedVersionPreview && selectedVersionPreview.isCurrent && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/50">
                      Current
                    </span>
                  )}
                  {!selectedVersionPreview && (
                    <>
                      <span 
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          currentAd?.approval === 'Approved'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : currentAd?.approval === 'Uploaded' 
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : currentAd?.approval === 'Needs Review'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                        }`}
                        title={currentAd?.approval === 'Approved' ? 'The creative will be uploaded to Facebook within 30min' : ''}
                      >
                        {currentAd?.approval || 'Not Done'}
                      </span>
                      <span className="text-gray-400">
                        {currentPreviewIndex + 1} / {allLinks.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {!selectedVersionPreview && currentAd?.feedback && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">Manager Feedback:</p>
                  <p className="text-sm text-yellow-200 whitespace-pre-wrap">{currentAd.feedback}</p>
                </div>
              )}
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-black rounded-lg overflow-hidden relative">
              <iframe
                src={getEmbedUrl(selectedVersionPreview?.url || currentAd?.url)}
                className="w-full h-full"
                title={selectedVersionPreview ? 'Version Preview' : `Ad ${currentAd?.adNumber} Preview`}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Navigation Controls */}
            {!selectedVersionPreview && (
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
            )}
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
                            <div 
                              key={i} 
                              className={`rounded-xl p-6 bg-white transition-all shadow-sm hover:shadow-md border border-gray-100 ${
                                task.viewerLinkApproval?.[slotIndex] === 'Approved' || task.viewerLinkApproval?.[slotIndex] === 'Uploaded'
                                  ? 'bg-green-50/20'
                                  : task.viewerLinkApproval?.[slotIndex] === 'Needs Review'
                                  ? 'bg-orange-50/20'
                                  : ''
                              } ${
                                hasUpload ? 'cursor-pointer' : ''
                              }`}
                              onClick={() => {
                                if (hasUpload) {
                                  const previewIndex = allLinks.findIndex(
                                    item => item.taskId === task.id && item.linkIndex === slotIndex
                                  );
                                  if (previewIndex !== -1) {
                                    setCurrentPreviewIndex(previewIndex);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-center gap-2.5 mb-5">
                                <span className="text-lg font-semibold text-gray-900">
                                  Ad {adNumber}
                                </span>
                                {formatLabel && (
                                  <span className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-full font-medium">
                                    {formatLabel}
                                  </span>
                                )}
                              </div>
                              
                              {uploadingCreatives[`${task.id}-${slotIndex}`] !== undefined ? (
                                <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                                  <div className="text-blue-600 mb-2">
                                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                  </div>
                                  <p className="text-sm font-medium text-blue-700 mb-1">
                                    {hasUpload ? 'Replacing' : 'Uploading'}... {uploadingCreatives[`${task.id}-${slotIndex}`]}%
                                  </p>
                                  <button
                                    onClick={() => handleCancelUpload(`${task.id}-${slotIndex}`)}
                                    className="mt-2 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-300 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Cancel Upload
                                  </button>
                                </div>
                              ) : hasUpload ? (
                                <div className="space-y-5">
                                  {/* Link Display */}
                                  <div className="flex items-center gap-2.5 p-3.5 bg-gray-50/80 rounded-lg border border-gray-100">  
                                    <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <a 
                                      href={task.viewerLink[slotIndex]} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline truncate flex-1 min-w-0"
                                      title={task.viewerLink[slotIndex]}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {task.viewerLink[slotIndex]}
                                    </a>
                                  </div>
                                  
                                  {/* Action Buttons Row */}
                                  <div className="grid grid-cols-3 gap-2.5">
                                    {/* Preview Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const previewIndex = allLinks.findIndex(
                                          item => item.taskId === task.id && item.linkIndex === slotIndex
                                        );
                                        if (previewIndex !== -1) {
                                          setCurrentPreviewIndex(previewIndex);
                                        }
                                      }}
                                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all"
                                      title="Preview"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Preview
                                    </button>
                                    
                                    {/* Replace Button */}
                                    <input
                                      type="file"
                                      id={`replace-${task.id}-${slotIndex}`}
                                      style={{ display: 'none' }}
                                      accept="video/*,image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                                          const assignedUser = { 
                                            id: userTasksModal.user.id, 
                                            name: userTasksModal.user.name, 
                                            department: userTasksModal.user.department 
                                          };
                                          const previousUrl = task.viewerLink[slotIndex];
                                          await handleCreativeUpload(
                                            task.id, 
                                            slotIndex, 
                                            file, 
                                            task, 
                                            assignedUser, 
                                            campaign,
                                            previousUrl
                                          );
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        document.getElementById(`replace-${task.id}-${slotIndex}`).click();
                                      }}
                                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all"
                                      title="Replace"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Replace
                                    </button>
                                    
                                    {/* Feedback Button */}
                                    {(currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
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
                                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all"
                                        title="Leave Feedback"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                        Feedback
                                      </button>
                                    )}
                                    
                                    </div>
                                  
                                  {/* Approve Button - Separate Row */}
                                  {(currentUser.role === USER_ROLES.MANAGER || currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN) && 
                                   (!task.viewerLinkApproval || (task.viewerLinkApproval[slotIndex] !== 'Approved' && task.viewerLinkApproval[slotIndex] !== 'Uploaded')) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
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
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 hover:shadow-lg transform hover:scale-[1.02] transition-all shadow-md"
                                      title="Approve"
                                    >
                                      <Check className="w-5 h-5" />
                                      Approve Creative
                                    </button>
                                  )}
                                  
                                  <div>
                                    
                                    {/* View Details Button */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAdDetailsOpen({ 
                                          taskId: task.id, 
                                          adIndex: slotIndex, 
                                          taskData: task,
                                          adNumber: adNumber
                                        });
                                      }}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all"
                                      title="View History"
                                    >
                                      <History className="w-4 h-4" />
                                      View History & Details
                                    </button>
                                  </div>
                                  
                                  {/* Manager Feedback */}
                                  {task.viewerLinkFeedback && task.viewerLinkFeedback[slotIndex] && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                      <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-4 h-4 text-red-600" />
                                        <p className="text-sm font-bold text-red-900">Manager Feedback</p>
                                      </div>
                                      <p className="text-sm text-red-800 leading-relaxed whitespace-pre-wrap pl-6">{task.viewerLinkFeedback[slotIndex]}</p>
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
      
      {/* Ad Details Sidebar */}
      {adDetailsOpen && (
        <div className="fixed inset-y-0 right-0 w-[35%] bg-white shadow-xl z-50 flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Ad Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Ad {adDetailsOpen.adNumber} • {adDetailsOpen.taskData.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setAdDetailsOpen(null);
                  setSelectedVersionPreview(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('feedback')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'feedback'
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Comments
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'versions'
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <History className="w-4 h-4" />
                Versions
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-white">
            {loadingVersions ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">Loading...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Versions Tab */}
                {activeTab === 'versions' && (
                  <div className="p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Version history</h3>
                    {adVersions.filter(v => v.type === 'creative').length === 0 ? (
                      <div className="text-center py-16">
                        <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No version history available</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {adVersions
                          .filter(v => v.type === 'creative')
                          .map((version, idx) => (
                          <div
                            key={idx}
                            className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                              version.isCurrent
                                ? 'border-red-200 bg-red-50'
                                : selectedVersionPreview?.url === version.url
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedVersionPreview(version)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    ad-creative-v{adVersions.filter(v => v.type === 'creative').length - idx}
                                  </p>
                                  {version.isCurrent && (
                                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-500 text-white rounded">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">
                                  Uploaded by {adDetailsOpen.taskData.assignedTo || 'Team Member'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {new Date(version.timestamp).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })} at {new Date(version.timestamp).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </p>
                              </div>
                              <a
                                href={version.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Comments/Feedback Tab */}
                {activeTab === 'feedback' && (
                  <div className="p-6">
                    {adVersions.filter(v => v.type === 'feedback').length === 0 ? (
                      <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No comments yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {adVersions
                          .filter(v => v.type === 'feedback')
                          .map((item, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-semibold">
                              {item.feedbackBy?.[0] || 'M'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  {item.feedbackBy || 'Manager'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(() => {
                                    const now = new Date();
                                    const feedbackTime = new Date(item.timestamp);
                                    const diffMs = now - feedbackTime;
                                    const diffMins = Math.floor(diffMs / 60000);
                                    const diffHours = Math.floor(diffMins / 60);
                                    const diffDays = Math.floor(diffHours / 24);
                                    
                                    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
                                    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                                    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                                    return feedbackTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                  })()}
                                </p>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {item.feedback}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTasksModal;
