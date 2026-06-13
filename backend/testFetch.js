const http = require('http');

const loginData = JSON.stringify({ email: 'admin@queuecure.com', password: 'admin123' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const response = JSON.parse(data);
    if (!response.token) {
      console.log('Login failed:', data);
      return;
    }
    
    // Now fetch analytics
    http.get('http://localhost:5000/api/analytics?startDate=2026-05-13&endDate=2026-06-12', {
      headers: { 'Authorization': `Bearer ${response.token}` }
    }, (analyticsRes) => {
      let aData = '';
      analyticsRes.on('data', (chunk) => { aData += chunk; });
      analyticsRes.on('end', () => {
        console.log('Analytics Status:', analyticsRes.statusCode);
        console.log('Analytics Data:', aData);
      });
    });
  });
});

req.write(loginData);
req.end();
