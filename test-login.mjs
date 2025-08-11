// Teste simples de login direto
import http from 'http';

const data = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let responseData = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log(`RESPONSE: ${responseData.substring(0, 200)}...`);
    
    // Test if it's JSON
    try {
      const json = JSON.parse(responseData);
      console.log('✅ VALID JSON:', json);
    } catch (e) {
      console.log('❌ NOT JSON, likely HTML response');
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(data);
req.end();