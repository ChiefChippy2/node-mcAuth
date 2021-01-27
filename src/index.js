const fetch = require('node-fetch');
const { EventEmitter } = require('events');
const express = require('express');
const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};
const gameItem = [{
  name: 'product_minecraft',
  signature: 'jwt sig'
},
{
  name: 'game_minecraft',
  signature: 'jwt sig'
}];
const Errors = require('./Errors');
const StateManager = require('./stateManager');

class Client extends EventEmitter {
  constructor (clientID = '', clientSecret = '', redirectURI, options = {}) {
    super();
    if (!clientID || !typeof clientID === 'string') throw new Error(Errors.BadID);
    if (!clientSecret || !typeof clientSecret === 'string') throw new Error(Errors.BadSecret);
    this.clientID = clientID;
    this.clientSecret = clientSecret;
    this.state = options.state;
    this.offline = options.offline;
    if (options.stateOptions && typeof options.stateOptions !== 'object') throw new Error(Errors.BadOptions);
    this.backendOnly = options.backendOnly;
    if (!redirectURI || typeof redirectURI !== 'string') throw new Error(Errors.BadRedirectURI);
    this.redirectURI = redirectURI;
    // TODO : this._configureBackend();
    if (options.backendOnly) return;
    this.managedStates = new Set();
    this.clientStates = new StateManager(options.stateOptions);
  }

  _checkValid (req) {
    if (!req.IssueInstant || !req.NotAfter) return 2; // Whatever
    if (new Date(req.IssueInstant).getTime() > Date.now()) return 0;
    if (Date.now() >= new Date(req.NotAfter).getTime()) return 0;
    return 1; // Fully verified.
  }

  init (app, endpoint = '/callback') {
    if (!app) app = express();
    app.get(endpoint, this.handleIncomingAuth);
    return app;
  }

  genURL (options = {}) {
    if (options.backendOnly) return null; // We shouldn't be handling this because user asked for it.
    const newState = options.state !== false || this.state ? this.state.createState(options.stateOptions) : '';
    return {
      URL: `https://login.live.com/oauth20_authorize.srf?client_id=${this.clientID}&response_type=code&redirect_uri=${this.redirectURI}&scope=XboxLive.signin${options.offline !== false || this.offline ? '%20offline_access' : ''}&state=${newState}`,
      state: newState
    };
  }

  async authenticateCode (data) {
    if (typeof data === 'object') this._checkValid(data);
    if (data instanceof fetch.Request) data = data.code;
    if (!data || !typeof data === 'string') throw new Error(Errors.BadOptions);
    const req = await fetch('https://login.live.com/oauth20_token.srf',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `client_id=${this.clientID}&client_secret=${this.clientSecret}&code=${data}&grant_type=authorization_code&redirect_uri=${this.redirectURI}`,
        method: 'POST'
      });
    if (!req.ok) throw new Error(Errors[`HTTPError${req.status}`] || Errors.HTTPError);
    try {
      const res = await req.json();
      return res;
    } catch (e) {
      throw new Error(Errors.ParseError);
    }
  }

  async connectXbox (data) {
    data = data.access_token || data;
    if (!data || !typeof data === 'string') throw new Error(Errors.BadOptions);
    try {
      const req = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
        headers,
        body: JSON.stringify({
          Properties: {
            AuthMethod: 'RPS',
            SiteName: 'user.auth.xboxlive.com',
            RpsTicket: `d=${data}`
          },
          RelyingParty: 'http://auth.xboxlive.com',
          TokenType: 'JWT'
        }),
        method: 'POST'

      });
      if (!req.ok) throw new Error(Errors[`HTTPError${req.status}`] || Errors.HTTPError);
      const res = await req.json();
      return res;
    } catch (e) {
      console.error(e);
      throw new Error(Errors.ParseError);
    }
  }

  async XboxXSTS (data) {
    data = data.Token || data;
    if (!data || !typeof data === 'string') throw new Error(Errors.BadOptions);
    try {
      const req = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
        headers,
        method: 'POST',
        body:
            JSON.stringify({
              Properties: {
                SandboxId: 'RETAIL',
                UserTokens: [
                  data
                ]
              },
              RelyingParty: 'rp://api.minecraftservices.com/',
              TokenType: 'JWT'
            })
      });
      if (req.status === 401) throw new Error(Errors[`XBOX_${(await req.json()).XErr || Errors.HTTPError401}`]);
      if (!req.ok) throw new Error(Errors[`HTTPError${req.status}`] || Errors.HTTPError);
      const res = await req.json();
      return res;
    } catch (e) {
      console.error(e);
      throw new Error(Errors.ParseError);
    }
  }

  async mcLoginWithXbox (data, xstsToken) {
    if (typeof data === 'object' && data.DisplayClaims) [data, xstsToken] = [data.DisplayClaims.xui[0].uhs, data.Token];
    if (typeof data !== 'string' || typeof xstsToken !== 'string') throw new Error(Errors.BadOptions);
    try {
      const req = await fetch('https://api.minecraftservices.com/authentication/login_with_xbox', {
        headers,
        method: 'POST',
        body: JSON.stringify({
          identityToken: `XBL3.0 x=${data};${xstsToken}`
        })
      });
      if (!req.ok) throw new Error(Errors[`HTTPError${req.status}`] || Errors.HTTPError);
      const res = await req.json();
      return res;
    } catch (e) {
      console.error(e);
      throw new Error(Errors.ParseError);
    }
  }

  async checkMcOwnership (data) {
    // TODO : better error
    if (typeof data === 'object' && data.token_type !== 'Bearer' && data.expires_in <= 0) throw new Error(Errors.BadOptions);
    data = data.access_token || data;
    if (!data || !typeof data === 'string') throw new Error(Errors.BadOptions);
    try {
      const req = await fetch('https://api.minecraftservices.com/entitlements/mcstore',
        {
          headers: {
            Authorization: `Bearer ${data}`
          }
        });
      if (!req.ok) throw new Error(Errors[`HTTPError${req.status}`] || Errors.HTTPError);
      const res = await req.json();
      return { ...res, token: data }; // Give token to next step because it will be needed lul
    } catch (e) {
      console.error(e);
      throw new Error(Errors.ParseError);
    }
  }

  async getUUIDfromToken (data) {
    if (typeof data === 'string' || !data.items.length || !data.items.every(x => gameItem.includes(x))) throw new Error(Errors.gameNotFound);
    data = data.token || data;
    if (!data || !typeof data === 'string') throw new Error(Errors.BadOptions);
    try {
      const req = await fetch('https://api.minecraftservices.com/minecraft/profile',
        {
          headers: {
            Authorization: `Bearer ${data}`
          }
        });
      if (!req.ok) throw new Error(Errors[`HTTPError${req.status}`] || Errors.HTTPError);
      const res = await req.json();
      if (res.error) throw new Error(Errors[res.error] || Errors.MC_LOOKUP_GENERAL_ERROR);
      return res;
    } catch (e) {
      console.error(e);
      throw new Error(Errors.ParseError);
    }
  }

  handleIncomingAuth (req, res) {
    if (req.query.state) {
      if (this.managedStates.has(req.query.state)) return this.emit('_stateReq');
      /* Invalid State */
      res.sendStatus(401);
    }
    this.emit('incomingAuth', req, res, this.clientStates.validateState(req.query.state)); // Not managed, but still emit.
  }
}

module.exports = Client;
