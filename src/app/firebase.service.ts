import { Injectable, signal } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, EmailAuthProvider, signInWithPopup, signInWithCredential, signOut, deleteUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInAnonymously, linkWithCredential, updateProfile, User, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp, getDocFromServer, Firestore, deleteDoc, increment } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export let app: FirebaseApp;
export let auth: Auth;
export let db: Firestore;

if (typeof window !== 'undefined') {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export interface RoomPlayer {
  uid: string;
  name: string;
  score: number;
  status: 'playing' | 'gameover' | 'waiting';
}

export interface SabotageEvent {
  type: 'email_wall' | 'freeze';
  senderName: string;
  targetId: string;
  timestamp: number;
}

export interface MultiplayerRoom {
  roomId: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  gameMode: string;
  players: Record<string, RoomPlayer>;
  sabotages?: Record<string, SabotageEvent>;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  title?: string;
  score: number;
  mode: string;
  timestamp: unknown;
}

export interface Challenge {
  id?: string;
  creatorId: string;
  creatorName: string;
  targetScore: number;
  gameMode: string;
  createdAt: unknown;
}

export interface UserProfile {
  displayName: string;
  avatarId?: string;
  highestScore_endless?: number;
  highestScore_championship?: number;
  highestScore_takeover?: number;
  highestScore_quiet?: number;
  lifetimeSynergy?: number;
  unlockedSkills?: string[];
  achievements?: string[];
  streakCount?: number;
  streakLastDay?: string; // 'YYYY-MM-DD' (UTC)
  seasonWins?: string[];  // e.g. ['2026-W04|endless|1']
  bountyEscrow?: number;  // synergy held in active bounties
  currentCompanyId?: string;
  currentCompanyName?: string;
}

export interface Bounty {
  id?: string;
  creatorId: string;
  creatorName: string;
  mode: string;
  targetScore: number;
  reward: number;     // SYN
  status: 'open' | 'claimed' | 'expired';
  claimerId?: string;
  claimerName?: string;
  createdAt: unknown;
  expiresAt: number;  // ms epoch
}

export interface Company {
  id?: string;
  name: string;
  motto?: string;
  ownerId: string;
  ownerName: string;
  joinCode: string;
  memberCount: number;
  bannedIds?: string[];
  channelId?: string;
  channelName?: string;
  createdAt?: unknown;
}

export interface CompanyMember {
  uid: string;
  displayName: string;
  avatarId?: string;
  role: 'ceo' | 'employee';
  lifetimeSynergy?: number;
  joinedAt?: unknown;
}

export interface WatercoolerChannel {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  createdAt: unknown;
}

export interface WatercoolerPost {
  id: string;
  authorId: string;
  authorName: string;
  /** Optional thread title — added in v16. Older posts only have `content`. */
  title?: string;
  content: string;
  channel: string;
  upvotes: number;
  /** Number of replies — denormalised counter, kept in sync by `replyToWatercoolerPost`. */
  replyCount?: number;
  createdAt: unknown;
}

/** A single reply on a Watercooler thread. Stored in the flat top-level
 *  `watercooler_replies` collection (NOT a subcollection — this lets us reuse
 *  the same Firestore rules block as `watercooler` posts without nesting). */
export interface WatercoolerReply {
  id: string;
  /** The parent thread's id (`watercooler/{threadId}`). */
  threadId: string;
  authorId: string;
  authorName: string;
  content: string;
  /** Optional list of @-mentioned user handles (lower-cased, no `@` prefix). */
  mentions?: string[];
  createdAt: unknown;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  user = signal<User | null>(null);
  authReady = signal<boolean>(false);
  
  constructor() {
    if (typeof window !== 'undefined') {
      onAuthStateChanged(auth, (u) => {
        this.user.set(u);
        this.authReady.set(true);
      });

      // Test connection as required
      this.testConnection();
    } else {
      this.authReady.set(true);
    }
  }

  async testConnection() {
    if (typeof window === 'undefined') return;
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  }

  async loginWithGoogle(handle?: string) {
    try {
      let firebaseUser: User;

      if (Capacitor.isNativePlatform()) {
        // Native (Capacitor / Android APK): use the native Google Sign-In plugin,
        // then exchange the returned ID token for a Firebase Web SDK session.
        const native = await FirebaseAuthentication.signInWithGoogle();
        if (!native.credential?.idToken) {
          throw new Error('Native Google Sign-In returned no ID token');
        }
        const credential = GoogleAuthProvider.credential(
          native.credential.idToken,
          // accessToken not always provided; signInWithCredential accepts undefined.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (native.credential as any).accessToken
        );
        const result = await signInWithCredential(auth, credential);
        firebaseUser = result.user;
      } else {
        // Web: original popup flow, behaviour unchanged.
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        firebaseUser = result.user;
      }

      // Ensure user profile snippet exists
      const userRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          displayName: handle || 'Anonymous Drone',
          createdAt: serverTimestamp(),
          highestScore_endless: 0,
          highestScore_championship: 0,
          highestScore_takeover: 0,
          highestScore_quiet: 0,
          lifetimeSynergy: 0,
          unlockedSkills: []
        });
      } else if (handle && snap.data()['displayName'] !== handle) {
        // Update their display name if they provide a new handle
        await setDoc(userRef, { displayName: handle }, { merge: true });
      }
    } catch (err) {
      console.error('Login Failed', err);
      throw err;
    }
  }

  /**
   * Email + password registration. Creates the Firebase Auth user, sets the
   * displayName on the Auth record, sends a verification email, and writes
   * the Firestore profile snippet (same shape as Google sign-in).
   *
   * Returns { user, verificationSent } on success.
   * Throws the raw Firebase error on failure so the caller can map error.code
   * to a friendly UX message.
   */
  async signUpWithEmail(email: string, password: string, handle: string): Promise<{ user: User; verificationSent: boolean }> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = cred.user;
    if (handle && handle.trim()) {
      try { await updateProfile(user, { displayName: handle.trim() }); } catch { /* non-fatal */ }
    }
    let verificationSent = false;
    try {
      await sendEmailVerification(user);
      verificationSent = true;
    } catch (e) {
      console.warn('Verification email failed', e);
    }
    // Seed Firestore profile (same shape as Google flow).
    await setDoc(doc(db, 'users', user.uid), {
      displayName: (handle || user.displayName || 'Anonymous Drone').trim(),
      email: user.email || '',
      createdAt: serverTimestamp(),
      highestScore_endless: 0,
      highestScore_championship: 0,
      highestScore_takeover: 0,
      highestScore_quiet: 0,
      lifetimeSynergy: 0,
      unlockedSkills: []
    }, { merge: true });
    return { user, verificationSent };
  }

  /** Email + password sign-in. Throws raw Firebase error on failure. */
  async signInWithEmail(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  }

  /** Send a password-reset email. Throws raw Firebase error on failure. */
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  /** Re-send the verification email for the currently signed-in user. */
  async resendVerificationEmail(): Promise<void> {
    const u = this.user();
    if (!u) throw new Error('not-signed-in');
    await sendEmailVerification(u);
  }

  /** True if the current user signed in with email/password and hasn't verified yet. */
  isEmailUnverified(): boolean {
    const u = this.user();
    if (!u) return false;
    const isEmailProvider = (u.providerData || []).some(p => p?.providerId === 'password');
    return isEmailProvider && !u.emailVerified;
  }

  /** True if the current user is a Firebase anonymous (Guest) user. */
  isGuest(): boolean {
    return !!this.user()?.isAnonymous;
  }

  /**
   * Guest mode — Firebase anonymous auth. Creates a throwaway uid that
   * persists across reloads and works with all Firestore rules that allow
   * `request.auth != null`. Profile is seeded with a "Guest_xxxx" handle
   * that the user can change later or upgrade via linkGuestTo*.
   */
  async signInAsGuest(handle?: string): Promise<User> {
    const cred = await signInAnonymously(auth);
    const user = cred.user;
    const finalHandle = (handle || `Guest_${user.uid.slice(0, 5).toUpperCase()}`).trim();
    if (finalHandle) {
      try { await updateProfile(user, { displayName: finalHandle }); } catch { /* non-fatal */ }
    }
    await setDoc(doc(db, 'users', user.uid), {
      displayName: finalHandle,
      isGuest: true,
      createdAt: serverTimestamp(),
      highestScore_endless: 0,
      highestScore_championship: 0,
      highestScore_takeover: 0,
      highestScore_quiet: 0,
      lifetimeSynergy: 0,
      unlockedSkills: []
    }, { merge: true });
    return user;
  }

  /**
   * Upgrade a Guest (anonymous) account to a permanent email+password account
   * WITHOUT losing their progress (uid stays the same, profile survives).
   * Returns the upgraded user. Sends a verification email.
   * Common error codes: auth/credential-already-in-use, auth/email-already-in-use.
   */
  async linkGuestToEmail(email: string, password: string): Promise<User> {
    const u = this.user();
    if (!u || !u.isAnonymous) throw new Error('not-a-guest');
    const credential = EmailAuthProvider.credential(email.trim(), password);
    const result = await linkWithCredential(u, credential);
    try { await sendEmailVerification(result.user); } catch { /* non-fatal */ }
    // Drop the isGuest flag from Firestore.
    await setDoc(doc(db, 'users', result.user.uid), { isGuest: false, email: result.user.email || '' }, { merge: true });
    return result.user;
  }

  /**
   * Upgrade a Guest account to Google sign-in. Same uid is preserved.
   * Falls back to a fresh Google sign-in if linking fails because the
   * Google account already exists in Firebase (auth/credential-already-in-use)
   * — in that case the guest's progress is unfortunately lost (Firebase
   * limitation). The caller should warn the user before triggering this.
   */
  async linkGuestToGoogle(): Promise<User> {
    const u = this.user();
    if (!u || !u.isAnonymous) throw new Error('not-a-guest');
    let credential;
    if (Capacitor.isNativePlatform()) {
      const native = await FirebaseAuthentication.signInWithGoogle();
      if (!native.credential?.idToken) throw new Error('Native Google Sign-In returned no ID token');
      credential = GoogleAuthProvider.credential(
        native.credential.idToken,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (native.credential as any).accessToken
      );
    } else {
      const provider = new GoogleAuthProvider();
      const popupResult = await signInWithPopup(auth, provider);
      credential = GoogleAuthProvider.credentialFromResult(popupResult);
      if (!credential) throw new Error('No Google credential returned');
    }
    const result = await linkWithCredential(u, credential);
    await setDoc(doc(db, 'users', result.user.uid), { isGuest: false }, { merge: true });
    return result.user;
  }

  async logout() {
    if (Capacitor.isNativePlatform()) {
      try { await FirebaseAuthentication.signOut(); } catch { /* native sign-out is best-effort */ }
    }
    await signOut(auth);
  }

  /**
   * In-app account deletion (Google Play Data Safety / Account Deletion
   * Policy, effective May 2024). Removes the user's Firestore profile
   * document and revokes their Firebase Auth record.
   *
   * Returns true on full success, false if Auth deletion needed re-auth
   * (rare — Firebase requires recent sign-in for deleteUser; in that case
   * we surface a toast asking the user to sign in again and retry).
   *
   * Note: leaderboard / watercooler entries authored by the user become
   * orphaned (authorId points to a deleted uid). Their displayName is
   * retained on those public entries by design — they were posted publicly
   * and the documents themselves are not personal data once the account
   * is gone. This matches the disclosure in the privacy policy.
   */
  async deleteAccount(): Promise<{ success: boolean; needsReauth?: boolean; error?: string }> {
    const u = this.user();
    if (!u) return { success: false, error: 'Not signed in.' };

    try {
      // 1. Erase the user's profile document. Bounty escrow / company role
      //    cleanup is best-effort: orphaning is acceptable, the profile doc
      //    holds the only PII we own.
      try { await deleteDoc(doc(db, 'users', u.uid)); } catch (e) { console.warn('profile delete failed', e); }

      // 2. Revoke Firebase Auth identity.
      await deleteUser(u);

      // 3. Native Google session cleanup (best-effort).
      if (Capacitor.isNativePlatform()) {
        try { await FirebaseAuthentication.signOut(); } catch { /* ignore */ }
      }

      this.handleCache.clear();
      return { success: true };
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/requires-recent-login') {
        return { success: false, needsReauth: true, error: 'Please sign in again, then retry deletion.' };
      }
      console.error('Account deletion failed', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: msg };
    }
  }

  isAdmin(): boolean {
    const email = this.user()?.email;
    return email === 'gourav.k.24@gmail.com' || email === '24gourav11@gmail.com';
  }

  private handleCache = new Map<string, string>();

  async getHandle(): Promise<string> {
    const u = this.user();
    if (!u) return 'Anonymous Drone';
    if (this.handleCache.has(u.uid)) return this.handleCache.get(u.uid)!;
    const profile = await this.getUserProfile();
    const name = profile?.displayName || 'Anonymous Drone';
    this.handleCache.set(u.uid, name);
    return name;
  }

  async updateHandle(newHandle: string) {
    const u = this.user();
    if (!u) return;
    await setDoc(doc(db, 'users', u.uid), { displayName: newHandle }, { merge: true });
    this.handleCache.set(u.uid, newHandle);
  }

  async updateAvatar(avatarId: string) {
    const u = this.user();
    if (!u) return;
    await setDoc(doc(db, 'users', u.uid), { avatarId }, { merge: true });
  }

  async submitScore(score: number, mode: string, currentTitle?: string) {
    const u = this.user();
    if (!u) return;

    try {
      // 1. Update personal best in users doc
      const userRef = doc(db, 'users', u.uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};
      
      const scoreKey = `highestScore_${mode}`;
      const isNewBest = score > (data[scoreKey] || 0);

      const updates: Record<string, unknown> = {};
      if (isNewBest) {
        updates[scoreKey] = score;
      }
      
      if (Object.keys(updates).length > 0) {
        // use setDoc with merge to safely update
        await setDoc(userRef, updates, { merge: true });
      }

      // 2. Add to global leaderboard collection
      const scoreId = `${u.uid}_${mode}_${Date.now()}`;
      const handle = await this.getHandle();
      const payload: LeaderboardEntry = {
        userId: u.uid,
        displayName: handle,
        score: score,
        mode: mode,
        timestamp: serverTimestamp()
      };
      
      if (currentTitle) {
          payload.title = currentTitle;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await setDoc(doc(db, `leaderboards/${mode}/entries`, scoreId), payload as any);
      
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }

  async getLeaderboard(mode: string): Promise<LeaderboardEntry[]> {
    try {
      const isAdm = this.isAdmin();
      const q = query(
        collection(db, `leaderboards/${mode}/entries`),
        orderBy('score', 'desc'),
        limit(isAdm ? 100 : 10)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as LeaderboardEntry);
    } catch (err) {
      console.error('Failed to get leaderboard:', err);
      return [];
    }
  }

  async getGlobalLeaderboard(): Promise<(LeaderboardEntry & {level: number, globalTitle?: string})[]> {
    try {
      if (!this.user()) {
         return []; // Require auth for users collection
      }
      const isAdm = this.isAdmin();
      const q = query(
        collection(db, 'users'),
        orderBy('lifetimeSynergy', 'desc'),
        limit(isAdm ? 1000 : 100) // Support up to 1000 levels
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data();
        const score = data['lifetimeSynergy'] || 0;
        
        // Exponential Math: taking 1,000,000s of points to reach high levels.
        const level = Math.floor(Math.sqrt(score / 150)) + 1;
        
        let globalTitle = 'Unpaid Intern';
        if (level >= 300) globalTitle = 'Corporate Overlord';
        else if (level >= 200) globalTitle = 'Chief Networking Officer';
        else if (level >= 150) globalTitle = 'Executive VP';
        else if (level >= 100) globalTitle = 'VP of Synergy';
        else if (level >= 75) globalTitle = 'Senior Director';
        else if (level >= 50) globalTitle = 'Middle Manager';
        else if (level >= 35) globalTitle = 'Shift Supervisor';
        else if (level >= 20) globalTitle = 'Junior Associate';
        else if (level >= 10) globalTitle = 'Coffee Fetcher';

        return {
           userId: d.id,
           displayName: data['displayName'] || 'Corporate Drone',
           score: score,
           mode: 'global',
           level: level,
           globalTitle: globalTitle,
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           timestamp: data['createdAt'] || serverTimestamp() as any
        };
      });
    } catch (err) {
      console.error('Failed to get global leaderboard:', err);
      return [];
    }
  }

  async syncMeta(lifetimeSynergy: number, unlockedSkills: string[], achievements: string[] = []) {
    const u = this.user();
    if (!u) return;
    try {
      const userRef = doc(db, 'users', u.uid);
      await setDoc(userRef, {
        lifetimeSynergy,
        unlockedSkills,
        achievements
      }, { merge: true });
    } catch (error) {
      console.error('Failed to sync meta to cloud:', error);
    }
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const u = this.user();
    if (!u) return null;
    try {
      const snap = await getDocFromServer(doc(db, 'users', u.uid));
      if (snap.exists()) {
        return snap.data() as UserProfile;
      }
      return null;
    } catch (err) {
      console.error('Failed to get user profile', err);
      return null;
    }
  }

  async createChallenge(score: number, mode: string): Promise<string | null> {
    const u = this.user();
    
    try {
      if (!u) throw new Error("Not logged in (using local fallback)");
      const handle = await this.getHandle();
      const challengeId = `${u.uid}_${Date.now()}`;
      const docData = {
        creatorId: u.uid,
        creatorName: handle.substring(0, 90),
        targetScore: Math.max(0, Math.floor(score || 0)),
        gameMode: String(mode).substring(0, 20),
        createdAt: serverTimestamp()
      };
      console.log('Creating challenge:', challengeId, docData);
      await setDoc(doc(db, 'challenges', challengeId), docData);
      return challengeId;
    } catch (err) {
      console.error('Failed to create challenge:', err);
      // Fallback: If firestore write fails or not logged in, we generate a local fake ID
      const fallbackId = `local_${Date.now()}_${score}_${mode}`;
      return fallbackId;
    }
  }

  async getChallenge(challengeId: string): Promise<Challenge | null> {
    if (challengeId.startsWith('local_')) {
        const parts = challengeId.split('_');
        const score = parseInt(parts[2] || '1000', 10);
        const mode = parts[3] || 'endless';
        return {
           id: challengeId,
           creatorId: 'anon',
           creatorName: 'Anonymous Executive',
           targetScore: score,
           gameMode: mode,
           createdAt: serverTimestamp()
        } as Challenge;
    }
    try {
      const snap = await getDocFromServer(doc(db, 'challenges', challengeId));
      if (snap.exists()) {
         const data = snap.data() as Challenge;
         data.id = snap.id;
         return data;
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch challenge:', err);
      return null;
    }
  }

  // --- MULTIPLAYER ROOMS ---
  async createRoom(roomId: string, mode: string): Promise<boolean> {
     const u = this.user();
     if (!u) return false;
     try {
       const handle = await this.getHandle();
       await setDoc(doc(db, 'multiplayer_rooms', roomId), {
          hostId: u.uid,
          status: 'waiting',
          gameMode: mode,
          players: {
             [u.uid]: { uid: u.uid, name: handle, score: 0, status: 'waiting' }
          },
          createdAt: serverTimestamp()
       });
       return true;
     } catch (err) {
       console.error("Create Room failed:", err);
       return false;
     }
  }

  async joinRoom(roomId: string): Promise<boolean> {
     const u = this.user();
     if (!u) return false;
     try {
       const handle = await this.getHandle();
       await setDoc(doc(db, 'multiplayer_rooms', roomId), {
          players: {
             [u.uid]: { uid: u.uid, name: handle, score: 0, status: 'waiting' }
          }
       }, { merge: true });
       return true;
     } catch (err) {
       console.error("Join Room Failed:", err);
       return false;
     }
  }

  async updateRoomPlayer(roomId: string, score: number, status: 'playing' | 'gameover' | 'waiting') {
     const u = this.user();
     if (!u) return;
     try {
       const handle = await this.getHandle();
       await setDoc(doc(db, 'multiplayer_rooms', roomId), {
          players: {
             [u.uid]: { uid: u.uid, name: handle, score, status }
          }
       }, { merge: true });
     } catch (err) {
       // Silent fail for score updates to prevent log spam
       console.debug("Silent fail room update", err);
     }
  }

  async startRoomMatch(roomId: string) {
     try {
       await setDoc(doc(db, 'multiplayer_rooms', roomId), {
          status: 'playing'
       }, { merge: true });
     } catch (err) {
       console.error("Start room match failed", err);
     }
  }

  async sendSabotage(roomId: string, targetId: string, type: 'email_wall' | 'freeze') {
     const u = this.user();
     if (!u) return;
     const sabId = `${u.uid}_${Date.now()}`;
     try {
       const handle = await this.getHandle();
       await setDoc(doc(db, 'multiplayer_rooms', roomId), {
          sabotages: {
             [sabId]: {
                type,
                targetId,
                senderName: handle,
                timestamp: Date.now()
             }
          }
       }, { merge: true });
     } catch (err) {
       console.error("Send sabotage failed", err);
     }
  }

  // --- WATERCOOLER ---
  async getWatercoolerChannels(): Promise<WatercoolerChannel[]> {
      try {
         const q = query(collection(db, 'watercooler_channels'), orderBy('createdAt', 'desc'), limit(100));
         const snap = await getDocs(q);
         return snap.docs.map(d => ({ id: d.id, ...d.data() } as WatercoolerChannel));
      } catch (err) {
         console.error("Failed to get watercooler channels", err);
         return [];
      }
  }

  async createWatercoolerChannel(name: string, description: string) {
     const u = this.user();
     if (!u) throw new Error("Must be logged in to create a channel");
     
     // Normalize name (alphanumeric and dashes/underscores)
     const normalizedName = name.replace(/[^a-zA-Z0-9_\-]/g, '').substring(0, 30);
     if (!normalizedName) throw new Error("Invalid channel name");
     
     const id = `channel_${Date.now()}_${Math.floor(Math.random()*1000)}`;
     await setDoc(doc(db, 'watercooler_channels', id), {
        name: normalizedName,
        description: description.substring(0, 200),
        creatorId: u.uid,
        createdAt: serverTimestamp()
     });
     return normalizedName;
  }

  async deleteWatercoolerChannel(id: string) {
     const u = this.user();
     if (!u) return false;
     try {
        await deleteDoc(doc(db, 'watercooler_channels', id));
        return true;
     } catch (err) {
        console.error("Failed to delete channel", err);
        return false;
     }
  }

  async getWatercoolerPosts(channel = 'general'): Promise<WatercoolerPost[]> {
     try {
        const q = query(
           collection(db, 'watercooler'),
           orderBy('createdAt', 'desc'),
           limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs
           .map(d => ({ id: d.id, ...d.data() } as WatercoolerPost))
           .filter(p => p.channel === channel);
     } catch (err) {
        console.error("Failed to get watercooler posts", err);
        return [];
     }
  }

  async createWatercoolerPost(content: string, channel = 'general', isAnonymous = false, title?: string, mentions: string[] = []) {
     const u = this.user();
     if (!u) throw new Error("Must be logged in to post");
     const profile = await this.getUserProfile();
     const name = isAnonymous ? 'Anonymous Drone' : (profile?.displayName || u.displayName || 'Anonymous Drone');
     const postId = `post_${Date.now()}_${Math.floor(Math.random()*1000)}`;
     // We strip undefined values (Firestore rejects them).
     const payload: Record<string, unknown> = {
        authorId: u.uid,
        authorName: name,
        content,
        channel,
        upvotes: 0,
        replyCount: 0,
        createdAt: serverTimestamp()
     };
     if (title && title.trim()) payload['title'] = title.trim().slice(0, 120);
     if (mentions.length) payload['mentions'] = mentions.slice(0, 20);
     await setDoc(doc(db, 'watercooler', postId), payload);
  }

  /** List replies for a given thread, oldest-first, capped at 200.
   *  Uses a top-level collection (not subcollection) so existing Firestore
   *  rules for `watercooler_replies` work without nested-rule changes. */
  async getWatercoolerReplies(threadId: string): Promise<WatercoolerReply[]> {
     try {
        const q = query(
           collection(db, 'watercooler_replies'),
           where('threadId', '==', threadId),
           orderBy('createdAt', 'asc'),
           limit(200)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as WatercoolerReply));
     } catch (err) {
        // Most common cause: missing composite index. Try the simpler in-memory sort fallback.
        console.warn("Indexed reply query failed, falling back:", err);
        try {
           const q2 = query(
              collection(db, 'watercooler_replies'),
              where('threadId', '==', threadId),
              limit(200)
           );
           const snap2 = await getDocs(q2);
           const list = snap2.docs.map(d => ({ id: d.id, ...d.data() } as WatercoolerReply));
           list.sort((a, b) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const at = (a.createdAt as any)?.toMillis?.() ?? 0;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const bt = (b.createdAt as any)?.toMillis?.() ?? 0;
              return at - bt;
           });
           return list;
        } catch (err2) {
           console.error("Reply query failed twice:", err2);
           return [];
        }
     }
  }

  /** Count replies for a thread (best-effort, used for thread-card badges). */
  async countWatercoolerReplies(threadId: string): Promise<number> {
     try {
        const q = query(
           collection(db, 'watercooler_replies'),
           where('threadId', '==', threadId),
           limit(500)
        );
        const snap = await getDocs(q);
        return snap.size;
     } catch {
        return 0;
     }
  }

  /** Append a reply. Stored in the FLAT top-level `watercooler_replies` collection
   *  (not as a subcollection of the thread) — this avoids rule-nesting issues that
   *  were causing silent permission-denied failures on reply writes.
   *
   *  Returns the saved reply. We DON'T touch the parent post's replyCount on the
   *  server (writes by non-authors would fail typical "owner-only" rules).
   *  Counts are computed on demand by `countWatercoolerReplies`. */
  async replyToWatercoolerPost(
    threadId: string,
    content: string,
    isAnonymous = false,
    mentions: string[] = [],
  ): Promise<WatercoolerReply> {
     const u = this.user();
     if (!u) throw new Error("Must be logged in to reply");
     const profile = await this.getUserProfile();
     const name = isAnonymous
        ? 'Anonymous Drone'
        : (profile?.displayName || u.displayName || 'Anonymous Drone');
     const replyId = `reply_${Date.now()}_${Math.floor(Math.random()*1000)}`;
     const replyPayload: Record<string, unknown> = {
        threadId,
        authorId: u.uid,
        authorName: name,
        content,
        createdAt: serverTimestamp(),
     };
     if (mentions.length) replyPayload['mentions'] = mentions.slice(0, 20);
     await setDoc(doc(db, 'watercooler_replies', replyId), replyPayload);
     return { id: replyId, ...replyPayload } as WatercoolerReply;
  }

  async upvoteWatercoolerPost(postId: string, currentUpvotes: number) {
     const u = this.user();
     if (!u) return;
     await setDoc(doc(db, 'watercooler', postId), {
        upvotes: currentUpvotes + 1
     }, { merge: true });
  }

  async getRecentWatercoolerPostsAnyChannel(n = 5): Promise<WatercoolerPost[]> {
    try {
      const q = query(collection(db, 'watercooler'), orderBy('createdAt', 'desc'), limit(n));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WatercoolerPost));
    } catch (err) {
      console.warn('hero watercooler fetch failed', err);
      return [];
    }
  }

  // ---------- DAILY STREAK ----------
  /** Returns the streak count after rolling for today. */
  async tickStreak(): Promise<{ count: number; rolled: boolean }> {
     const u = this.user();
     if (!u) return { count: 0, rolled: false };
     try {
       const ref = doc(db, 'users', u.uid);
       const snap = await getDoc(ref);
       const data = snap.exists() ? snap.data() : {};
       const today = utcDayKey();
       const last = data['streakLastDay'] || '';
       const cur = data['streakCount'] || 0;
       if (last === today) return { count: cur, rolled: false };
       const yesterday = utcDayKey(Date.now() - 86400000);
       const next = (last === yesterday) ? cur + 1 : 1;
       await setDoc(ref, { streakCount: next, streakLastDay: today }, { merge: true });
       return { count: next, rolled: true };
     } catch (err) {
       console.warn('Streak tick failed', err);
       return { count: 0, rolled: false };
     }
  }

  // ---------- WEEKLY SEASONS ----------
  /** Filter recent leaderboard scores to current week (Mon 00:00 UTC). */
  async getCurrentSeasonLeaderboard(mode: string): Promise<LeaderboardEntry[]> {
     try {
       const all = await this.getLeaderboard(mode);
       const weekStart = currentWeekStartMs();
       return all.filter(e => {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const ts = (e.timestamp as any)?.toMillis ? (e.timestamp as any).toMillis() : 0;
         return ts >= weekStart;
       });
     } catch (err) {
       console.error('season leaderboard failed', err);
       return [];
     }
  }

  /** Read the archived top-3 of a previous season. */
  async getSeasonHallOfFame(mode: string, seasonId: string): Promise<LeaderboardEntry[]> {
     try {
       const ref = doc(db, 'seasons', `${seasonId}_${mode}`);
       const snap = await getDoc(ref);
       if (!snap.exists()) return [];
       const data = snap.data();
       return (data['top'] || []) as LeaderboardEntry[];
     } catch (err) {
       console.warn('hall of fame fetch failed', err);
       return [];
     }
  }

  /** Idempotent archive — first caller wins via deterministic doc id. */
  async archiveLastSeasonIfNeeded(mode: string): Promise<void> {
     try {
       const lastSeasonId = lastWeekIsoId();
       const archiveRef = doc(db, 'seasons', `${lastSeasonId}_${mode}`);
       const existing = await getDoc(archiveRef);
       if (existing.exists()) return;
       const all = await this.getLeaderboard(mode);
       const lastWeekStart = currentWeekStartMs() - 7 * 86400000;
       const lastWeekEnd = currentWeekStartMs();
       const inWindow = all.filter(e => {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const ts = (e.timestamp as any)?.toMillis ? (e.timestamp as any).toMillis() : 0;
         return ts >= lastWeekStart && ts < lastWeekEnd;
       });
       const top = inWindow.sort((a, b) => b.score - a.score).slice(0, 3);
       if (!top.length) return;
       await setDoc(archiveRef, {
         seasonId: lastSeasonId,
         mode,
         top,
         archivedAt: serverTimestamp(),
       });
       // Tag winners on their user docs (best-effort)
       for (let i = 0; i < top.length; i++) {
         try {
           const uref = doc(db, 'users', top[i].userId);
           const usnap = await getDoc(uref);
           const cur = (usnap.data()?.['seasonWins'] || []) as string[];
           const tag = `${lastSeasonId}|${mode}|${i + 1}`;
           if (!cur.includes(tag)) {
             await setDoc(uref, { seasonWins: [...cur, tag] }, { merge: true });
           }
         } catch { /* skip */ }
       }
     } catch (err) {
       console.warn('archive season failed', err);
     }
  }

  // ---------- BOUNTIES ----------
  async getActiveBounties(): Promise<Bounty[]> {
     try {
       const q = query(collection(db, 'bounties'), orderBy('createdAt', 'desc'), limit(50));
       const snap = await getDocs(q);
       const now = Date.now();
       return snap.docs
         .map(d => ({ id: d.id, ...d.data() } as Bounty))
         .filter(b => b.status === 'open' && b.expiresAt > now);
     } catch (err) {
       console.error('get bounties failed', err);
       return [];
     }
  }

  async createBounty(mode: string, targetScore: number, reward: number, hours: number, currentSyn: number): Promise<{ ok: boolean; reason?: string }> {
     const u = this.user();
     if (!u) return { ok: false, reason: 'Sign in required' };
     if (reward < 100) return { ok: false, reason: 'Min reward is 100 SYN' };
     if (currentSyn < reward) return { ok: false, reason: 'Not enough lifetime synergy' };
     try {
       const handle = await this.getHandle();
       const id = `bounty_${u.uid.slice(0, 8)}_${Date.now()}`;
       const expiresAt = Date.now() + Math.max(1, hours) * 3600_000;
       await setDoc(doc(db, 'bounties', id), {
         creatorId: u.uid,
         creatorName: handle,
         mode,
         targetScore,
         reward,
         status: 'open',
         createdAt: serverTimestamp(),
         expiresAt,
       });
       // Deduct from lifetime synergy as escrow (best-effort)
       const uref = doc(db, 'users', u.uid);
       const usnap = await getDoc(uref);
       const cur = (usnap.data()?.['lifetimeSynergy'] || 0) as number;
       const esc = (usnap.data()?.['bountyEscrow'] || 0) as number;
       await setDoc(uref, { lifetimeSynergy: Math.max(0, cur - reward), bountyEscrow: esc + reward }, { merge: true });
       return { ok: true };
     } catch (err) {
       console.error('create bounty failed', err);
       return { ok: false, reason: (err as Error).message };
     }
  }

  /** Try to claim bounties with a fresh score. Returns total reward awarded. */
  async claimBountiesForScore(mode: string, score: number): Promise<{ claimed: Bounty[]; total: number }> {
     const u = this.user();
     if (!u) return { claimed: [], total: 0 };
     const all = await this.getActiveBounties();
     const eligible = all.filter(b => b.mode === mode && b.creatorId !== u.uid && score >= b.targetScore);
     if (!eligible.length) return { claimed: [], total: 0 };
     const handle = await this.getHandle();
     const claimed: Bounty[] = [];
     let total = 0;
     for (const b of eligible) {
       try {
         await setDoc(doc(db, 'bounties', b.id!), {
           status: 'claimed',
           claimerId: u.uid,
           claimerName: handle,
         }, { merge: true });
         // Pay claimer
         const uref = doc(db, 'users', u.uid);
         const usnap = await getDoc(uref);
         const cur = (usnap.data()?.['lifetimeSynergy'] || 0) as number;
         await setDoc(uref, { lifetimeSynergy: cur + b.reward }, { merge: true });
         // Release creator's escrow
         const cref = doc(db, 'users', b.creatorId);
         const csnap = await getDoc(cref);
         const cesc = (csnap.data()?.['bountyEscrow'] || 0) as number;
         await setDoc(cref, { bountyEscrow: Math.max(0, cesc - b.reward) }, { merge: true });
         claimed.push(b);
         total += b.reward;
       } catch (err) {
         console.warn('claim failed for', b.id, err);
       }
     }
     return { claimed, total };
  }

  async refundExpiredBounties(): Promise<void> {
     const u = this.user();
     if (!u) return;
     try {
       const q = query(collection(db, 'bounties'), orderBy('createdAt', 'desc'), limit(50));
       const snap = await getDocs(q);
       const now = Date.now();
       for (const d of snap.docs) {
         const b = d.data() as Bounty;
         if (b.status !== 'open' || b.expiresAt > now) continue;
         if (b.creatorId !== u.uid) continue;
         await setDoc(doc(db, 'bounties', d.id), { status: 'expired' }, { merge: true });
         const uref = doc(db, 'users', u.uid);
         const usnap = await getDoc(uref);
         const cur = (usnap.data()?.['lifetimeSynergy'] || 0) as number;
         const esc = (usnap.data()?.['bountyEscrow'] || 0) as number;
         await setDoc(uref, {
           lifetimeSynergy: cur + b.reward,
           bountyEscrow: Math.max(0, esc - b.reward),
         }, { merge: true });
       }
     } catch (err) {
       console.warn('refund expired failed', err);
     }
  }

  // ---------- GHOST RACE ----------
  async getYesterdayTopScore(mode: string): Promise<{ score: number; name: string } | null> {
     try {
       const all = await this.getLeaderboard(mode);
       const dayMs = 86400000;
       const now = Date.now();
       const dayStart = Math.floor(now / dayMs) * dayMs - dayMs;
       const dayEnd = dayStart + dayMs;
       const inWindow = all.filter(e => {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const ts = (e.timestamp as any)?.toMillis ? (e.timestamp as any).toMillis() : 0;
         return ts >= dayStart && ts < dayEnd;
       });
       if (!inWindow.length) return null;
       const top = inWindow.sort((a, b) => b.score - a.score)[0];
       return { score: top.score, name: top.displayName };
     } catch {
       return null;
     }
  }

  // ---------- COMPANIES ----------
  async createCompany(name: string, motto: string): Promise<{ ok: boolean; company?: Company; reason?: string }> {
    const u = this.user();
    if (!u) return { ok: false, reason: 'Sign in required' };
    if (!name.trim()) return { ok: false, reason: 'Name required' };
    try {
      const handle = await this.getHandle();
      const joinCode = makeJoinCode();
      const id = `co_${joinCode}_${u.uid.slice(0, 6)}`;
      const channelName = makeSatiricalChannelName(name);
      const channelId = `cc_${joinCode}`;
      const company: Company = {
        name: name.trim().slice(0, 50),
        motto: motto.trim().slice(0, 120),
        ownerId: u.uid,
        ownerName: handle,
        joinCode,
        memberCount: 1,
        bannedIds: [],
        channelId,
        channelName,
      };
      await setDoc(doc(db, 'companies', id), { ...company, createdAt: serverTimestamp() });
      await setDoc(doc(db, 'companies', id, 'members', u.uid), {
        uid: u.uid,
        displayName: handle,
        role: 'ceo',
        joinedAt: serverTimestamp(),
      });
      // Tag user profile
      await setDoc(doc(db, 'users', u.uid), { currentCompanyId: id, currentCompanyName: company.name }, { merge: true });
      // Auto-create the watercooler channel (best-effort)
      try {
        await setDoc(doc(db, 'watercooler_channels', channelId), {
          name: channelName,
          description: motto || `Private channel for ${company.name} survivors.`,
          creatorId: u.uid,
          createdAt: serverTimestamp(),
        });
      } catch (err) { console.warn('channel auto-create failed', err); }
      return { ok: true, company: { ...company, id } };
    } catch (err) {
      console.error('createCompany failed', err);
      return { ok: false, reason: (err as Error).message };
    }
  }

  async findCompanyByJoinCode(joinCode: string): Promise<Company | null> {
    try {
      const code = joinCode.trim().toUpperCase();
      const q = query(collection(db, 'companies'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const match = snap.docs.find(d => (d.data()['joinCode'] || '').toUpperCase() === code);
      return match ? ({ id: match.id, ...match.data() } as Company) : null;
    } catch { return null; }
  }

  async joinCompany(joinCode: string): Promise<{ ok: boolean; company?: Company; reason?: string }> {
    const u = this.user();
    if (!u) return { ok: false, reason: 'Sign in required' };
    const company = await this.findCompanyByJoinCode(joinCode);
    if (!company || !company.id) return { ok: false, reason: 'Invalid join code' };
    if ((company.bannedIds || []).includes(u.uid)) return { ok: false, reason: 'You have been banned from this company' };
    if ((company.memberCount || 0) >= 20) return { ok: false, reason: 'Company is full (20/20)' };
    try {
      const handle = await this.getHandle();
      await setDoc(doc(db, 'companies', company.id, 'members', u.uid), {
        uid: u.uid, displayName: handle, role: 'employee', joinedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'companies', company.id), { memberCount: (company.memberCount || 0) + 1 }, { merge: true });
      await setDoc(doc(db, 'users', u.uid), { currentCompanyId: company.id, currentCompanyName: company.name }, { merge: true });
      return { ok: true, company };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }

  async leaveCompany(companyId: string): Promise<void> {
    const u = this.user();
    if (!u) return;
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'members', u.uid));
      const cref = doc(db, 'companies', companyId);
      const c = await getDoc(cref);
      const cur = (c.data()?.['memberCount'] || 1) as number;
      await setDoc(cref, { memberCount: Math.max(0, cur - 1) }, { merge: true });
      await setDoc(doc(db, 'users', u.uid), { currentCompanyId: '', currentCompanyName: '' }, { merge: true });
    } catch (err) { console.warn('leaveCompany failed', err); }
  }

  async kickMember(companyId: string, targetUid: string): Promise<{ ok: boolean; reason?: string }> {
    const u = this.user();
    if (!u) return { ok: false, reason: 'Sign in required' };
    try {
      const cref = doc(db, 'companies', companyId);
      const c = await getDoc(cref);
      if (!c.exists() || c.data()['ownerId'] !== u.uid) return { ok: false, reason: 'Only the CEO can lay off employees' };
      const banned = (c.data()['bannedIds'] || []) as string[];
      if (!banned.includes(targetUid)) banned.push(targetUid);
      await deleteDoc(doc(db, 'companies', companyId, 'members', targetUid));
      await setDoc(cref, {
        bannedIds: banned,
        memberCount: Math.max(0, (c.data()['memberCount'] || 1) - 1),
      }, { merge: true });
      // Best-effort: clear target's currentCompanyId (their write rule allows owner-of-company? no — skip; they'll see "ex-company" chip and can leave/rejoin)
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: (err as Error).message };
    }
  }

  async unbanMember(companyId: string, targetUid: string): Promise<void> {
    const u = this.user();
    if (!u) return;
    try {
      const cref = doc(db, 'companies', companyId);
      const c = await getDoc(cref);
      if (!c.exists() || c.data()['ownerId'] !== u.uid) return;
      const banned = ((c.data()['bannedIds'] || []) as string[]).filter(id => id !== targetUid);
      await setDoc(cref, { bannedIds: banned }, { merge: true });
    } catch { /* ignore */ }
  }

  async regenerateJoinCode(companyId: string): Promise<string | null> {
    const u = this.user();
    if (!u) return null;
    try {
      const cref = doc(db, 'companies', companyId);
      const c = await getDoc(cref);
      if (!c.exists() || c.data()['ownerId'] !== u.uid) return null;
      const code = makeJoinCode();
      await setDoc(cref, { joinCode: code }, { merge: true });
      return code;
    } catch { return null; }
  }

  async getCompany(companyId: string): Promise<Company | null> {
    try {
      const c = await getDoc(doc(db, 'companies', companyId));
      return c.exists() ? ({ id: c.id, ...c.data() } as Company) : null;
    } catch { return null; }
  }

  async getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
    try {
      const snap = await getDocs(collection(db, 'companies', companyId, 'members'));
      const members = snap.docs.map(d => d.data() as CompanyMember);
      // Hydrate lifetime synergy from user docs (best-effort)
      for (const m of members) {
        try {
          const us = await getDoc(doc(db, 'users', m.uid));
          if (us.exists()) m.lifetimeSynergy = (us.data()['lifetimeSynergy'] || 0);
        } catch { /* skip */ }
      }
      return members.sort((a, b) => (b.lifetimeSynergy || 0) - (a.lifetimeSynergy || 0));
    } catch { return []; }
  }

  async getCompanyLeaderboard(companyId: string, mode: string): Promise<LeaderboardEntry[]> {
    try {
      const members = await this.getCompanyMembers(companyId);
      const ids = new Set(members.map(m => m.uid));
      const board = await this.getLeaderboard(mode);
      return board.filter(e => ids.has(e.userId)).sort((a, b) => b.score - a.score).slice(0, 20);
    } catch { return []; }
  }
}

// ---- helpers (module-level) ----
function utcDayKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** ms timestamp for the most recent Monday 00:00 UTC */
export function currentWeekStartMs(now: number = Date.now()): number {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0 = Sun ... 1 = Mon
  const offset = (day + 6) % 7; // days since Monday
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset, 0, 0, 0, 0);
  return monday;
}

export function isoWeekId(ms: number = Date.now()): string {
  const d = new Date(ms);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function lastWeekIsoId(): string {
  return isoWeekId(currentWeekStartMs() - 1);
}

const SATIRICAL_SUFFIXES = [
  'survivors', 'burnouts', 'leaks', 'pip_zone',
  'defectors', 'rats', 'gulag', 'union',
  'anonymous', 'recovering', 'casualties', 'dropouts',
  'trauma', 'exodus', 'rebellion', 'cult',
];

function makeSatiricalChannelName(companyName: string): string {
  const slug = (companyName || 'company')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .split('_')[0]
    .slice(0, 18) || 'company';
  const suffix = SATIRICAL_SUFFIXES[Math.floor(Math.random() * SATIRICAL_SUFFIXES.length)];
  return `${slug}_${suffix}`.slice(0, 30);
}

function makeJoinCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
  let c = '';
  for (let i = 0; i < 6; i++) c += alphabet[Math.floor(Math.random() * alphabet.length)];
  return c;
}
