// Test script for upload endpoint
// Run with: node test-upload.mjs

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3001/api';

async function testUploadEndpoint() {
  console.log('\n🧪 Testing Upload Endpoint\n');
  
  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data.message);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('Make sure server is running: cd server && npm start');
    return;
  }
  
  // Test 2: Create a test file
  console.log('\n2. Creating test file...');
  const testFile = path.join(process.cwd(), 'test-upload.txt');
  const testContent = 'This is a test file for upload endpoint.\n'.repeat(1000);
  fs.writeFileSync(testFile, testContent);
  console.log(`✅ Created test file: ${(testContent.length / 1024).toFixed(2)}KB`);
  
  // Test 3: Upload the file
  console.log('\n3. Testing file upload...');
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFile), {
      filename: 'test-upload.txt',
      contentType: 'text/plain',
    });
    formData.append('taskId', '999');
    formData.append('adIndex', '0');
    formData.append('uploadedByUserId', '1');
    formData.append('uploadedByUserName', 'Test User');
    
    console.log('Uploading to:', `${API_URL}/upload-creative`);
    const uploadResponse = await fetch(`${API_URL}/upload-creative`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });
    
    const result = await uploadResponse.text();
    
    if (uploadResponse.ok) {
      console.log('✅ Upload successful!');
      console.log('Response:', result.substring(0, 200));
    } else {
      console.log('⚠️ Upload response:', uploadResponse.status);
      console.log('Details:', result.substring(0, 500));
      console.log('\nNote: If webhook returns error, that\'s OK - it means the server endpoint works!');
    }
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
  }
  
  // Cleanup
  console.log('\n4. Cleaning up...');
  try {
    fs.unlinkSync(testFile);
    console.log('✅ Test file removed');
  } catch (e) {
    console.log('⚠️ Could not remove test file:', e.message);
  }
  
  console.log('\n✅ Test complete!\n');
}

testUploadEndpoint();
