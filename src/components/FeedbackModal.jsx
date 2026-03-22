import { X } from 'lucide-react';

const FeedbackModal = ({ feedbackModal, setFeedbackModal, onSaveFeedback }) => {
  if (!feedbackModal) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/20 z-[55] pointer-events-none" />
      
      {/* Right sidebar */}
      <div className="fixed inset-y-0 right-0 w-[35%] bg-white dark:bg-gray-800 shadow-2xl z-[60] flex flex-col border-l-2 border-red-500">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {feedbackModal.type === 'copyApproval' 
                ? 'Copy Approval Feedback' 
                : feedbackModal.type === 'adApproval'
                ? 'Ad Approval Feedback'
                : `${feedbackModal.columnKey} Feedback`}
            </h3>
            <button onClick={() => setFeedbackModal(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Feedback Details</label>
              <textarea
                value={feedbackModal.currentFeedback}
                onChange={(e) => setFeedbackModal({ ...feedbackModal, currentFeedback: e.target.value })}
                readOnly={feedbackModal.readOnly}
                placeholder="Enter feedback details here..."
                rows={12}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-600 focus:border-red-600 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex space-x-3">
            {!feedbackModal.readOnly ? (
              <>
                <button
                  onClick={() => onSaveFeedback(feedbackModal.currentFeedback)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg"
                >
                  Save Feedback
                </button>
                <button
                  onClick={() => setFeedbackModal(null)}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setFeedbackModal(null)}
                className="w-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default FeedbackModal;
