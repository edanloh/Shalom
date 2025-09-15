// polyfills.js - Simple AWS Cognito polyfills
import "react-native-get-random-values";

// Shim for global
if (typeof global === 'undefined') {
  var global = globalThis;
}

// Process shim
if (typeof global.process === 'undefined') {
  global.process = { env: {}, version: '' };
}

// Buffer shim
import { Buffer } from "@craftzdog/react-native-buffer";
if (!global.Buffer) {
  global.Buffer = Buffer;
}

// Crypto shim for AWS Cognito
const getRandomValues = (arr) => {
  if (global.crypto && global.crypto.getRandomValues) {
    return global.crypto.getRandomValues(arr);
  }
  // Fallback using the polyfill
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
};

if (!global.crypto) {
  global.crypto = {};
}

if (!global.crypto.getRandomValues) {
  global.crypto.getRandomValues = getRandomValues;
}

console.log("AWS Cognito polyfills loaded");
