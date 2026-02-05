/**
 * YouTube Direct Upload Utility - New Google Identity Services
 */

const CLIENT_ID = import.meta.env.VITE_YOUTUBE_CLIENT_ID;
// Request broader YouTube scopes so managed/brand channels can be accessed
// Including youtubepartner for content owner access
const SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtubepartner';

let tokenClient = null;
let accessToken = null;
let selectedChannelId = null;

// Restore token and channel from localStorage on page load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('youtube_access_token');
  const storedChannel = localStorage.getItem('youtube_selected_channel');
  if (stored) {
    accessToken = stored;
    selectedChannelId = storedChannel;
    console.log('Restored YouTube token from storage');
  }
}

/**
 * Initialize Google Identity Services
 */
export const initializeGoogleAPI = () => {
  return new Promise((resolve) => {
    if (tokenClient) {
      resolve(true);
      return;
    }

    // Wait for Google Identity Services to load
    const checkGIS = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkGIS);
        
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', // Will be set per request
        });
        
        console.log('YouTube OAuth initialized');
        resolve(true);
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (!tokenClient) {
        clearInterval(checkGIS);
        console.error('Google Identity Services failed to load');
        resolve(false);
      }
    }, 5000);
  });
};

/**
 * Check if user is signed in
 */
export const isSignedIn = () => {
  return !!accessToken;
};

/**
 * Sign in to YouTube - MUST be called from direct user click event
 */
export const signIn = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await initializeGoogleAPI();
      
      if (!tokenClient) {
        reject(new Error('Google Identity Services not initialized'));
        return;
      }
      
      // Set callback BEFORE requesting token
      tokenClient.callback = (response) => {
        if (response.error) {
          console.error('OAuth error:', response);
          reject(new Error(response.error));
          return;
        }
        accessToken = response.access_token;
        // Store token in localStorage to persist across reloads
        localStorage.setItem('youtube_access_token', accessToken);
        console.log('✅ YouTube sign in successful');
        resolve(true);
      };
      
      // CRITICAL: This must be called synchronously from user interaction
      // Otherwise popup will be blocked
      console.log('Opening Google OAuth...');
      // Always force consent to ensure user can select any accessible channel
      // (helps surface Brand Accounts / channels the user manages)
      tokenClient.requestAccessToken({ 
        prompt: 'consent'
      });
    } catch (error) {
      console.error('Error requesting token:', error);
      reject(error);
    }
  });
};

/**
 * Sign out from YouTube
 */
export const signOut = () => {
  if (accessToken) {
    window.google.accounts.oauth2.revoke(accessToken);
    accessToken = null;
    localStorage.removeItem('youtube_access_token');
  }
};

/**
 * Set the selected YouTube channel
 */
export const setSelectedChannel = (channelId) => {
  selectedChannelId = channelId;
  localStorage.setItem('youtube_selected_channel', channelId);
};

/**
 * Get the currently selected channel ID
 */
export const getSelectedChannelId = () => {
  return selectedChannelId;
};

/**
 * Get user's YouTube channels to verify which one will be used
 */
export const getYouTubeChannels = async () => {
  if (!accessToken) {
    throw new Error('Not signed in to YouTube');
  }

  try {
    const allChannels = [];
    const channelIds = new Set();
    
    // Fetch owned channels (mine=true)
    console.log('Fetching owned channels...');
    const ownedResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,contentOwnerDetails&mine=true&maxResults=50',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (ownedResponse.ok) {
      const ownedData = await ownedResponse.json();
      console.log('Owned channels:', ownedData.items?.length || 0, ownedData.items?.map(c => c.snippet.title));
      if (ownedData.items) {
        ownedData.items.forEach(channel => {
          if (!channelIds.has(channel.id)) {
            channelIds.add(channel.id);
            allChannels.push(channel);
          }
        });
      }
    }

    // Fetch managed channels (managedByMe=true)
    console.log('Fetching managed channels...');
    const managedResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,contentOwnerDetails&managedByMe=true&maxResults=50',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (managedResponse.ok) {
      const managedData = await managedResponse.json();
      console.log('Managed channels:', managedData.items?.length || 0, managedData.items?.map(c => c.snippet.title));
      if (managedData.items) {
        managedData.items.forEach(channel => {
          if (!channelIds.has(channel.id)) {
            channelIds.add(channel.id);
            allChannels.push(channel);
          }
        });
      }
    }

    console.log('Total unique channels found:', allChannels.length);
    console.log('All channels:', allChannels.map(c => c.snippet.title));
    
    return allChannels;
  } catch (error) {
    console.error('Error getting YouTube channels:', error);
    throw error;
  }
};

/**
 * Upload video to YouTube using resumable upload with chunking
 */
export const uploadVideoToYouTube = async (file, metadata, onProgress) => {
  if (!accessToken) {
    await signIn();
  }

  const { title, description = '' } = metadata;
  
  const videoMetadata = {
    snippet: {
      title: title,
      description: description,
      categoryId: '22'
    },
    status: {
      privacyStatus: 'unlisted',
      selfDeclaredMadeForKids: false
    }
  };

  try {
    // Initialize resumable upload
    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Length': file.size.toString(),
          'X-Upload-Content-Type': file.type || 'video/*'
        },
        body: JSON.stringify(videoMetadata)
      }
    );

    if (!initResponse.ok) {
      throw new Error(`Failed to initialize upload: ${initResponse.status}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      throw new Error('No upload URL received from YouTube');
    }

    // Upload in chunks for better performance (10MB chunks)
    const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
    let uploadedBytes = 0;

    while (uploadedBytes < file.size) {
      const chunk = file.slice(uploadedBytes, uploadedBytes + CHUNK_SIZE);
      const chunkEnd = Math.min(uploadedBytes + CHUNK_SIZE, file.size) - 1;

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'video/*',
          'Content-Range': `bytes ${uploadedBytes}-${chunkEnd}/${file.size}`
        },
        body: chunk
      });

      if (response.status === 308) {
        // Resume incomplete, continue with next chunk
        uploadedBytes += CHUNK_SIZE;
        if (onProgress) {
          const percentComplete = Math.round((uploadedBytes / file.size) * 100);
          onProgress(Math.min(percentComplete, 99));
        }
      } else if (response.status >= 200 && response.status < 300) {
        // Upload complete
        const result = await response.json();
        if (onProgress) {
          onProgress(100);
        }
        return {
          id: result.id,
          url: `https://www.youtube.com/watch?v=${result.id}`,
          title: result.snippet.title
        };
      } else {
        throw new Error(`YouTube upload failed: ${response.status}`);
      }
    }
  } catch (error) {
    console.error('YouTube upload error:', error);
    throw error;
  }
};

/**
 * Format video title
 */
export const formatVideoTitle = (month, campaignName, fileName) => {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  return `${month}-${campaignName}-${nameWithoutExt}`;
};

/**
 * Check if file is a video
 */
export const isVideoFile = (file) => {
  const videoMimeTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
    'video/webm',
    'video/x-flv',
    'video/3gpp',
    'video/3gpp2'
  ];
  
  return videoMimeTypes.includes(file.type) || 
         /\.(mp4|mov|avi|wmv|flv|webm|mkv|m4v|3gp)$/i.test(file.name);
};
