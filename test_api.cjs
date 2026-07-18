const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/users',
  method: 'GET',
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', async () => {
    try {
      const users = JSON.parse(data);
      console.log('Got', users.length, 'users');
      if (users.length > 0) {
        const firstUserId = users[0].id;
        console.log('First user:', firstUserId);
        
        // Try to update
        const putData = JSON.stringify({
          ...users[0],
          status: 'archived'
        });
        
        const putReq = http.request({
          hostname: 'localhost',
          port: 5000,
          path: '/api/users/' + firstUserId,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(putData)
          }
        }, putRes => {
          let putResData = '';
          putRes.on('data', d => putResData += d);
          putRes.on('end', () => {
            console.log('PUT Response status:', putRes.statusCode);
            console.log('PUT Response body:', putResData);
            
            // Try to delete
            const delReq = http.request({
              hostname: 'localhost',
              port: 5000,
              path: '/api/users/' + firstUserId,
              method: 'DELETE'
            }, delRes => {
              let delResData = '';
              delRes.on('data', d => delResData += d);
              delRes.on('end', () => {
                console.log('DELETE Response status:', delRes.statusCode);
                console.log('DELETE Response body:', delResData);
                process.exit();
              });
            });
            delReq.end();
          });
        });
        putReq.write(putData);
        putReq.end();
      }
    } catch (e) {
      console.error(e);
      process.exit();
    }
  });
});

req.on('error', error => {
  console.error(error);
});
req.end();
