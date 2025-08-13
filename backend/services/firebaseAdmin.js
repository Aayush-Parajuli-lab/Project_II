import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let app;

function initializeFirebaseAdmin() {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️ Firebase Admin not fully configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    return null;
  }

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  } catch (e) {
    if (!admin.apps.length) {
      throw e;
    }
  }

  return app;
}

export function getFirebaseAuth() {
  const a = initializeFirebaseAdmin();
  if (!a) return null;
  return admin.auth();
}