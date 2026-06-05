import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import { CometChatUIKit, UIKitSettingsBuilder } from '@cometchat/chat-uikit-react';
import { useProfile } from './ProfileContext';

const COMETCHAT_CONSTANTS = {
  APP_ID: import.meta.env.VITE_COMETCHAT_APP_ID as string,
  REGION: import.meta.env.VITE_COMETCHAT_REGION as string,
  AUTH_KEY: import.meta.env.VITE_COMETCHAT_AUTH_KEY as string,
  API_KEY: import.meta.env.VITE_COMETCHAT_API_KEY as string,   // REST API key (fullAccess) — for user creation
};

interface CometChatContextType {
  isReady: boolean;
  isLoggedIn: boolean;
  cometChatUser: CometChat.User | null;
  parentUID: string | null;
  parentName: string | null;
  error: string | null;
}

const CometChatContext = createContext<CometChatContextType>({
  isReady: false,
  isLoggedIn: false,
  cometChatUser: null,
  parentUID: null,
  parentName: null,
  error: null,
});

/** 
 * Converts a Supabase profile_id (UUID) to a valid CometChat UID.
 * CometChat UIDs must be purely alphanumeric (+ underscores).
 * We strip ALL hyphens and special chars so UUIDs become clean IDs.
 *   e.g. "77695604-12d3-43b3-a48d-9caeade9214e" → "7769560412d343b3a48d9caeade9214e"
 */
const toUID = (profileId: string): string => profileId.replace(/[^a-zA-Z0-9_]/g, '');

/**
 * Build the CometChat REST API base URL for this app.
 *   e.g. https://167945039205d7771.api-in.cometchat.io/v3
 */
const getRestApiBase = () =>
  `https://${COMETCHAT_CONSTANTS.APP_ID}.api-${COMETCHAT_CONSTANTS.REGION}.cometchat.io/v3`;

export const CometChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentProfile, availableProfiles } = useProfile();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cometChatUser, setCometChatUser] = useState<CometChat.User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track which profile we last logged in so we don't re-login unnecessarily
  const lastLoggedInRef = useRef<string | null>(null);

  // Determine the parent profile & UID for kid->parent messaging
  const parentProfile = availableProfiles.find(p => p.profile_type === 'parent');
  const parentUID = parentProfile ? toUID(parentProfile.profile_id) : null;
  const parentName = parentProfile?.name || null;

  // Initialize CometChat UIKit once on mount
  useEffect(() => {
    if (!COMETCHAT_CONSTANTS.APP_ID || !COMETCHAT_CONSTANTS.REGION || !COMETCHAT_CONSTANTS.AUTH_KEY) {
      console.warn('CometChat env vars missing — chat disabled');
      return;
    }

    const settings = new UIKitSettingsBuilder()
      .setAppId(COMETCHAT_CONSTANTS.APP_ID)
      .setRegion(COMETCHAT_CONSTANTS.REGION)
      .setAuthKey(COMETCHAT_CONSTANTS.AUTH_KEY)
      .subscribePresenceForAllUsers()
      .build();

    CometChatUIKit.init(settings)
      ?.then(() => {
        console.log('[CometChat] UIKit initialized');
        setIsReady(true);
      })
      .catch((err) => {
        console.error('[CometChat] Init failed:', err);
        setError('Chat initialization failed');
      });
  }, []);

  /**
   * Helper: create a CometChat user via the REST API (not the SDK).
   * The SDK's createUser() requires "Auth Key User Management" enabled
   * in the dashboard, which is off by default. The REST API always works
   * when called with the fullAccess API key.
   * Returns true if user now exists, false on unexpected failure.
   */
  const ensureUserCreated = useCallback(async (uid: string, name: string): Promise<boolean> => {
    if (!COMETCHAT_CONSTANTS.API_KEY) {
      // Fall back to SDK method if no REST API key is configured
      try {
        const newUser = new CometChat.User(uid);
        newUser.setName(name);
        await CometChat.createUser(newUser, COMETCHAT_CONSTANTS.AUTH_KEY);
        console.log(`[CometChat] Created user via SDK: ${uid}`);
        return true;
      } catch (err: any) {
        if (err?.code === 'ERR_UID_ALREADY_EXISTS' || err?.message?.includes('already exists')) {
          return true;
        }
        console.error(`[CometChat] SDK createUser failed for ${uid}:`, err);
        return false;
      }
    }

    // Use REST API — always works with the fullAccess API key
    try {
      const res = await fetch(`${getRestApiBase()}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': COMETCHAT_CONSTANTS.API_KEY,
          'accept': 'application/json',
        },
        body: JSON.stringify({ uid, name: name || 'Parent' }),
      });

      if (res.ok) {
        console.log(`[CometChat] Created user via REST API: ${uid}`);
        return true;
      }

      const data = await res.json().catch(() => ({}));

      // "ERR_UID_ALREADY_EXISTS" — user already registered, that's fine
      if (
        data?.error?.code === 'ERR_UID_ALREADY_EXISTS' ||
        data?.error?.message?.includes('already exists')
      ) {
        return true;
      }

      console.error(`[CometChat] REST API create user failed for ${uid}:`, res.status, data);
      return false;
    } catch (err) {
      console.error(`[CometChat] REST API request failed for ${uid}:`, err);
      return false;
    }
  }, []);

  /**
   * Create-first flow: ensure user exists in CometChat, THEN login.
   * This avoids the 404 "user not found" error that login-first causes.
   */
  const ensureUserAndLogin = useCallback(async (uid: string, name: string) => {
    // Step 1: Check if we're already logged in as this user
    try {
      const existingUser = await CometChatUIKit.getLoggedinUser();
      if (existingUser) {
        if (existingUser.getUid() === uid) {
          console.log(`[CometChat] Already logged in as ${uid}`);
          setCometChatUser(existingUser);
          setIsLoggedIn(true);
          return;
        } else {
          // We must logout the previous user before logging in a new one!
          console.log(`[CometChat] Logging out previous user: ${existingUser.getUid()}`);
          await CometChatUIKit.logout();
        }
      }
    } catch {
      // Not logged in — continue with create + login flow
    }

    // Step 2: Create the user first (no-op if already exists)
    const created = await ensureUserCreated(uid, name);
    if (!created) {
      setError('Chat user setup failed');
      return;
    }

    // Step 3: Now login — user is guaranteed to exist
    try {
      const user = await CometChatUIKit.login(uid);
      if (user) {
        console.log(`[CometChat] Logged in as ${uid}`);
        setCometChatUser(user);
        setIsLoggedIn(true);
      } else {
        console.error('[CometChat] Login returned null for', uid);
        setError('Chat login failed');
      }
    } catch (loginErr) {
      console.error('[CometChat] Login failed for', uid, loginErr);
      setError('Chat login failed');
    }
  }, [ensureUserCreated]);

  // When profile changes, log in as the corresponding CometChat user
  useEffect(() => {
    if (!isReady || !currentProfile) return;

    const uid = toUID(currentProfile.profile_id);
    if (lastLoggedInRef.current === uid) return; // Already logged in as this user

    lastLoggedInRef.current = uid;
    setIsLoggedIn(false);
    setCometChatUser(null);
    setError(null);

    ensureUserAndLogin(uid, currentProfile.name);

    // Also ensure the parent user exists so kids can chat with them
    if (currentProfile.profile_type === 'kid' && parentProfile) {
      const pUID = toUID(parentProfile.profile_id);
      // Fire-and-forget — just make sure the parent CometChat user exists
      ensureUserCreated(pUID, parentProfile.name);
    }
  }, [isReady, currentProfile, parentProfile, ensureUserAndLogin, ensureUserCreated]);

  return (
    <CometChatContext.Provider value={{ isReady, isLoggedIn, cometChatUser, parentUID, parentName, error }}>
      {children}
    </CometChatContext.Provider>
  );
};

export const useCometChat = () => useContext(CometChatContext);
export { toUID };
