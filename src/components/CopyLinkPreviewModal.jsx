import { X, Check, MessageSquare } from 'lucide-react';

const CopyLinkPreviewModal = ({ 
  copyLinkModal, 
  setCopyLinkModal, 
  canGiveFeedback, 
  onApprove, 
  onFeedback 
}) => {
  if (!copyLinkModal) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full h-[90vh] flex flex-col" style={{ boxShadow: '0 0 40px rgba(59, 130, 246, 0.4)' }}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">Copy Link Preview</h3>
          <button onClick={() => setCopyLinkModal(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Preview Area */}
          <div className="flex-1 p-6 overflow-hidden">
            <iframe
              src={copyLinkModal.url}
              className="w-full h-full border border-gray-300 rounded-lg"
              title="Copy Link Preview"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>

          {/* Right Sidebar - Feedback Section */}
          <div className="w-96 border-l border-gray-200 bg-gray-50 p-6 flex flex-col">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Feedback & Approval</h4>
            
            <div className="flex-1 space-y-4 overflow-y-auto">
              {copyLinkModal.showFeedbackInput && canGiveFeedback && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                  <textarea
                    value={copyLinkModal.currentFeedback}
                    onChange={(e) => setCopyLinkModal({ ...copyLinkModal, currentFeedback: e.target.value })}
                    placeholder="Enter feedback details here..."
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    autoFocus
                  />
                </div>
              )}
              
              {!canGiveFeedback && copyLinkModal.currentFeedback && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Feedback (Read-only)</label>
                  <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 whitespace-pre-wrap">
                    {copyLinkModal.currentFeedback}
                  </div>
                </div>
              )}
            </div>

            {canGiveFeedback && (
              <div className="mt-4 space-y-3">
                <button
                  onClick={onApprove}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-green-600/30 flex items-center justify-center space-x-2"
                >
                  <Check className="w-5 h-5" />
                  <span>Approve</span>
                </button>
                {!copyLinkModal.showFeedbackInput ? (
                  <button
                    onClick={() => setCopyLinkModal({ ...copyLinkModal, showFeedbackInput: true })}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Leave Feedback</span>
                  </button>
                ) : (
                  <button
                    onClick={onFeedback}
                    disabled={!copyLinkModal.currentFeedback.trim()}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>Submit Feedback</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyLinkPreviewModal;
