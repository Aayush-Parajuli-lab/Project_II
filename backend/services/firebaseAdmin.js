import dotenv from 'dotenv';

dotenv.config();

let app;
let adminModule = null;

async function getAdminModule() {
  if (adminModule) return adminModule;
  try {
    // Dynamic import so the server doesn't crash if firebase-admin isn't installed
    // eslint-disable-next-line no-undef
    const mod = await import('firebase-admin');
    adminModule = mod.default || mod;
    return adminModule;
  } catch (e) {
    console.warn('⚠️ firebase-admin is not installed. Skipping Firebase Admin initialization.');
    return null;
  }
}

async function initializeFirebaseAdmin() {
  if (app) return app;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️ Firebase Admin not fully configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.');
    return null;
  }

  const admin = await getAdminModule();
  if (!admin) return null;

  try {
    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  } catch (e) {
    // Ignore already-initialized error in ESM
  }

  return app;
}

export async function getFirebaseAuth() {
  const a = await initializeFirebaseAdmin();
  if (!a) return null;
  const admin = await getAdminModule();
  return admin ? admin.auth() : null;
}