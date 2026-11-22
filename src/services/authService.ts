import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { firebaseAuth } from './firebaseClient';

export interface AuthUserSummary {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  emailVerified: boolean;
  providerIds: string[];
}

export interface AuthActionResult {
  ok: boolean;
  user?: AuthUserSummary;
  redirecting?: boolean;
  verificationSent?: boolean;
  requiresRecentLogin?: boolean;
  providerNotEnabled?: boolean;
  error?: string;
}

export function mapFirebaseUser(user: User): AuthUserSummary {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Usuário FINACE SAVIO BAIA IA',
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    emailVerified: Boolean(user.emailVerified),
    providerIds: user.providerData.map((p) => p.providerId),
  };
}

export function translateFirebaseAuthError(err: unknown): {
  message: string;
  providerNotEnabled?: boolean;
  requiresRecentLogin?: boolean;
} {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return { message: 'E-mail inválido. Verifique o endereço digitado.' };
    case 'auth/user-disabled':
      return { message: 'Esta conta foi desativada no Firebase Authentication.' };
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return { message: 'E-mail ou senha incorretos.' };
    case 'auth/email-already-in-use':
      return { message: 'Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.' };
    case 'auth/weak-password':
      return { message: 'A senha deve ter pelo menos 6 caracteres.' };
    case 'auth/too-many-requests':
      return { message: 'Muitas tentativas seguidas. Aguarde alguns instantes antes de tentar novamente.' };
    case 'auth/network-request-failed':
      return { message: 'Sem conexão com a internet para autenticar no momento.' };
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return { message: 'Login com Google cancelado antes da conclusão.' };
    case 'auth/popup-blocked':
      return { message: 'O navegador bloqueou a janela do Google. Permita pop-ups para continuar.' };
    case 'auth/unauthorized-domain':
      return {
        message:
          'Este domínio ainda não está autorizado no Firebase Auth. Adicione o endereço em Authentication -> Settings -> Authorized domains no Firebase Console.',
      };
    case 'auth/operation-not-supported-in-this-environment':
      return {
        message:
          'Este navegador móvel não permite pop-up de login. Abra o link diretamente no Chrome ou Safari.',
      };
    case 'auth/operation-not-allowed':
      return {
        providerNotEnabled: true,
        message:
          'O método E-mail/Senha ainda não foi ativado no Firebase Console deste projeto. Use "Entrar com Google" ou ative Email/Password em Authentication -> Sign-in method.',
      };
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return {
        message:
          'Chave de API do Firebase inválida ou desatualizada. Verifique firebase-applet-config.json e recarregue o aplicativo.',
      };
    case 'auth/requires-recent-login':
      return {
        requiresRecentLogin: true,
        message: 'Por segurança, faça login novamente antes de excluir sua conta.',
      };
    default:
      return {
        message:
          err instanceof Error && err.message
            ? err.message
            : 'Não foi possível concluir a autenticação. Tente novamente.',
      };
  }
}

export function subscribeToAuthState(
  onChange: (user: AuthUserSummary | null) => void
): () => void {
  return onAuthStateChanged(firebaseAuth, (rawUser) => {
    onChange(rawUser ? mapFirebaseUser(rawUser) : null);
  });
}

export async function signInWithEmail(email: string, password: string): Promise<AuthActionResult> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) {
    return { ok: false, error: 'Informe seu e-mail e senha.' };
  }
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
    return { ok: true, user: mapFirebaseUser(cred.user) };
  } catch (err) {
    const mapped = translateFirebaseAuthError(err);
    return { ok: false, ...mapped, error: mapped.message };
  }
}

export async function signUpWithEmail(params: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const cleanName = params.name.trim();
  const cleanEmail = params.email.trim();
  if (!cleanName || !cleanEmail || params.password.length < 6) {
    return {
      ok: false,
      error: 'Informe seu nome, um e-mail válido e senha com pelo menos 6 caracteres.',
    };
  }
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, params.password);
    await updateProfile(cred.user, { displayName: cleanName.slice(0, 80) });
    let verificationSent = false;
    try {
      await sendEmailVerification(cred.user);
      verificationSent = true;
    } catch {
      verificationSent = false;
    }
    return {
      ok: true,
      verificationSent,
      user: mapFirebaseUser(cred.user),
    };
  } catch (err) {
    const mapped = translateFirebaseAuthError(err);
    return { ok: false, ...mapped, error: mapped.message };
  }
}

export async function signInWithGoogleAuth(): Promise<AuthActionResult> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(firebaseAuth, provider);
    return { ok: true, user: mapFirebaseUser(cred.user) };
  } catch (err) {
    const mapped = translateFirebaseAuthError(err);
    return { ok: false, ...mapped, error: mapped.message };
  }
}

export async function sendPasswordReset(email: string): Promise<AuthActionResult> {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return { ok: false, error: 'Informe o e-mail da conta para enviar o link de recuperação.' };
  }
  try {
    await sendPasswordResetEmail(firebaseAuth, cleanEmail);
    return { ok: true };
  } catch (err) {
    const mapped = translateFirebaseAuthError(err);
    return { ok: false, ...mapped, error: mapped.message };
  }
}

export async function resendVerificationEmail(): Promise<AuthActionResult> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return { ok: false, error: 'Nenhum usuário autenticado.' };
  }
  try {
    await sendEmailVerification(user);
    return { ok: true, verificationSent: true, user: mapFirebaseUser(user) };
  } catch (err) {
    const mapped = translateFirebaseAuthError(err);
    return { ok: false, error: mapped.message };
  }
}

export async function reloadCurrentAuthUser(): Promise<AuthUserSummary | null> {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  await reload(user);
  return firebaseAuth.currentUser ? mapFirebaseUser(firebaseAuth.currentUser) : null;
}

export async function signOutAuthUser(): Promise<void> {
  await signOut(firebaseAuth);
}

export async function deleteCurrentFirebaseUser(): Promise<AuthActionResult> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return { ok: false, error: 'Nenhum usuário autenticado para excluir.' };
  }
  try {
    await deleteUser(user);
    return { ok: true };
  } catch (err) {
    const mapped = translateFirebaseAuthError(err);
    return { ok: false, ...mapped, error: mapped.message };
  }
}
