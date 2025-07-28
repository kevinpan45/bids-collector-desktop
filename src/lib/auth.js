import { createAuth0Client } from '@auth0/auth0-spa-js';

let auth0 = null;
let user = null;
let isAuthenticated = false;
let popupOpen = false;

// Get Auth0 id_token after login
async function getIdToken() {
  if (isAuthenticated) {
    const tokenSet = await auth0.getIdTokenClaims();
    return tokenSet.__raw;
  } else {
    throw new Error('User is not authenticated');
  }
}

async function createClient() {
  auth0 = await createAuth0Client({
    domain: import.meta.env.VITE_AUTH0_DOMAIN,
    clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: window.location.origin
    }
  });
}

async function loginWithPopup(options) {
  popupOpen = true;
  try {
    await auth0.loginWithPopup(options);
    user = await auth0.getUser();
    isAuthenticated = true;
  } finally {
    popupOpen = false;
  }
}

async function handleRedirectCallback() {
  await auth0.handleRedirectCallback();
  user = await auth0.getUser();
  isAuthenticated = true;
}

async function loginWithRedirect(options) {
  await auth0.loginWithRedirect(options);
}

async function logout(options) {
  await auth0.logout({
    ...options,
    logoutParams: {
      returnTo: window.location.origin // Change this to your desired redirect URL
    }
  });
}

async function checkAuth() {
  isAuthenticated = await auth0.isAuthenticated();
  if (isAuthenticated) {
    user = await auth0.getUser();
  } else {
    console.log('No user logged in');
  }
}

async function getToken() {
  if (isAuthenticated) {
    return await auth0.getTokenSilently();
  } else {
    throw new Error('User is not authenticated');
  }
}

export {
  createClient,
  loginWithPopup,
  loginWithRedirect,
  logout,
  handleRedirectCallback,
  checkAuth,
  isAuthenticated,
  user,
  popupOpen,
  getToken,
  getIdToken
};
