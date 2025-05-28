// src/lib/firebaseAdmin.ts
import admin, { type App } from 'firebase-admin';
import type { Auth as AdminAuth } from 'firebase-admin/auth';

let app: App;
let auth: AdminAuth;

if (!admin.apps.length) {
  try {
    // Option 1: If GOOGLE_APPLICATION_CREDENTIALS env var is set (points to your service account JSON file)
    // This is the recommended way for local development and many cloud environments.
    app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (e: any) {
    // Option 2: Fallback if applicationDefault fails (e.g., env var not set, or specific base64/JSON string is provided)
    // This part might need adjustment based on how you store your service account key in .env.local
    // For example, if you store the entire JSON as a string:
    // const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    // if (serviceAccountString) {
    //   const serviceAccount = JSON.parse(serviceAccountString);
    //   app = admin.initializeApp({
    //     credential: admin.credential.cert(serviceAccount),
    //   });
    // } else {
    //   console.error('Firebase Admin SDK initialization failed. Service account credentials not found or invalid.', e);
    //   // Depending on your error handling strategy, you might throw an error here or let the app continue in a degraded state.
    // }
    console.error('Firebase Admin SDK initialization failed. Ensure GOOGLE_APPLICATION_CREDENTIALS is set or provide service account details in environment variables.', e.message);
    // If app is still undefined here, auth will be undefined, and API routes requiring it will fail.
  }
} else {
  app = admin.apps[0] as App;
}

// @ts-ignore
auth = admin.auth(app);


// @ts-ignore
export { auth as adminAuth, app as adminApp };
