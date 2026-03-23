import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, RotateCcw } from 'lucide-react';

const NewCampaignChatModal = ({ isOpen, onClose, currentUser, users = [], loadUsers }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(null);
  const [hasRestoredConversation, setHasRestoredConversation] = useState(false);
  // Selection mode: null, 'media_buyers', 'image_designers', 'video_editors'
  const [selectionMode, setSelectionMode] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [shouldSave, setShouldSave] = useState(true);
  const [isClickmagickChoice, setIsClickmagickChoice] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const STORAGE_KEY = `campaign_chat_${currentUser?.id}`;

  // Save conversation state to localStorage whenever it changes
  useEffect(() => {
    if (messages.length > 0 && timestamp && shouldSave) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        messages,
        timestamp,
        lastUpdated: new Date().toISOString()
      }));
    }
  }, [messages, timestamp, shouldSave]);

  // Initialize or restore conversation when modal opens
  useEffect(() => {
    if (isOpen && !hasRestoredConversation) {
      // Try to restore previous conversation
      const savedConversation = localStorage.getItem(STORAGE_KEY);
      
      if (savedConversation) {
        try {
          const { messages: savedMessages, timestamp: savedTimestamp } = JSON.parse(savedConversation);
          
          // Check if the last bot message is an error message
          const lastBotMessage = [...savedMessages].reverse().find(msg => msg.role === 'bot');
          let cleanedMessages = savedMessages;
          
          if (lastBotMessage) {
            const isErrorMessage = lastBotMessage.content.toLowerCase().includes('error') ||
                                  lastBotMessage.content.toLowerCase().includes('failed') ||
                                  lastBotMessage.content.toLowerCase().includes('something went wrong') ||
                                  lastBotMessage.content.toLowerCase().includes('connection error') ||
                                  lastBotMessage.content.toLowerCase().includes('try again') ||
                                  lastBotMessage.content.toLowerCase() === 'thank you for your response.' ||
                                  lastBotMessage.content.toLowerCase() === 'thank you for your response';
            
            if (isErrorMessage) {
              // Remove error message and the user message before it
              const lastBotIndex = savedMessages.lastIndexOf(lastBotMessage);
              cleanedMessages = savedMessages.slice(0, lastBotIndex);
              
              // If there's a user message right before the error, remove that too
              if (cleanedMessages.length > 0 && cleanedMessages[cleanedMessages.length - 1].role === 'user') {
                cleanedMessages = cleanedMessages.slice(0, -1);
              }
              
              // Update localStorage with cleaned messages
              if (cleanedMessages.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                  messages: cleanedMessages,
                  timestamp: savedTimestamp,
                  lastUpdated: new Date().toISOString()
                }));
              } else {
                // If no messages left, remove and start fresh
                localStorage.removeItem(STORAGE_KEY);
                startNewConversation();
                return;
              }
            }
          }
          
          setMessages(cleanedMessages);
          setTimestamp(savedTimestamp);
          setHasRestoredConversation(true);
          
          // Check if the last bot message (after cleaning) is asking for user selection
          const finalLastBotMessage = [...cleanedMessages].reverse().find(msg => msg.role === 'bot');
          if (finalLastBotMessage) {
            if (finalLastBotMessage.content.includes('Who are the media buyers on the campaign?')) {
              setSelectionMode('media_buyers');
              setSelectedUsers([]);
              if (loadUsers) {
                setIsLoadingUsers(true);
                loadUsers().then(() => setIsLoadingUsers(false)).catch(error => {
                  console.error('Error loading users:', error);
                  setIsLoadingUsers(false);
                });
              }
            } else if (finalLastBotMessage.content.includes('Who are the image designers on the campaign?')) {
              setSelectionMode('image_designers');
              setSelectedUsers([]);
              if (loadUsers) {
                setIsLoadingUsers(true);
                loadUsers().then(() => setIsLoadingUsers(false)).catch(error => {
                  console.error('Error loading users:', error);
                  setIsLoadingUsers(false);
                });
              }
            } else if (finalLastBotMessage.content.includes('Who are the video editors on the campaign?')) {
              setSelectionMode('video_editors');
              setSelectedUsers([]);
              if (loadUsers) {
                setIsLoadingUsers(true);
                loadUsers().then(() => setIsLoadingUsers(false)).catch(error => {
                  console.error('Error loading users:', error);
                  setIsLoadingUsers(false);
                });
              }
            } else if (finalLastBotMessage.content.includes('Do you need a Clickmagick campaign?')) {
              setIsClickmagickChoice(true);
            }
          }
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

  const checkForUserSelection = async (data) => {
    if (data && data.includes('Who are the media buyers on the campaign?')) {
      setSelectionMode('media_buyers');
      setSelectedUsers([]);
      if (loadUsers) {
        setIsLoadingUsers(true);
        try {
          await loadUsers();
        } catch (error) {
          console.error('Error loading users:', error);
        } finally {
          setIsLoadingUsers(false);
        }
      }
      return true;
    } else if (data && data.includes('Who are the image designers on the campaign?')) {
      setSelectionMode('image_designers');
      setSelectedUsers([]);
      if (loadUsers) {
        setIsLoadingUsers(true);
        try {
          await loadUsers();
        } catch (error) {
          console.error('Error loading users:', error);
        } finally {
          setIsLoadingUsers(false);
        }
      }
      return true;
    } else if (data && data.includes('Who are the video editors on the campaign?')) {
      setSelectionMode('video_editors');
      setSelectedUsers([]);
      if (loadUsers) {
        setIsLoadingUsers(true);
        try {
          await loadUsers();
        } catch (error) {
          console.error('Error loading users:', error);
        } finally {
          setIsLoadingUsers(false);
        }
      }
      return true;
    } else if (data && data.includes('Do you need a Clickmagick campaign?')) {
      setIsClickmagickChoice(true);
      return true;
    }
    return false;
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
      
      // Check if response indicates an error from n8n workflow
      const isError = !data || 
                      data.trim() === '' ||
                      data.toLowerCase().includes('error') || 
                      data.toLowerCase().includes('failed') ||
                      data.toLowerCase().includes('something went wrong') ||
                      data.toLowerCase() === 'thank you for your response.' ||
                      data.toLowerCase() === 'thank you for your response';
      
      if (isError) {
        throw new Error('Workflow returned an error');
      }
      
      // Add bot response to messages
      const botMessage = {
        role: 'bot',
        content: data,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);

      // Check if this is a user selection question
      await checkForUserSelection(data);
    } catch (error) {
      console.error('Error starting campaign creation:', error);
      const errorMessage = {
        role: 'bot',
        content: 'Sorry, there was an error starting the campaign creation. Please close and try again.',
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
      
      // Check if response indicates an error from n8n workflow
      const isError = !data || 
                      data.trim() === '' ||
                      data.toLowerCase().includes('error') || 
                      data.toLowerCase().includes('failed') ||
                      data.toLowerCase().includes('something went wrong') ||
                      data.toLowerCase() === 'thank you for your response.' ||
                      data.toLowerCase() === 'thank you for your response';
      
      if (isError) {
        // Don't save this failed state
        setShouldSave(false);
        
        // Remove the last user message to go back to previous step
        setMessages(prev => prev.slice(0, -1));
        
        // Show error message
        const errorMessage = {
          role: 'bot',
          content: 'There was an error processing your request. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        // Re-enable saving after showing error
        setTimeout(() => setShouldSave(true), 100);
        return;
      }
      
      // Add bot response
      const botMessage = {
        role: 'bot',
        content: data,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);

      // Check if this is a user selection question
      await checkForUserSelection(data);

      // If response contains completion indicator, clear saved conversation and close modal
      if (data.toLowerCase().includes('campaign created') || 
          data.toLowerCase().includes('complete') || 
          data.toLowerCase().includes('thank you. the folder on the nas will be ready shortly')) {
        localStorage.removeItem(STORAGE_KEY);
        setTimeout(() => {
          handleClose(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Don't save this failed state
      setShouldSave(false);
      
      // Remove the last user message to go back to previous step
      setMessages(prev => prev.slice(0, -1));
      
      const errorMessage = {
        role: 'bot',
        content: 'Sorry, there was a connection error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Re-enable saving after showing error
      setTimeout(() => setShouldSave(true), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleClickmagickChoice = async (choice) => {
    setIsLoading(true);
    setIsClickmagickChoice(false);

    const userMessage = {
      role: 'user',
      content: choice === 'yes' ? 'Yes' : 'No',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('https://workflows.wearehyrax.com/webhook/new-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: choice,
          timestamp: timestamp,
          user_id: currentUser?.id,
          user_name: currentUser?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.text();
      
      // Check if response indicates an error from n8n workflow
      const isError = !data || 
                      data.trim() === '' ||
                      data.toLowerCase().includes('error') || 
                      data.toLowerCase().includes('failed') ||
                      data.toLowerCase().includes('something went wrong') ||
                      data.toLowerCase() === 'thank you for your response.' ||
                      data.toLowerCase() === 'thank you for your response';
      
      if (isError) {
        // Don't save this failed state
        setShouldSave(false);
        
        // Remove the last user message to go back to previous step
        setMessages(prev => prev.slice(0, -1));
        
        // Show error message
        const errorMessage = {
          role: 'bot',
          content: 'There was an error processing your request. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        // Show choice again
        setIsClickmagickChoice(true);
        
        // Re-enable saving after showing error
        setTimeout(() => setShouldSave(true), 100);
        setIsLoading(false);
        return;
      }
      
      // Add bot response
      const botMessage = {
        role: 'bot',
        content: data,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);

      // Check for next selection steps
      await checkForUserSelection(data);

      // If response contains completion indicator, clear saved conversation and close modal
      if (data.toLowerCase().includes('campaign created') || 
          data.toLowerCase().includes('complete') || 
          data.toLowerCase().includes('thank you. the folder on the nas will be ready shortly')) {
        localStorage.removeItem(STORAGE_KEY);
        setTimeout(() => {
          handleClose(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Don't save this failed state
      setShouldSave(false);
      
      // Remove the last user message to go back to previous step
      setMessages(prev => prev.slice(0, -1));
      
      const errorMessage = {
        role: 'bot',
        content: 'Sorry, there was a connection error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Show choice again
      setIsClickmagickChoice(true);
      
      // Re-enable saving after showing error
      setTimeout(() => setShouldSave(true), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitUsers = async () => {
    if (selectedUsers.length === 0) {
      return;
    }

    setIsLoading(true);
    const currentMode = selectionMode;
    setSelectionMode(null);

    // Create a message showing selected users
    const selectedUsersList = users.filter(u => selectedUsers.includes(u.id));
    const selectedNames = selectedUsersList.map(u => u.name).join(', ');
    
    const modeLabels = {
      'media_buyers': 'media buyers',
      'image_designers': 'image designers',
      'video_editors': 'video editors'
    };
    
    const userMessage = {
      role: 'user',
      content: `Selected ${modeLabels[currentMode]}: ${selectedNames}`,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('https://workflows.wearehyrax.com/webhook/new-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: JSON.stringify(selectedUsers),
          timestamp: timestamp,
          user_id: currentUser?.id,
          user_name: currentUser?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.text();
      
      // Check if response indicates an error from n8n workflow
      const isError = !data || 
                      data.trim() === '' ||
                      data.toLowerCase().includes('error') || 
                      data.toLowerCase().includes('failed') ||
                      data.toLowerCase().includes('something went wrong') ||
                      data.toLowerCase() === 'thank you for your response.' ||
                      data.toLowerCase() === 'thank you for your response';
      
      if (isError) {
        // Don't save this failed state
        setShouldSave(false);
        
        // Remove the last user message to go back to previous step
        setMessages(prev => prev.slice(0, -1));
        
        // Show error message
        const errorMessage = {
          role: 'bot',
          content: `There was an error processing your request. Please select the ${modeLabels[currentMode]} again.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        
        // Show selection again
        setSelectionMode(currentMode);
        
        // Re-enable saving after showing error
        setTimeout(() => setShouldSave(true), 100);
        setIsLoading(false);
        return;
      }
      
      // Add bot response
      const botMessage = {
        role: 'bot',
        content: data,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMessage]);

      // Check for next selection steps
      if (data && data.includes('Who are the image designers on the campaign?')) {
        setSelectionMode('image_designers');
        setSelectedUsers([]);
        if (loadUsers) {
          setIsLoadingUsers(true);
          loadUsers().then(() => setIsLoadingUsers(false)).catch(error => {
            console.error('Error loading users:', error);
            setIsLoadingUsers(false);
          });
        }
      } else if (data && data.includes('Who are the video editors on the campaign?')) {
        setSelectionMode('video_editors');
        setSelectedUsers([]);
        if (loadUsers) {
          setIsLoadingUsers(true);
          loadUsers().then(() => setIsLoadingUsers(false)).catch(error => {
            console.error('Error loading users:', error);
            setIsLoadingUsers(false);
          });
        }
      }

      // If response contains completion indicator, clear saved conversation and close modal
      if (data.toLowerCase().includes('campaign created') || 
          data.toLowerCase().includes('complete') || 
          data.toLowerCase().includes('thank you. the folder on the nas will be ready shortly')) {
        localStorage.removeItem(STORAGE_KEY);
        setTimeout(() => {
          handleClose(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Don't save this failed state
      setShouldSave(false);
      
      // Remove the last user message to go back to previous step
      setMessages(prev => prev.slice(0, -1));
      
      const errorMessage = {
        role: 'bot',
        content: 'Sorry, there was a connection error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Re-enable saving after showing error
      setTimeout(() => setShouldSave(true), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (clearConversation = false) => {
    if (clearConversation) {
      setMessages([]);
      setInputValue('');
      setTimestamp(null);
      setSelectionMode(null);
      setSelectedUsers([]);
      setIsClickmagickChoice(false);
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
    setShouldSave(true); // Reset save flag
    setHasRestoredConversation(false); // Reset so it can restore next time
    onClose();
  };

  const handleStartNewConversation = () => {
    if (confirm('Are you sure you want to start a new campaign? Your current progress will be lost.')) {
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]);
      setTimestamp(null);
      setHasRestoredConversation(false);
      setShouldSave(true); // Reset save flag
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

        {/* Clickmagick Choice */}
        {isClickmagickChoice && (
          <div className="p-4 border-t border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Clickmagick Campaign</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Do you need a Clickmagick campaign for this campaign?</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleClickmagickChoice('yes')}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Yes'
                )}
              </button>
              <button
                onClick={() => handleClickmagickChoice('no')}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'No'
                )}
              </button>
            </div>
          </div>
        )}

        {/* User Selection (Media Buyers, Image Designers, Video Editors) */}
        {selectionMode && (
          <div className="p-4 border-t border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {selectionMode === 'media_buyers' && 'Select Media Buyers'}
                {selectionMode === 'image_designers' && 'Select Image Designers'}
                {selectionMode === 'video_editors' && 'Select Video Editors'}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Choose the {selectionMode === 'media_buyers' ? 'media buyers' : selectionMode === 'image_designers' ? 'image designers' : 'video editors'} for this campaign (this is irreversible)
              </p>
            </div>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading users...</span>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(() => {
                    const departmentMap = {
                      'media_buyers': 'MEDIA BUYING',
                      'image_designers': 'GRAPHIC DESIGN',
                      'video_editors': 'VIDEO EDITING'
                    };
                    const filteredUsers = users.filter(user => user.department === departmentMap[selectionMode]);
                    
                    return filteredUsers.length > 0 ? (
                      filteredUsers.map(user => (
                        <label
                          key={user.id}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUser(user.id)}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <div className="flex items-center space-x-2 flex-1">
                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs font-semibold">
                              {user.avatar || user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </label>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No {selectionMode === 'media_buyers' ? 'media buyers' : selectionMode === 'image_designers' ? 'image designers' : 'video editors'} found.</p>
                        <p className="text-xs mt-1">Please contact your administrator.</p>
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={handleSubmitUsers}
                  disabled={selectedUsers.length === 0 || isLoading}
                  className="mt-3 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Confirm Selection ({selectedUsers.length})</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Input Area */}
        {!selectionMode && !isClickmagickChoice && (
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
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
        )}
      </div>
    </div>
  );
};

export default NewCampaignChatModal;
