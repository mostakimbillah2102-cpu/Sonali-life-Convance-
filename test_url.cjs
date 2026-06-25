const https = require('https');

https.get('https://sonalilife.com/assets/images/logo.png', (res) => {
  console.log('logo.png:', res.statusCode);
});

https.get('https://sonalilife.com/images/logo.png', (res) => {
  console.log('images/logo.png:', res.statusCode);
});

https.get('https://www.sonalilife.com/assets/frontend/img/logo.png', (res) => {
  console.log('frontend/img/logo.png:', res.statusCode);
});
