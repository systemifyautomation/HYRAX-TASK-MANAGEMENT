/**
 * S3-Compatible Storage Upload Utility
 * Handles uploading creative files to S3-compatible storage (Cloudflare R2, AWS S3, etc.)
 * Uses AWS SDK for proper authentication
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Upload a file to S3-compatible storage using AWS SDK
 * @param {File} file - The file to upload
 * @param {string} path - The path/key for the file in S3
 * @param {function} onProgress - Progress callback function (percentage)
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadToR2 = async (file, path, onProgress) => {
  const endpoint = import.meta.env.VITE_S3_ENDPOINT;
  const region = import.meta.env.VITE_S3_REGION || 'auto';
  const bucketName = import.meta.env.VITE_S3_BUCKET_NAME;
  const accessKeyId = import.meta.env.VITE_S3_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_S3_SECRET_ACCESS_KEY;
  const publicUrl = import.meta.env.VITE_S3_PUBLIC_URL;

  // Validate environment variables
  if (!endpoint || !bucketName || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing S3 storage credentials. Please check your .env file.');
  }

  console.log('=== R2 UPLOAD START ===');
  console.log('File:', file.name);
  console.log('Size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
  console.log('Path:', path);
  console.log('Bucket:', bucketName);
  console.log('Endpoint:', endpoint);
  console.log('Region:', region);

  try {
    // Generate a unique filename with timestamp to avoid collisions
    const timestamp = Date.now();
    const sanitizedPath = path.replace(/^\/+/, ''); // Remove leading slashes
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename
    const key = `${sanitizedPath}/${timestamp}_${fileName}`;

    console.log('Upload key:', key);

    // Initialize S3 client with R2 configuration
    const s3Client = new S3Client({
      region: region,
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    
    // Simulate progress (AWS SDK doesn't provide upload progress for browser uploads yet)
    if (onProgress) onProgress(10);

    // Create upload command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: new Uint8Array(arrayBuffer),
      ContentType: file.type || 'application/octet-stream',
    });

    if (onProgress) onProgress(50);

    console.log('📤 Uploading to R2...');
    
    // Execute upload
    await s3Client.send(command);
    
    if (onProgress) onProgress(100);

    // Construct the public URL
    const fileUrl = publicUrl 
      ? `${publicUrl}/${key}`
      : `${endpoint}/${bucketName}/${key}`.replace(endpoint, publicUrl || endpoint);
    
    console.log('✅ R2 Upload successful');
    console.log('File URL:', fileUrl);
    
    return fileUrl;

  } catch (error) {
    console.error('=== R2 UPLOAD FAILED ===');
    console.error('Error:', error.message);
    console.error('Error details:', error);
    throw new Error(`R2 upload failed: ${error.message}`);
  }
};

/**
 * Alternative: Get a presigned URL from your backend and upload using it
 * This is the RECOMMENDED approach for production
 * @param {File} file - The file to upload
 * @param {string} path - The path/key for the file
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadToR2WithPresignedUrl = async (file, path, onProgress) => {
  const presignedUrlEndpoint = import.meta.env.VITE_S3_PRESIGNED_URL_ENDPOINT;
  
  if (!presignedUrlEndpoint) {
    throw new Error('VITE_S3_PRESIGNED_URL_ENDPOINT not configured');
  }

  console.log('=== S3 PRESIGNED UPLOAD START ===');
  console.log('Getting presigned URL from:', presignedUrlEndpoint);

  try {
    // Step 1: Get presigned URL from backend
    const timestamp = Date.now();
    const sanitizedPath = path.replace(/^\/+/, '');
    const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${sanitizedPath}/${timestamp}_${fileName}`;

    const presignedResponse = await fetch(presignedUrlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: key,
        contentType: file.type || 'application/octet-stream',
        fileSize: file.size,
      }),
    });

    if (!presignedResponse.ok) {
      throw new Error(`Failed to get presigned URL: ${presignedResponse.status}`);
    }

    const { uploadUrl, publicUrl } = await presignedResponse.json();
    console.log('✅ Got presigned URL');

    // Step 2: Upload file to S3 using presigned URL
    const uploadPromise = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      let lastProgressTime = Date.now();
      let lastProgressBytes = 0;

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          const uploadedMB = (e.loaded / 1024 / 1024).toFixed(2);
          const totalMB = (e.total / 1024 / 1024).toFixed(2);
          
          const now = Date.now();
          const timeDiff = (now - lastProgressTime) / 1000;
          const bytesDiff = e.loaded - lastProgressBytes;
          const speedMBps = timeDiff > 0 ? (bytesDiff / 1024 / 1024 / timeDiff).toFixed(2) : 0;
          
          console.log(`📤 S3: ${percentComplete}% (${uploadedMB}/${totalMB}MB) | ${speedMBps}MB/s`);
          
          if (onProgress) {
            onProgress(Math.min(percentComplete, 99));
          }
          
          lastProgressTime = now;
          lastProgressBytes = e.loaded;
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('✅ S3 Upload successful');
          if (onProgress) {
            onProgress(100);
          }
          resolve(publicUrl);
        } else {
          console.error('❌ S3 Upload failed:', xhr.status);
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });

    const fileUrl = await uploadPromise;
    console.log('=== S3 PRESIGNED UPLOAD COMPLETE ===');
    console.log('File URL:', fileUrl);
    
    return fileUrl;

  } catch (error) {
    console.error('=== S3 PRESIGNED UPLOAD FAILED ===');
    console.error('Error:', error.message);
    throw error;
  }
};
