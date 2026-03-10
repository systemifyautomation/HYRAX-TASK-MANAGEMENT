import { X, ChevronLeft, ChevronRight, ChevronDown, Upload, XCircle, Eye, RefreshCw, MessageSquare, Check, History, ExternalLink, Plus, Trash2, Edit2, Save, Download } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { USER_ROLES, isManager } from '../constants/roles';
import { useLocation, useNavigate } from 'react-router-dom';

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
  users,
  currentPreviewIndex,
  setCurrentPreviewIndex,
  uploadingCreatives,
  setFeedbackModal,
  updateTask,
  deleteTask,
  handleCreativeUpload,
  handleCancelUpload,
  onClose,
  isFeedbackModalOpen,
  onAddTaskClick
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [adDetailsOpen, setAdDetailsOpen] = useState(null); // { taskId, adIndex, taskData }
  const [adVersions, setAdVersions] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionPreview, setSelectedVersionPreview] = useState(null);
  const [activeTab, setActiveTab] = useState('versions'); // 'versions' or 'feedback'
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set()); // Track which campaigns are expanded
  const lastModalUserRef = useRef(null); // Track last modal user to detect when modal reopens
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null); // { taskId, slotIndex, adNumber, actualTaskIndex, task }
  const [editingCampaign, setEditingCampaign] = useState(null); // { campaignName, copyLink, scriptAssigned }
  
  const slugify = (value) => {
    if (!value) return '';
    return value
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Helper function to determine base path from current location
  const getBasePath = useCallback(() => {
    const pathname = location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    
    // Check if we're in /next-week/cards/ context
    if (segments.length >= 2 && segments[0] === 'next-week' && segments[1] === 'cards') {
      return '/next-week/cards';
    }
    
    // Default to /cards
    return '/cards';
  }, [location.pathname]);

  const getCampaignSlug = (campaignId, fallbackName) => {
    const campaign = campaigns?.find(c => parseInt(c.id) === parseInt(campaignId));
    const source = campaign?.slug || campaign?.name || fallbackName || campaign?.id;
    return slugify(source);
  };

  // Fetch ad version history when sidebar opens
  useEffect(() => {
    const fetchAdVersions = async () => {
      if (!adDetailsOpen) {
        setAdVersions([]);
        return;
      }

      setLoadingVersions(true);
      try {
        const loginDate = localStorage.getItem('login_date') || getTodayUTC();
        const adminEmail = currentUser.email;
        const adminPassword = localStorage.getItem('admin_password') || '';
        const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

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

  const safeUser = userTasksModal?.user || {};
  const safeTasks = userTasksModal?.tasks || [];

  const isVideoEditor = safeUser.department === 'VIDEO EDITING';
  const isGraphicDesigner = safeUser.department === 'GRAPHIC DESIGN';

  // Collect all viewer links from all tasks with proper ad numbering
  const allLinks = [];
  
  // Group tasks by campaign to calculate proper ad offset
  const tasksByCampaign = safeTasks.reduce((groups, task) => {
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
              campaignName: campaign?.name || 'No Campaign',
              campaignId: task.campaignId,
              adNumber: adNumber,
              formatLabel: formatLabel,
              linkIndex: linkIndex,
              approval: task.viewerLinkApproval?.[linkIndex] || 'Not Done',
              feedback: task.viewerLinkFeedback?.[linkIndex] || '',
              status: task.status || 'not_started',
              mediaType: task.mediaType || task.type || (isVideoEditor ? 'VIDEO' : 'IMAGE')
            });
          }
        });
      }
    });
  });

  const currentAd = allLinks[currentPreviewIndex] || allLinks[0];

  const getRequestedTabFromPath = useCallback((pathname) => {
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    return ['preview', 'versions', 'comments', 'feedback'].includes(lastSegment) ? lastSegment : null;
  }, []);

  const navigateToPreviewPath = useCallback(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (!segments.length) return;
    const currentTab = getRequestedTabFromPath(location.pathname);
    if (currentTab && currentTab !== 'preview') {
      setFeedbackModal(null);
      const previewPath = `/${[...segments.slice(0, -1), 'preview'].join('/')}`;
      navigate(previewPath, { replace: true });
    }
  }, [location.pathname, navigate, getRequestedTabFromPath, setFeedbackModal]);

  useEffect(() => {
    if (!userTasksModal || !currentAd) return;

    const requestedTab = getRequestedTabFromPath(location.pathname);
    if (requestedTab === 'versions' || requestedTab === 'comments') {
      const targetTask = userTasksModal.tasks.find(task => task.id === currentAd.taskId);
      if (targetTask) {
        if (!adDetailsOpen || adDetailsOpen.taskId !== currentAd.taskId || adDetailsOpen.adIndex !== currentAd.linkIndex) {
          setAdDetailsOpen({
            taskId: targetTask.id,
            adIndex: currentAd.linkIndex,
            taskData: targetTask,
            adNumber: currentAd.adNumber
          });
        }
        setActiveTab(requestedTab === 'versions' ? 'versions' : 'feedback');
      }
    } else if (requestedTab === 'preview' || requestedTab === 'feedback') {
      // Close ad details sidebar when navigating back to preview or feedback
      if (adDetailsOpen) {
        setAdDetailsOpen(null);
        setSelectedVersionPreview(null);
        setFeedbackModal(null);
      }
    }
  }, [userTasksModal, currentAd, location.pathname, getRequestedTabFromPath]);

  useEffect(() => {
    if (!userTasksModal) return;
    const userSlug = slugify(userTasksModal.user?.slug || userTasksModal.user?.name || userTasksModal.user?.email || userTasksModal.user?.id);
    const basePath = getBasePath();
    const requestedTab = getRequestedTabFromPath(location.pathname);

    if (!currentAd) {
      const fallbackPath = userSlug ? `${basePath}/${userSlug}` : basePath;
      if (location.pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
      return;
    }

    const campaignSlug = getCampaignSlug(currentAd.campaignId, currentAd.campaignName) || 'no-campaign';
    let tabSegment = requestedTab || 'preview';

    // Override tab segment based on modal state
    if (isFeedbackModalOpen) {
      tabSegment = 'feedback';
    } else if (requestedTab === 'feedback' && !isFeedbackModalOpen) {
      // If we were on feedback but modal closed, fall back
      tabSegment = adDetailsOpen ? (activeTab === 'versions' ? 'versions' : 'comments') : 'preview';
    } else if (adDetailsOpen && !requestedTab) {
      // If details panel is open but no explicit tab in URL
      tabSegment = activeTab === 'versions' ? 'versions' : 'comments';
    }

    const path = `${basePath}/${userSlug}/${campaignSlug}/ad_${currentAd.adNumber}/${tabSegment}`;

    if (location.pathname !== path) {
      navigate(path, { replace: true });
    }
  }, [userTasksModal, currentPreviewIndex, activeTab, currentAd, location.pathname, navigate, campaigns, adDetailsOpen, isFeedbackModalOpen, getRequestedTabFromPath, getBasePath]);

  // Initialize first campaign as expanded when modal opens or user changes
  useEffect(() => {
    if (userTasksModal) {
      const currentUserId = userTasksModal.user?.id;
      
      // Only initialize if this is a new modal instance (different user)
      if (lastModalUserRef.current !== currentUserId) {
        lastModalUserRef.current = currentUserId;
        
        const campaignGroups = userTasksModal.tasks.reduce((groups, task) => {
          const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
          const campaignName = campaign?.name || 'No Campaign';
          if (!groups[campaignName]) {
            groups[campaignName] = [];
          }
          groups[campaignName].push(task);
          return groups;
        }, {});
        
        const firstCampaignName = Object.keys(campaignGroups)[0];
        if (firstCampaignName) {
          setExpandedCampaigns(new Set([firstCampaignName]));
        }
      }
    } else {
      // Reset when modal closes
      lastModalUserRef.current = null;
    }
  }, [userTasksModal, campaigns]);

  const getPreviewUrl = (url) => {
    if (!url) return url;

    // Cloudflare R2 storage: Direct URLs work as-is
    if (url.includes('storage.wearehyrax.com')) {
      return url;
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

  const handleConfirmDeleteCreative = async () => {
    if (!deleteConfirmModal) return;

    const { taskId, slotIndex, adNumber, actualTaskIndex, task, isVideoEditor } = deleteConfirmModal;
    
    // Get the creative URLs before deleting (for webhook notification)
    const deletedCreativeUrl = task.viewerLink?.[slotIndex] || '';
    const deletedSlackPermalink = task.slackPermalink?.[slotIndex] || '';
    
    // For video editors, also get the paired format (Reel)
    const deletedCreativeUrl2 = isVideoEditor ? (task.viewerLink?.[slotIndex + 1] || '') : '';
    const deletedSlackPermalink2 = isVideoEditor ? (task.slackPermalink?.[slotIndex + 1] || '') : '';
    
    // Remove the creative from all arrays at the specific index
    const updatedViewerLink = [...task.viewerLink];
    const updatedViewerLinkApproval = [...task.viewerLinkApproval];
    const updatedViewerLinkFeedback = [...task.viewerLinkFeedback];
    const updatedSlackPermalink = [...task.slackPermalink];
    const updatedViewerLinkApprovalAt = Array.isArray(task.viewerLinkApprovalAt) ? [...task.viewerLinkApprovalAt] : [];
    const updatedViewerLinkAt = Array.isArray(task.viewerLinkAt) ? [...task.viewerLinkAt] : [];

    // For video editors, delete both slots (Facebook format + Reel)
    if (isVideoEditor) {
      // Delete both slots starting from slotIndex (Facebook format and Reel)
      updatedViewerLink.splice(slotIndex, 2);
      updatedViewerLinkApproval.splice(slotIndex, 2);
      updatedViewerLinkFeedback.splice(slotIndex, 2);
      updatedSlackPermalink.splice(slotIndex, 2);
      updatedViewerLinkApprovalAt.splice(slotIndex, 2);
      updatedViewerLinkAt.splice(slotIndex, 2);
    } else {
      // For non-video editors, delete single slot
      updatedViewerLink.splice(slotIndex, 1);
      updatedViewerLinkApproval.splice(slotIndex, 1);
      updatedViewerLinkFeedback.splice(slotIndex, 1);
      updatedSlackPermalink.splice(slotIndex, 1);
      updatedViewerLinkApprovalAt.splice(slotIndex, 1);
      updatedViewerLinkAt.splice(slotIndex, 1);
    }

    // Update local modal state
    const updatedTasks = [...userTasksModal.tasks];
    updatedTasks[actualTaskIndex] = {
      ...task,
      viewerLink: updatedViewerLink,
      viewerLinkApproval: updatedViewerLinkApproval,
      viewerLinkFeedback: updatedViewerLinkFeedback,
      slackPermalink: updatedSlackPermalink,
      viewerLinkApprovalAt: updatedViewerLinkApprovalAt,
      viewerLinkAt: updatedViewerLinkAt,
    };
    setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });

    // Update the task in the database
    updateTask(task.id, {
      viewerLink: updatedViewerLink,
      viewerLinkApproval: updatedViewerLinkApproval,
      viewerLinkFeedback: updatedViewerLinkFeedback,
      slackPermalink: updatedSlackPermalink,
      viewerLinkApprovalAt: updatedViewerLinkApprovalAt,
      viewerLinkAt: updatedViewerLinkAt,
    });

    // Send deletion notification to webhook
    if (deletedCreativeUrl) {
      try {
        const loginDate = localStorage.getItem('login_date') || getTodayUTC();
        const adminEmail = currentUser.email;
        const adminPassword = localStorage.getItem('admin_password') || '';
        const code = await hashThreeInputs(adminEmail, adminPassword, loginDate);

        const webhookUrl = import.meta.env.VITE_CREATIVE_DELETED_WEBHOOK_URL;
        if (webhookUrl) {
          // Send notification for first creative (Facebook format)
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code: code,
              deleted_by: adminEmail,
              creative_url: deletedCreativeUrl,
              slack_permalink: deletedSlackPermalink,
              task_id: taskId,
              ad_number: adNumber,
              format: isVideoEditor ? 'Facebook Format' : null,
              deleted_at: new Date().toISOString()
            })
          });
          
          // For video editors, also send notification for second creative (Reel)
          if (isVideoEditor && deletedCreativeUrl2) {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                code: code,
                deleted_by: adminEmail,
                creative_url: deletedCreativeUrl2,
                slack_permalink: deletedSlackPermalink2,
                task_id: taskId,
                ad_number: adNumber,
                format: 'Reel',
                deleted_at: new Date().toISOString()
              })
            });
          }
        }
      } catch (error) {
        console.error('Failed to send creative deletion notification:', error);
        // Don't block the deletion if webhook fails
      }
    }

    // Close modal
    setDeleteConfirmModal(null);
  };

  const isVideoUrl = (url = '') => {
    const lower = url.toLowerCase();
    return lower.includes('youtube.com') ||
      lower.includes('youtu.be') ||
      lower.endsWith('.mp4') ||
      lower.endsWith('.webm') ||
      lower.endsWith('.mov') ||
      lower.includes('video');
  };

  const isImageUrl = (url = '') => {
    const lower = url.toLowerCase();
    
    // Cloudflare R2 storage images
    if (lower.includes('storage.wearehyrax.com')) {
      // If it's not a video, treat it as image
      return !isVideoUrl(url);
    }
    
    // Check for image file extensions
    return lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.gif') ||
      lower.endsWith('.webp') ||
      lower.endsWith('.avif') ||
      lower.endsWith('.svg') ||
      lower.endsWith('.bmp');
  };

  if (!userTasksModal) return null;

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
                      {/* Creative Approval Status */}
                      <span 
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          currentAd?.approval === 'Approved' || currentAd?.approval === 'Uploaded'
                            ? 'bg-green-100 text-green-700'
                            : currentAd?.approval === 'Left Feedback'
                            ? 'bg-orange-100 text-orange-700'
                            : currentAd?.approval === 'Needs Review'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {(currentAd?.approval === 'Approved' || currentAd?.approval === 'Uploaded')
                          ? 'Uploaded to Facebook'
                          : (currentAd?.approval || 'Not Done')}
                      </span>
                      <span className="text-gray-400">
                        {currentPreviewIndex + 1} / {allLinks.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {!selectedVersionPreview && currentAd?.feedback && currentAd?.approval !== 'Approved' && currentAd?.approval !== 'Uploaded' && (
                <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">Manager Feedback:</p>
                  <p className="text-sm text-yellow-200 whitespace-pre-wrap">{currentAd.feedback}</p>
                </div>
              )}
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
              {(() => {
                const sourceUrl = selectedVersionPreview?.url || currentAd?.url;
                const previewUrl = getPreviewUrl(sourceUrl);
                const mediaType = (currentAd?.mediaType || '').toString().toUpperCase();

                // For VIDEO media type or video editors' content, check if it's a direct video or YouTube
                if (mediaType === 'VIDEO' || isVideoEditor) {
                  // YouTube videos should be embedded in iframe
                  if (previewUrl.includes('youtube.com/embed/')) {
                    return (
                      <iframe
                        src={previewUrl}
                        className="w-full h-full"
                        title={selectedVersionPreview ? 'Version Preview' : `Ad ${currentAd?.adNumber} Preview`}
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  
                  // Direct video files (R2 storage, mp4, etc.)
                  return (
                    <video
                      src={previewUrl}
                      className="w-full h-full object-contain"
                      controls
                      playsInline
                      key={previewUrl}
                    />
                  );
                }

                // For IMAGE media type or graphic designers' content
                if (mediaType === 'IMAGE' || isGraphicDesigner) {
                  return (
                    <img
                      src={previewUrl}
                      alt={selectedVersionPreview ? 'Version Preview' : `Ad ${currentAd?.adNumber} Preview`}
                      className="w-full h-full object-contain"
                    />
                  );
                }

                // Fallback: try to detect from URL patterns
                if (isImageUrl(previewUrl)) {
                  return (
                    <img
                      src={previewUrl}
                      alt={selectedVersionPreview ? 'Version Preview' : `Ad ${currentAd?.adNumber} Preview`}
                      className="w-full h-full object-contain"
                    />
                  );
                }

                if (isVideoUrl(previewUrl) && !previewUrl.includes('youtube.com/embed/')) {
                  return (
                    <video
                      src={previewUrl}
                      className="w-full h-full object-contain"
                      controls
                      playsInline
                      key={previewUrl}
                    />
                  );
                }

                return (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title={selectedVersionPreview ? 'Version Preview' : `Ad ${currentAd?.adNumber} Preview`}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                );
              })()}
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
            <button onClick={(e) => {
              e.stopPropagation();
              setFeedbackModal(null);
              if (onClose) {
                onClose();
              } else {
                setUserTasksModal(null);
              }
            }} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
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
            ).map(([campaignName, campaignTasks]) => {
              const isExpanded = expandedCampaigns.has(campaignName);
              
              return (
                <div key={campaignName} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  {/* Collapsible Campaign Header */}
                  <div 
                    className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-gray-200 ${
                      isExpanded 
                        ? 'bg-green-50 hover:bg-green-100' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setExpandedCampaigns(prev => {
                        const newSet = new Set(prev);
                        if (isExpanded) {
                          newSet.delete(campaignName);
                        } else {
                          newSet.add(campaignName);
                        }
                        return newSet;
                      });
                    }}
                  >
                    <h2 className="text-lg font-bold text-gray-800">
                      {campaignName}
                    </h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const taskIds = campaignTasks.map(t => t.id);
                          if (window.confirm(`Are you sure you want to delete all ${campaignTasks.length} task(s) for ${campaignName}?`)) {
                            taskIds.forEach(id => deleteTask(id));
                          }
                        }}
                        className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transition-all hover:scale-110"
                        title="Delete all tasks for this campaign"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-green-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Collapsible Campaign Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Campaign Info Section */}
                      {(() => {
                        const firstTask = campaignTasks[0];
                        const scriptUser = users?.find(u => u.id === parseInt(firstTask.scriptAssigned));
                        const isEditing = editingCampaign?.campaignName === campaignName;
                        const canEdit = isManager(currentUser?.role);
                        
                        const handleStartEdit = () => {
                          setEditingCampaign({
                            campaignName: campaignName,
                            copyLink: firstTask.copyLink || '',
                            scriptAssigned: firstTask.scriptAssigned || ''
                          });
                        };
                        
                        const handleCancelEdit = () => {
                          setEditingCampaign(null);
                        };
                        
                        const handleSaveEdit = async () => {
                          if (!editingCampaign) return;
                          
                          // Update all tasks in this campaign
                          const updates = {
                            copyLink: editingCampaign.copyLink,
                            scriptAssigned: editingCampaign.scriptAssigned ? parseInt(editingCampaign.scriptAssigned) : null
                          };
                          
                          // If copyLink is provided, set copyWritten to true, otherwise set to false
                          if (editingCampaign.copyLink && editingCampaign.copyLink.trim()) {
                            updates.copyWritten = true;
                          } else {
                            updates.copyWritten = false;
                          }
                          
                          // Save all tasks in the campaign
                          for (const task of campaignTasks) {
                            await updateTask(task.id, updates);
                          }
                          
                          setEditingCampaign(null);
                        };
                        
                        return (
                          <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Copy Details
                              </h3>
                              
                              {canEdit && !isEditing && (
                                <button
                                  onClick={handleStartEdit}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                              )}
                              
                              {isEditing && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-all duration-200 shadow-sm"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            {/* Single Row with both fields */}
                            <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                              <div className="grid grid-cols-2 gap-4">
                                {/* Copy Link */}
                                <div>
                                  <label className="text-xs font-semibold text-blue-800 mb-1.5 block flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    Copy Link
                                  </label>
                                  {isEditing ? (
                                    <input
                                      type="url"
                                      value={editingCampaign.copyLink}
                                      onChange={(e) => setEditingCampaign({ ...editingCampaign, copyLink: e.target.value })}
                                      placeholder="Enter copy link..."
                                      className="w-full px-2.5 py-1.5 text-xs text-gray-900 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  ) : (
                                    <div className="min-h-[28px] flex items-center">
                                      {firstTask.copyLink ? (
                                        <a 
                                          href={firstTask.copyLink} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 underline truncate"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {firstTask.copyLink}
                                        </a>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">Not provided</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Script Assigned */}
                                <div>
                                  <label className="text-xs font-semibold text-blue-800 mb-1.5 block flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Script Assigned
                                  </label>
                                  {isEditing ? (
                                    <select
                                      value={editingCampaign.scriptAssigned}
                                      onChange={(e) => setEditingCampaign({ ...editingCampaign, scriptAssigned: e.target.value })}
                                      className="w-full px-2.5 py-1.5 text-xs border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                                    >
                                      <option value="">-- Select User --</option>
                                      {users?.filter(user => user.department === 'MEDIA BUYING').map(user => (
                                        <option key={user.id} value={user.id}>
                                          {user.name}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="min-h-[28px] flex items-center">
                                      {scriptUser ? (
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                            {scriptUser.name.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="text-xs font-medium text-gray-900 truncate">{scriptUser.name}</span>
                                        </div>
                                      ) : firstTask.scriptAssigned ? (
                                        <span className="text-xs text-gray-500">User ID: {firstTask.scriptAssigned}</span>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">Not assigned</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Tasks and Ad Creatives */}
                      {campaignTasks.map((task, taskIndex) => {
                  const actualTaskIndex = userTasksModal.tasks.findIndex(t => t.id === task.id);
                  const campaignForTask = campaigns.find(c => c.id === parseInt(task.campaignId));
                  const adOffset = campaignTasks.slice(0, taskIndex).reduce((sum, prevTask) => {
                    const qty = parseInt(prevTask.quantity?.replace('x', '') || '1');
                    return sum + qty;
                  }, 0);

                  const quantity = parseInt(task.quantity?.replace('x', '') || '1');
                  const totalSlots = isVideoEditor ? quantity * 2 : quantity;
                  
                  // Calculate actual slots to render (including additional creatives beyond original quantity)
                  const viewerLinkCount = task.viewerLink ? task.viewerLink.length : 0;
                  const actualSlotsCount = Math.max(totalSlots, viewerLinkCount);

                  return (
                    <div key={task.id} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="space-y-3">
                        {Array.from({ length: actualSlotsCount }).map((_, i) => {
                          const slotIndex = i;
                          const adNumber = adOffset + Math.floor(i / (isVideoEditor ? 2 : 1)) + 1;
                          const formatIndex = isVideoEditor ? i % 2 : 0;
                          const formatLabel = isVideoEditor ? (formatIndex === 0 ? 'Facebook Format' : 'Reel') : null;
                          
                          const hasUpload = task.viewerLink && task.viewerLink[slotIndex];
                          const isUploadedToFacebook = task.viewerLinkApproval?.[slotIndex] === 'Approved' || task.viewerLinkApproval?.[slotIndex] === 'Uploaded';

                          return (
                            <div key={i}>
                            <div 
                              className={`rounded-xl p-6 bg-white transition-all shadow-sm hover:shadow-md border border-gray-100 ${
                                isUploadedToFacebook
                                  ? 'bg-green-50/20'
                                  : task.viewerLinkApproval?.[slotIndex] === 'Left Feedback'
                                  ? 'bg-orange-50/20'
                                  : task.viewerLinkApproval?.[slotIndex] === 'Needs Review'
                                  ? 'bg-yellow-50/20'
                                  : ''
                              } ${
                                hasUpload && !isUploadedToFacebook ? 'cursor-pointer' : ''
                              }`}
                              onClick={() => {
                                if (hasUpload && !isUploadedToFacebook) {
                                  const previewIndex = allLinks.findIndex(
                                    item => item.taskId === task.id && item.linkIndex === slotIndex
                                  );
                                  if (previewIndex !== -1) {
                                    setCurrentPreviewIndex(previewIndex);
                                  }
                                }
                              }}
                            >
                              <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg font-semibold text-gray-900">
                                    Ad {adNumber}
                                  </span>
                                  {formatLabel && (
                                    <span className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-full font-medium">
                                      {formatLabel}
                                    </span>
                                  )}
                                </div>
                                {/* Delete Button - Only show for non-Reel slots (for video editors, only show on Facebook format) */}
                                {(!isVideoEditor || formatIndex === 0) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmModal({
                                        taskId: task.id,
                                        slotIndex: slotIndex,
                                        adNumber: adNumber,
                                        actualTaskIndex: actualTaskIndex,
                                        task: task,
                                        isVideoEditor: isVideoEditor
                                      });
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title={isVideoEditor ? "Delete Both Formats" : "Delete Creative"}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
                              ) : isUploadedToFacebook ? (
                                <div className="flex items-center justify-center py-8 border border-green-200 rounded-lg bg-green-50">
                                  <p className="text-base font-semibold text-green-700">Uploaded to Facebook</p>
                                </div>
                              ) : hasUpload ? (
                                <div className="space-y-5">
                                  {/* Link Display with Download Button */}
                                  <div className="flex items-center gap-2.5 p-3.5 bg-gray-50/80 rounded-lg border border-gray-100">  
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
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const webhookUrl = import.meta.env.VITE_DOWNLOAD_CREATIVE_WEBHOOK_URL;
                                          if (!webhookUrl) {
                                            alert('Download webhook URL not configured');
                                            return;
                                          }
                                          
                                          // Trigger download via webhook
                                          const response = await fetch(webhookUrl, {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                              creative_url: task.viewerLink[slotIndex],
                                              task_id: task.id,
                                              ad_number: adNumber,
                                              format: formatLabel
                                            })
                                          });
                                          
                                          if (response.ok) {
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            
                                            // Determine file extension
                                            let extension = '.mp4';
                                            const contentType = response.headers.get('content-type');
                                            if (contentType) {
                                              if (contentType.includes('video/mp4')) extension = '.mp4';
                                              else if (contentType.includes('image/jpeg')) extension = '.jpg';
                                              else if (contentType.includes('image/png')) extension = '.png';
                                            }
                                            
                                            a.download = `ad_${adNumber}${formatLabel ? '_' + formatLabel.replace(' ', '_') : ''}${extension}`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);
                                          } else {
                                            alert('Failed to download creative');
                                          }
                                        } catch (error) {
                                          console.error('Download error:', error);
                                          alert('Error downloading creative');
                                        }
                                      }}
                                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                                      title="Download Creative"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
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
                                            campaignForTask,
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

                                    {/* Feedback Button - Admins/Managers Only */}
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
                                            readOnly: false,
                                            adNumber: adNumber,
                                            campaignId: task.campaignId,
                                            campaignName: campaignForTask?.name || 'No Campaign',
                                            userId: userTasksModal.user.id
                                          });
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-all"
                                        title="Leave Feedback"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                        Leave Feedback
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
                                        
                                        // Only send approval status - webhook will generate timestamp
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
                                        
                                        // Navigate to versions URL, let effect handle opening sidebar
                                        const userSlug = slugify(userTasksModal.user?.slug || userTasksModal.user?.name || userTasksModal.user?.email || userTasksModal.user?.id);
                                        const campaign = campaigns.find(c => c.id === parseInt(task.campaignId));
                                        const campaignSlug = getCampaignSlug(task.campaignId, campaign?.name);
                                        const basePath = getBasePath();
                                        navigate(`${basePath}/${userSlug}/${campaignSlug}/ad_${adNumber}/versions`, { replace: true });
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
                                            handleCreativeUpload(
                                              task.id, 
                                              slotIndex, 
                                              file, 
                                              task, 
                                              userTasksModal.user, 
                                              campaignForTask
                                            );
                                          }
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              )}
                            </div>
                            {/* Separator for video editors: show after every 2 slots (after each ad pair) */}
                            {isVideoEditor && formatIndex === 1 && i < actualSlotsCount - 1 && (
                              <div className="my-4 border-t-2 border-gray-200"></div>
                            )}
                          </div>
                          );
                        })}
                        
                        {/* Add New Creative Button */}
                        <button
                          onClick={() => {
                            // Add empty slot(s) to the arrays immediately
                            const currentLength = task.viewerLink ? task.viewerLink.length : 0;
                            const nextSlotIndex = Math.max(currentLength, totalSlots);
                            
                            // For video editors, add 2 slots (Facebook Format and Reel)
                            const slotsToAdd = isVideoEditor ? 2 : 1;
                            
                            const updatedViewerLinks = Array.isArray(task.viewerLink) ? [...task.viewerLink] : [];
                            const updatedApprovals = Array.isArray(task.viewerLinkApproval) ? [...task.viewerLinkApproval] : [];
                            const updatedFeedback = Array.isArray(task.viewerLinkFeedback) ? [...task.viewerLinkFeedback] : [];
                            const updatedSlackPermalinks = Array.isArray(task.slackPermalink) ? [...task.slackPermalink] : [];
                            const updatedApprovalAt = Array.isArray(task.viewerLinkApprovalAt) ? [...task.viewerLinkApprovalAt] : [];
                            const updatedLinkAt = Array.isArray(task.viewerLinkAt) ? [...task.viewerLinkAt] : [];
                            
                            // Ensure arrays are long enough
                            while (updatedViewerLinks.length < nextSlotIndex + slotsToAdd) {
                              updatedViewerLinks.push('');
                            }
                            while (updatedApprovals.length < nextSlotIndex + slotsToAdd) {
                              updatedApprovals.push('Not Done');
                            }
                            while (updatedFeedback.length < nextSlotIndex + slotsToAdd) {
                              updatedFeedback.push('');
                            }
                            while (updatedSlackPermalinks.length < nextSlotIndex + slotsToAdd) {
                              updatedSlackPermalinks.push('');
                            }
                            while (updatedApprovalAt.length < nextSlotIndex + slotsToAdd) {
                              updatedApprovalAt.push(null);
                            }
                            while (updatedLinkAt.length < nextSlotIndex + slotsToAdd) {
                              updatedLinkAt.push(null);
                            }
                            
                            // Update task in both local state and backend
                            updateTask(task.id, {
                              viewerLink: updatedViewerLinks,
                              viewerLinkApproval: updatedApprovals,
                              viewerLinkFeedback: updatedFeedback,
                              slackPermalink: updatedSlackPermalinks,
                              viewerLinkApprovalAt: updatedApprovalAt,
                              viewerLinkAt: updatedLinkAt
                            });
                            
                            // Update modal state immediately
                            const updatedTasks = userTasksModal.tasks.map(t => 
                              t.id === task.id ? {
                                ...t,
                                viewerLink: updatedViewerLinks,
                                viewerLinkApproval: updatedApprovals,
                                viewerLinkFeedback: updatedFeedback,
                                slackPermalink: updatedSlackPermalinks,
                                viewerLinkApprovalAt: updatedApprovalAt,
                                viewerLinkAt: updatedLinkAt
                              } : t
                            );
                            setUserTasksModal({ ...userTasksModal, tasks: updatedTasks });
                          }}
                          className="w-full rounded-xl p-4 bg-white border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
                        >
                          <div className="flex flex-col items-center justify-center py-4">
                            <Plus className="w-8 h-8 text-blue-500 mb-2" />
                            <span className="text-sm font-medium text-blue-600">New Creative</span>
                            <span className="text-xs text-gray-500 mt-1">
                              {isVideoEditor ? 'Add new variation (2 slots: Facebook + Reel)' : 'Add new variation'}
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>
                  );
                })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Task Button */}
          <div className="mt-4 px-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddTaskClick && onAddTaskClick();
              }}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      </div>
      
      {/* Ad Details Sidebar */}
      {adDetailsOpen && (
        <>
          {/* Backdrop overlay to indicate sub-view */}
          <div 
            className="fixed inset-0 bg-black/20 z-[55] pointer-events-none"
          />
          <div className="fixed inset-y-0 right-0 w-[35%] bg-white shadow-2xl z-[60] flex flex-col border-l-2 border-red-500" onClick={(e) => e.stopPropagation()}>
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
                onClick={(e) => {
                  e.stopPropagation();
                  const segments = location.pathname.split('/').filter(Boolean);
                  if (segments.length > 0) {
                    const previewPath = `/${[...segments.slice(0, -1), 'preview'].join('/')}`;
                    navigate(previewPath, { replace: true });
                  }
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Navigate directly to comments URL, let effect handle tab state
                  const segments = location.pathname.split('/').filter(Boolean);
                  if (segments.length > 0) {
                    const commentsPath = `/${[...segments.slice(0, -1), 'comments'].join('/')}`;
                    navigate(commentsPath, { replace: true });
                  }
                }}
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
                onClick={() => {
                  // Navigate directly to versions URL, let effect handle tab state
                  const segments = location.pathname.split('/').filter(Boolean);
                  if (segments.length > 0) {
                    const versionsPath = `/${[...segments.slice(0, -1), 'versions'].join('/')}`;
                    navigate(versionsPath, { replace: true });
                  }
                }}
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
                  <div className="p-4">
                    {adVersions.filter(v => v.type === 'creative').length === 0 ? (
                      <div className="text-center py-16">
                        <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No versions available</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {adVersions
                          .filter(v => v.type === 'creative')
                          .map((version, idx) => {
                            const versionNumber = adVersions.filter(v => v.type === 'creative').length - idx;
                            const isSelected = selectedVersionPreview?.url === version.url;
                            const date = new Date(version.timestamp);
                            
                            return (
                              <div
                                key={idx}
                                className={`group relative rounded-lg border p-3 cursor-pointer transition-all ${
                                  version.isCurrent
                                    ? 'border-red-300 bg-red-50/50 hover:bg-red-50'
                                    : isSelected
                                    ? 'border-blue-400 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                }`}
                                onClick={() => setSelectedVersionPreview(version)}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold text-sm ${
                                      version.isCurrent
                                        ? 'bg-red-500 text-white'
                                        : isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                    }`}>
                                      v{versionNumber}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className={`text-sm font-medium ${
                                          version.isCurrent ? 'text-red-700' : isSelected ? 'text-blue-700' : 'text-gray-900'
                                        }`}>
                                          {version.isCurrent ? 'Current Version' : `Version ${versionNumber}`}
                                        </p>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        {' • '}
                                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  <a
                                    href={version.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                                    title="Open in new tab"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Comments/Feedback Tab */}
                {activeTab === 'feedback' && (
                  <div className="p-4">
                    {adVersions.filter(v => v.type === 'feedback').length === 0 ? (
                      <div className="text-center py-16">
                        <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No comments yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {adVersions
                          .filter(v => v.type === 'feedback')
                          .map((item, idx) => {
                            const date = new Date(item.timestamp);
                            const now = new Date();
                            const diffMs = now - date;
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMins / 60);
                            const diffDays = Math.floor(diffHours / 24);
                            
                            let timeAgo;
                            if (diffMins < 1) timeAgo = 'Just now';
                            else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
                            else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
                            else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
                            else timeAgo = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            
                            return (
                              <div key={idx} className="flex gap-3 p-3 rounded-lg bg-orange-50/50 border border-orange-100">
                                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm">
                                  {item.feedbackBy?.[0]?.toUpperCase() || 'M'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {item.feedbackBy || 'Manager'}
                                    </p>
                                    <span className="text-xs text-gray-400">•</span>
                                    <p className="text-xs text-gray-500">{timeAgo}</p>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {item.feedback}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setDeleteConfirmModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Creative</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Are you sure you want to delete Ad {deleteConfirmModal.adNumber}{deleteConfirmModal.isVideoEditor ? ' (both Facebook Format and Reel)' : ''}? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteConfirmModal(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteCreative}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTasksModal;
