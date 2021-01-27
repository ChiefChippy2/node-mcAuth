# node-mcAuth
Node JS Implementation for handling OAuth2 with the new upcoming minecraft authentication scheme.

# Quickstart : 
First, to initiate a Client that will contain all the methods you need, do : 
```js
const AuthClient = new Client(clientID, clientSecret, redirectURI, options)
```
Client ID and Client Secret should be from your azure application page (See [me](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app#register-an-application)), 
redirectURI should be provided if you want to use `genURL()`

### Generate a URL for OAuth2 : 
```js
const AuthClient = require('node-mcAuth').Client;
AuthClient.genURL();
// returns an object with URL and state
```
This will generate a valid one-time URL for authentication

### Listen to requests
```js
// Keep in mind that your redirectURI must end with '/callback', or otherwise you need to provide the path yourself as the 2nd argument. You can also pass an express app to the function.
//NOTE : this is not mandatory, only helps you handle the incoming requests easier.
AuthClient.init().listen(80); // This will listen to all traffic coming from port 80.

//Upon request : 
AuthClient.on('incomingAuth',(request,response,stateValidity))
// Request and Response are unmodified express objects
// stateValidity is whether an activeState has been found
```

### Authenticating : 

```js
const code = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx';// assuming code is the code you got from the callback URL : 
AuthClient.authenticateCode(code)
    .then(connectXbox)
    .then(XboxXSTS) // you can chain them like this
    .then(r=>{
        //do something with the response in JSON idk
        return r
    })
    .then(mcLoginWithXbox)
    .then(checkMcOwnership)
    .then(getUUIDfromToken)
    .then(response=>{
        // Ayy Finally you got the user's UUID
    })
// Of course, you are not forced to do every single step if you only want to check they own minecraft or something.
```

### Options 
We support a lot of options for customization.
Some options are global only, others are local and global.
Local always overrides global.

*Global-Only :*
(Note : the values provided are the default values)
```js
{
    backendOnly:false; // If true, disables state-managing and genURL. redirectURI isn't needed in this case
}
```

*Local and Global :*
```js
{
    offline:false, // If true, additionally prompts user for an offline token. This can be used to refresh a token ( TODO ) and get their profile again without having to ask them to authenticate blablabla.
    state:false, // If true, a state is generated. This is very useful for 1. knowing which user it is and 2. checking if there is some XSRF or some other voodoo magic that is abusing your OAuth.
    stateOptions:{
        stateLength: 16, // Length of state, can't be larger than 128
        ttl: 60, // Time in seconds for the state to be valid. Can't be more than 1 hour.
        allowedChars: '1234567890abcdef-' // Potential characters to be inside the state. Recommendation : don't put emojis.
    }
}
```

### Error Handling : 
One moment or another, there will be an error. What caused it? No one can tell for sure. Instead of throwing another piece of coin down the wishing well to hope for another day without any errors, try catching them ! Let's use the snippet from above.
```js
const code = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx';// assuming code is the code you got from the callback URL : 
authenticateCode(code)
    .then(connectXbox)
    .then(XboxXSTS) // you can chain them like this
    .then(r=>{
        //do something with the response in JSON idk
        return r
    })
    .then(mcLoginWithXbox)
    .then(checkMcOwnership)
    .then(getUUIDfromToken)
    .then(response=>{
        // Ayy Finally you got the user's UUID
    })
    .catch(console.log); // Here, you are simply console.logging the error.
```

### Custom errors : 
The errors are written in english, so if you are using this for, say, a target audience of Spanish people, you might want to provide Spanish translations. As of Jan 27, 2021, you can't PR translations for error messages yet, BUT you can do : 
```js
const Errors = require('node-mcAuth').Errors;
// ...
//blabla a lot of thens later
.catch(err=>{
    if(err === Errors.HTTPError401) console.log('Ayo you are not authorized');
    else console.log(err); // Otherwise, still log it. Remember, as best practice, never silence errors. It will be a pain for troubleshooting
});
```
