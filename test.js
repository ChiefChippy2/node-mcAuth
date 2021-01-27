require('dotenv').config();
const { Client } = require('./index.js');
const exp = require('express');
const app = exp();
const AuthClient = new Client(process.env.clientID, process.env.clientSecret, process.env.redirectURI,
  {
    backendOnly: true
  });
app.get('/', (req, res) => {
  const code = req.query.code;
  console.log(code);
  AuthClient.authenticateCode(code)
    .then(AuthClient.connectXbox)
    .then(AuthClient.XboxXSTS)
    .then(AuthClient.mcLoginWithXbox)
    .then(AuthClient.checkMcOwnership)
    .then(AuthClient.getUUIDfromToken)
    .then(console.log)
    .catch(console.error);
});
app.listen(80);
