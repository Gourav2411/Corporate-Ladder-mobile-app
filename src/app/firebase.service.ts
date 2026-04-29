import { Injectable, signal } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut, User, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, getDocFromServer, Firestore, deleteDoc } from 'firebase/firestore';
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
  content: string;
  channel: string;
  upvotes: number;
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

  async logout() {
    if (Capacitor.isNativePlatform()) {
      try { await FirebaseAuthentication.signOut(); } catch { /* native sign-out is best-effort */ }
    }
    await signOut(auth);
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

  async createWatercoolerPost(content: string, channel = 'general', isAnonymous = false) {
     const u = this.user();
     if (!u) throw new Error("Must be logged in to post");
     const profile = await this.getUserProfile();
     const name = isAnonymous ? 'Anonymous Drone' : (profile?.displayName || u.displayName || 'Anonymous Drone');
     const postId = `post_${Date.now()}_${Math.floor(Math.random()*1000)}`;
     await setDoc(doc(db, 'watercooler', postId), {
        authorId: u.uid,
        authorName: name,
        content,
        channel,
        upvotes: 0,
        createdAt: serverTimestamp()
     });
  }

  async upvoteWatercoolerPost(postId: string, currentUpvotes: number) {
     const u = this.user();
     if (!u) return;
     await setDoc(doc(db, 'watercooler', postId), {
        upvotes: currentUpvotes + 1
     }, { merge: true });
  }
}
