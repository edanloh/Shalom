/**
 * Environment variables configuration
 * All environment variables must be prefixed with VITE_ to be exposed to the client
 */

export const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION;
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
export const AUTH_STORAGE_KEY = import.meta.env.AUTH_STORAGE_KEY;
