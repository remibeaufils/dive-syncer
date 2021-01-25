const {google} = require('googleapis');
const privatekey = require("../privatekey.json");

class GoogleAuth {
  constructor() {
    this.jwtClient = new google.auth.JWT(
      privatekey.client_email,
      // null,
      // privatekey.private_key,
      __dirname + '/../privatekey.json',
      null,
      [
        // 'https://www.googleapis.com/auth/spreadsheets',
        // 'https://www.googleapis.com/auth/analytics',
        'https://www.googleapis.com/auth/analytics.readonly',
        'https://www.googleapis.com/auth/adwords',
      ]
    );
  }

  async authorize() {
    try {
      return await new Promise((resolve, reject) =>
        this.jwtClient.authorize((err, tokens) => {
          if (err) {
            return reject(err);
          }

          // if (!this.isAuthorized()) {
          //   return reject('Couldn\'t authenticate to Google');
          // }
        
          console.log('\x1b[32mGoogle Auth: authorized\x1b[0m');
          
          // resolve(tokens);
          resolve(this.jwtClient);
        })
      );
    } catch (error) {
      console.log('Google Auth Error:', error.message);
      return null;
    }
  }

  isAuthorized() {
    return !!this.jwtClient
      && !!this.jwtClient.gtoken
      // && !!this.jwtClient.gtoken.token
      ;
  }
}

module.exports = new GoogleAuth();