import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, RotateCcw } from 'lucide-react';

const NewCampaignChatModal = ({ isOpen, onClose, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(null);
  const [hasRestoredConversation, setHasRestoredConversation] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const STORAGE_KEY = `campaign_chat_${currentUser?.id}`;

  // Save conversation state to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0 && timestamp) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages,
        timestamp,
        lastUpdated: new Date().toISOString()
      }));
    }
  }, [messages, timestamp]);

  // Initialize or restore conversation when modal opens
  useEffect(() => {
    if (isOpen && !hasRestoredConversation) {
      // Try to restore previous conversation
      const savedConversation = localStorage.getItem(STORAGE_KEY);
      
      if (savedConversation) {
        try {
          const { messages: savedMessages, timestamp: savedTimestamp } = JSON.parse(savedConversation);
          setMessages(savedMessages);
          setTimestamp(savedTimestamp);
          setHasRestoredConversation(true);
        } catch (error) {
          console.error('Error restoring conversation:', error);
          // Start new conversation if restore fails
          startNewConversation();
        }
      } else {
        // No saved conversation, start new one
        startNewConversation();
      }
    }
  }, [isOpen]);

  const startNewConversation = () => {
    const newTimestamp = new Date().toISOString();
    setTimestamp(newTimestamp);
    setHasRestoredConversation(true);
    sendInitialTrigger(newTimestamp);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendInitialTrigger = async (conversationTimestamp) => {
    setIsLoading(true);
    
    const initialMessage = {
      role: 'user',
      content: '/newcampaign',
      timestamp: new Date().toISOString()
    };
    
    setMessages([initialMessage]);

    try {
      const response = await fetch('https://workflows.wearehyrax.com/webhook/new-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '/newcampaign',
          timestamp: conversationTimestamp,
          user_id: currentUser?.id,
          user_name: currentUser?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start campaign creation');
      }

      const data = await response.text();
      
      // Add bot response to messages
      const botMessage = {
        role: 'bot',
        content: data || 'Hello! Let\'s create a new campaign. What would you like to name it?',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error starting campaign creation:', error);
      const errorMessage = {
        role: 'bot',
        content: 'Sorry, there was an error starting the campaign creation. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('https://workflows.wearehyrax.com/webhook/new-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue.trim(),
          timestamp: timestamp,
          user_id: currentUser?.id,
          user_name: currentUser?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.text();
      
      // Add bot response
      const botMessage = {
        role: 'bot',
        content: data || 'Thank you for your response.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);

      // If response contains completion indicator, clear saved conversation and close modal
      if (data.toLowerCase().includes('campaign created') || data.toLowerCase().includes('complete')) {
        localStorage.removeItem(STORAGE_KEY);
        setTimeout(() => {
          handleClose(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'bot',
        content: 'Sorry, I didn\'t receive that. Could you please try again?',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (clearConversation = false) => {
    if (clearConversation) {
      setMessages([]);
      setInputValue('');
      setTimestamp(null);
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
    setHasRestoredConversation(false); // Reset so it can restore next time
    onClose();
  };

  const handleStartNewConversation = () => {
    if (confirm('Are you sure you want to start a new campaign? Your current progress will be lost.')) {
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]);
      setTimestamp(null);
      setHasRestoredConversation(false);
      startNewConversation();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => handleClose(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">New Campaign</h2>
              {messages.length > 1 && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                  In Progress
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Chat to create your campaign</p>
          </div>
          <div className="flex items-center space-x-2">
            {messages.length > 1 && (
              <button
                onClick={handleStartNewConversation}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Start new campaign"
              >
                <RotateCcw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <button
              onClick={() => handleClose(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              <Send className="w-5 h-5" />
              <span>Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCampaignChatModal;
