import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

interface ResolvedFirebaseConfig extends FirebaseOptions {
  firestoreDatabaseId?: string;
}

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);

export const resolvedFirebaseConfig: ResolvedFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  firestoreDatabaseId:
    env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId,
};

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(resolvedFirebaseConfig) : getApps()[0];

export const firebaseAuth: Auth = getAuth(firebaseApp);

if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
  void setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {
    // Non-fatal in private browsing / headless test runners
  });
}

// Named database configured by firebase-applet-config.json (critical for production reads/writes)
export const firestoreDb: Firestore = resolvedFirebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, resolvedFirebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = firebaseAuth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{
  reachable: boolean;
  offline: boolean;
}> {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    return { reachable: true, offline: false };
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes('the client is offline')) {
      console.error('Firestore client is offline. Verify Firebase configuration and network state.');
      return { reachable: false, offline: true };
    }
    // Permission denied or missing test doc still confirms server reachability
    return { reachable: true, offline: false };
  }
}
