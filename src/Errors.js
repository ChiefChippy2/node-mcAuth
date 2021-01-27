const Errors = {
  BadID: 'Invalid ID. Must be type string.',
  BadRedirectURI: 'Invalid Redirect URI. Must be type string and a valid url.',
  BadOptions: 'Options is not provided as an object.',
  ParseError: 'Unable to parse response body to JSON.',
  HTTPError: 'HTTP Status Code isn\'t 200, nor any expected error codes.',
  HTTPError404: 'Not Found',
  HTTPError403: 'Forbidden',
  HTTPError401: 'Unauthorized',
  HTTPError429: 'Too many requests. Rate limit hit',
  HTTPError503: 'Temporarily Unavailable ( Server down )',
  HTTPError400: 'Bad Request ( Invalid body or code invalidated )',
  MC_LOOKUP_NOT_FOUND: 'User doesn\'t own a mincraft account, or the account is not found.',
  MC_LOOKUP_GENERAL_ERROR: 'Some other error that isn\'t expected happened.',
  XBOX_2148916233: 'The account doesn\'t have an Xbox account. See XBOX_233_FULL for full info.',
  XBOX_233: 'User can proceed with the login when they sign up/log in with an xbox account. This shouldn\'t happen with new accounts that have purchased Minecraft with a Microsoft account, as they would\'ve already gone through that Xbox signup process.',
  XBOX_2148916238: 'User is a child and cannot proceed unless the account is added to a Family by an adult.',
  AuthError: 'Something wrong happened whilst retrieving access token from microsoft',
  AuthError_invalid_grant: 'The Grant is invalid : usually this is due to a timeout',
  gameNotFound: 'User doesn\'t own a valid copy of minecraft.'
};
module.exports = Errors;
