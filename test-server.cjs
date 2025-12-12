const http = require('http');

const postData = JSON.stringify({
  email: 'test@hyrax.com',
  password: 'password123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing server connection...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`Response body: ${chunk}`);
  });
  res.on('end', () => {
    console.log('Response complete.');
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();