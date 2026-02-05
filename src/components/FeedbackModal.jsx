import { X } from 'lucide-react';

const FeedbackModal = ({ feedbackModal, setFeedbackModal, onSaveFeedback }) => {
  if (!feedbackModal) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-900/95 backdrop-blur-md border border-red-600 rounded-xl shadow-2xl max-w-2xl w-full p-6" style={{ boxShadow: '0 0 40px rgba(220, 38, 38, 0.4), 0 0 80px rgba(220, 38, 38, 0.2)' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-red-600">
            {feedbackModal.type === 'copyApproval' 
              ? 'Copy Approval Feedback' 
              : feedbackModal.type === 'adApproval'
              ? 'Ad Approval Feedback'
              : `${feedbackModal.columnKey} Feedback`}
          </h3>
          <button onClick={() => setFeedbackModal(null)} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Feedback Details</label>
            <textarea
              value={feedbackModal.currentFeedback}
              onChange={(e) => setFeedbackModal({ ...feedbackModal, currentFeedback: e.target.value })}
              readOnly={feedbackModal.readOnly}
              placeholder="Enter feedback details here..."
              rows={8}
              className="w-full px-4 py-3 bg-gray-900 border border-red-600/50 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-600 focus:border-red-600 resize-none"
            />
          </div>

          <div className="flex space-x-3">
            {!feedbackModal.readOnly ? (
              <>
                <button
                  onClick={() => onSaveFeedback(feedbackModal.currentFeedback)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg shadow-red-600/50"
                >
                  Save Feedback
                </button>
                <button
                  onClick={() => setFeedbackModal(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setFeedbackModal(null)}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
