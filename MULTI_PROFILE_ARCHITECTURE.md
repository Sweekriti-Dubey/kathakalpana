# MULTI-PROFILE ARCHITECTURE PLAN

## Overview

This document outlines a Netflix-style multi-profile system where:
- **Parents** access all kids' profiles + own profile with parental controls
- **Kids** access only their own profile
- Profile switching happens on app launch via "Who is reading today?" screen
- Parental gate (password/biometrics) protects parent profile
- Future: Expo biometrics support (FaceID/Fingerprint)

---

## PHASE 1: DATA MODELS & CONTEXT

### 1.1 Profile Data Model

```typescript
// types.ts - Add to existing types

interface Profile {
  profile_id: string;
  user_id: string;          // FK to auth.users
  profile_type: 'parent' | 'kid';
  name: string;
  avatar_emoji: string;      // e.g., "👨", "🧒", "👧"
  profile_order: number;     // Display order in profile selector
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ParentProfile extends Profile {
  profile_type: 'parent';
  bio: string;
  email: string;             // Parent's email
  parental_gate_enabled: boolean;
  parental_gate_type: 'password' | 'biometric';
  parental_gate_hash: string; // Hashed password (or biometric ID)
}

interface KidProfile extends Profile {
  profile_type: 'kid';
  birth_year: number;        // For age-appropriate content
  reading_level: 'beginner' | 'intermediate' | 'advanced';
  parent_profile_id: string; // FK to parent's profile_id
}

interface PetStatus {
  // Existing pet data
  profile_id: string;        // FK - which kid's pet is this
  pet_name: string;
  level: number;
  xp: number;
  evolution_stage: 'egg' | 'hatchling' | 'adult';
}
```

### 1.2 Profile Context (New)

```typescript
// contexts/ProfileContext.tsx (NEW FILE)

interface ProfileContextType {
  // Current active profile
  currentProfile: Profile | null;
  
  // All profiles available to current user
  availableProfiles: Profile[];
  
  // Loading state
  isLoading: boolean;
  
  // Actions
  switchProfile: (profileId: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  createProfile: (name: string, type: 'parent' | 'kid', avatar: string) => Promise<void>;
  updateProfile: (profileId: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  
  // Parental Gate
  verifyParentalGate: (password: string) => Promise<boolean>;
  setParentalGate: (type: 'password' | 'biometric', value: string) => Promise<void>;
}
```

---

## PHASE 2: BACKEND INTEGRATION

### 2.1 Supabase Schema Addition

```sql
-- Add to schema_patch.sql

-- Profiles table
CREATE TABLE profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('parent', 'kid')),
  name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  profile_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, name) -- Can't have duplicate profile names per user
);

-- Parent-specific settings
CREATE TABLE parent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  parental_gate_enabled BOOLEAN DEFAULT true,
  parental_gate_type TEXT DEFAULT 'password' CHECK (parental_gate_type IN ('password', 'biometric')),
  parental_gate_hash TEXT,
  screen_time_limit_minutes INTEGER,
  content_filter_level TEXT DEFAULT 'medium' CHECK (content_filter_level IN ('low', 'medium', 'high')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Kid profiles table (child of profiles)
CREATE TABLE kid_profiles (
  profile_id UUID PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  birth_year INTEGER,
  reading_level TEXT DEFAULT 'beginner' CHECK (reading_level IN ('beginner', 'intermediate', 'advanced')),
  parent_profile_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Link existing tables to profiles
ALTER TABLE my_stories ADD COLUMN profile_id UUID REFERENCES profiles(profile_id) ON DELETE CASCADE;
ALTER TABLE pet_status ADD COLUMN profile_id UUID REFERENCES profiles(profile_id) ON DELETE CASCADE;
ALTER TABLE reading_sessions ADD COLUMN profile_id UUID REFERENCES profiles(profile_id) ON DELETE CASCADE;
```

### 2.2 Supabase RLS Policies

```sql
-- Users can only access their own profiles and their kids' profiles
CREATE POLICY "Users can view own and kids profiles"
  ON profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR profile_id IN (
      SELECT profile_id FROM profiles
      WHERE user_id = auth.uid() AND profile_type = 'kid'
    )
  );

-- Only parent can update their profile
CREATE POLICY "Parent can update own settings"
  ON parent_settings FOR UPDATE
  USING (
    profile_id IN (
      SELECT profile_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

-- Kids can't modify parent profiles
-- (Implicit - don't need explicit policy)
```

### 2.3 Edge Functions (Supabase)

```typescript
// supabase/functions/get-profiles/index.ts (NEW)

import { createClient } from '@supabase/supabase-js'

export default async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const authHeader = req.headers.get('Authorization')!
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabase.auth.getUser(token)

  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Get all profiles for this user
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('profile_order', { ascending: true })

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 })
  }

  return new Response(JSON.stringify(profiles), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// supabase/functions/switch-profile/index.ts (NEW)

export default async (req: Request) => {
  const { profile_id } = await req.json()
  
  // Validate that user can access this profile
  // Return profile data + auth token scoped to profile
  
  return new Response(JSON.stringify({ success: true, profile }))
}

// supabase/functions/verify-parental-gate/index.ts (NEW)

export default async (req: Request) => {
  const { profile_id, password } = await req.json()
  
  // Verify password against parent_settings.parental_gate_hash
  // Return true/false
}
```

---

## PHASE 3: FRONTEND CONTEXT & PROVIDERS

### 3.1 ProfileContext Implementation

```typescript
// contexts/ProfileContext.tsx (NEW FILE)

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { Session } from '@supabase/supabase-js'
import { requireSupabaseClient } from '../lib/supabaseClient'

interface Profile {
  profile_id: string
  user_id: string
  profile_type: 'parent' | 'kid'
  name: string
  avatar_emoji: string
  profile_order: number
  is_active: boolean
}

interface ProfileContextType {
  currentProfile: Profile | null
  availableProfiles: Profile[]
  isLoading: boolean
  switchProfile: (profileId: string) => Promise<void>
  refreshProfiles: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

interface ProfileProviderProps {
  children: React.ReactNode
  session: Session | null
}

export const ProfileProvider: React.FC<ProfileProviderProps> = ({ children, session }) => {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = useCallback(() => requireSupabaseClient(), [])()
  const baseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.trim().replace(/\/$/, '')

  // Fetch all profiles for user
  const refreshProfiles = useCallback(async () => {
    if (!session?.access_token) return

    try {
      const { data } = await axios.get(
        `${baseUrl}/get-profiles`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      setAvailableProfiles(data)
      
      // Set first profile as current if none selected
      if (!currentProfile && data.length > 0) {
        setCurrentProfile(data[0])
        localStorage.setItem('currentProfileId', data[0].profile_id)
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error)
    }
  }, [session?.access_token, baseUrl, currentProfile])

  // Switch to different profile
  const switchProfile = useCallback(async (profileId: string) => {
    const profile = availableProfiles.find(p => p.profile_id === profileId)
    if (profile) {
      setCurrentProfile(profile)
      localStorage.setItem('currentProfileId', profileId)
    }
  }, [availableProfiles])

  // Load profiles on mount
  useEffect(() => {
    const loadProfiles = async () => {
      setIsLoading(true)
      await refreshProfiles()
      setIsLoading(false)
    }

    if (session) {
      loadProfiles()
    }
  }, [session, refreshProfiles])

  return (
    <ProfileContext.Provider value={{
      currentProfile,
      availableProfiles,
      isLoading,
      switchProfile,
      refreshProfiles
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider')
  }
  return context
}
```

---

## PHASE 4: ROUTING ARCHITECTURE

### 4.1 Conditional Navigation Structure

```typescript
// App.tsx - REFACTORED

import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Session } from '@supabase/supabase-js'
import { ThemeProvider } from './contexts/ThemeContext'
import { ProfileProvider, useProfile } from './contexts/ProfileContext'
import { isFrontendConfigured, requireSupabaseClient } from './lib/supabaseClient'
import Login from './components/Login'
import ProfileSelector from './components/ProfileSelector'
import ParentalGate from './components/ParentalGate'

// Lazy load all screens
const KidsStack = React.lazy(() => import('./navigation/KidsStack'))
const ParentStack = React.lazy(() => import('./navigation/ParentStack'))

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let mounted = true
    if (!isFrontendConfigured) {
      setAuthReady(true)
      return
    }

    const client = requireSupabaseClient()
    const initAuth = async () => {
      const { data } = await client.auth.getSession()
      if (mounted) {
        setSession(data.session ?? null)
        setAuthReady(true)
      }
    }

    initAuth()

    const { data: subscription } = client.auth.onAuthStateChange((event, nextSession) => {
      if (mounted) {
        setSession(nextSession)
        setAuthReady(true)
      }
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  if (!isFrontendConfigured) {
    return <ConfigurationErrorScreen />
  }

  return (
    <ThemeProvider>
      <ProfileProvider session={session}>
        <Router>
          <AppRoutes session={session} authReady={authReady} setSession={setSession} />
        </Router>
      </ProfileProvider>
    </ThemeProvider>
  )
}

interface AppRoutesProps {
  session: Session | null
  authReady: boolean
  setSession: (session: Session | null) => void
}

const AppRoutes: React.FC<AppRoutesProps> = ({ session, authReady, setSession }) => {
  const { currentProfile, isLoading: profilesLoading } = useProfile()
  const [parentalGateVerified, setParentalGateVerified] = useState(false)

  if (!authReady) return <LoadingSpinner />
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={(s) => setSession(s)} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (profilesLoading) return <LoadingSpinner />
  if (!currentProfile) return <ProfileSelector />

  // CONDITIONAL NAVIGATION: Swap entire stack based on profile type
  return (
    <Routes>
      {currentProfile.profile_type === 'parent' ? (
        <>
          {!parentalGateVerified ? (
            <Route
              path="*"
              element={
                <ParentalGate
                  onVerify={() => setParentalGateVerified(true)}
                />
              }
            />
          ) : (
            <>
              <Route path="/*" element={<ParentStack />} />
              <Route path="*" element={<Navigate to="/parent" replace />} />
            </>
          )}
        </>
      ) : (
        <>
          <Route path="/*" element={<KidsStack />} />
          <Route path="*" element={<Navigate to="/kids-home" replace />} />
        </>
      )}
    </Routes>
  )
}

export default App
```

### 4.2 Navigation Stacks

```typescript
// navigation/KidsStack.tsx (NEW)

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import KidsLayout from '../layouts/KidsLayout'
import Home from '../pages/kids/Home'
import Library from '../components/Library'
import StoryGenerator from '../components/StoryGenerator'
import StoryReader from '../components/StoryReader'
import PetDashboard from '../components/PetDashBoard'

export default function KidsStack() {
  return (
    <Routes>
      <Route element={<KidsLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="kids-home" element={<Home />} />
        <Route path="library" element={<Library />} />
        <Route path="generate" element={<StoryGenerator />} />
        <Route path="read" element={<StoryReader />} />
        <Route path="pet" element={<PetDashboard />} />
      </Route>
    </Routes>
  )
}

// navigation/ParentStack.tsx (NEW)

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ParentLayout from '../layouts/ParentLayout'
import ParentDashboard from '../components/ParentDashboard'
import KidsManagement from '../pages/parent/KidsManagement'
import ReadingMetrics from '../pages/parent/ReadingMetrics'
import ContentReview from '../pages/parent/ContentReview'
import ControlSettings from '../pages/parent/ControlSettings'
import ParentLibrary from '../pages/parent/ParentLibrary'

export default function ParentStack() {
  return (
    <Routes>
      <Route element={<ParentLayout />}>
        <Route path="/" element={<ParentDashboard />} />
        <Route path="parent" element={<ParentDashboard />} />
        <Route path="kids" element={<KidsManagement />} />
        <Route path="metrics" element={<ReadingMetrics />} />
        <Route path="content" element={<ContentReview />} />
        <Route path="settings" element={<ControlSettings />} />
        <Route path="library" element={<ParentLibrary />} />
      </Route>
    </Routes>
  )
}
```

### 4.3 Layouts

```typescript
// layouts/KidsLayout.tsx (NEW)

import React from 'react'
import { Outlet } from 'react-router-dom'
import KidsNavbar from '../components/navigation/KidsNavbar'
import KidsFooter from '../components/navigation/KidsFooter'

export default function KidsLayout() {
  return (
    <div className="kids-layout">
      <KidsNavbar />
      <main className="kids-main">
        <Outlet />
      </main>
      <KidsFooter />
    </div>
  )
}

// layouts/ParentLayout.tsx (NEW)

import React from 'react'
import { Outlet } from 'react-router-dom'
import ParentNavbar from '../components/navigation/ParentNavbar'
import ParentSidebar from '../components/navigation/ParentSidebar'
import ParentFooter from '../components/navigation/ParentFooter'

export default function ParentLayout() {
  return (
    <div className="parent-layout grid">
      <ParentSidebar />
      <div className="parent-content-wrapper">
        <ParentNavbar />
        <main className="parent-main">
          <Outlet />
        </main>
        <ParentFooter />
      </div>
    </div>
  )
}
```

---

## PHASE 5: PROFILE SELECTOR & PARENTAL GATE

### 5.1 Profile Selector Component

```typescript
// components/ProfileSelector.tsx (NEW)

import React from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { Plus } from 'lucide-react'

export default function ProfileSelector() {
  const { availableProfiles, switchProfile } = useProfile()

  return (
    <div className="profile-selector-screen">
      <div className="profile-selector-container">
        <h1 className="text-4xl font-playfair text-center mb-12">
          Who is reading today?
        </h1>

        <div className="profile-grid grid grid-cols-2 md:grid-cols-3 gap-6">
          {availableProfiles.map(profile => (
            <button
              key={profile.profile_id}
              onClick={() => switchProfile(profile.profile_id)}
              className="profile-card group relative"
            >
              <div className="profile-avatar text-6xl mb-4 group-hover:scale-110 transition-transform">
                {profile.avatar_emoji}
              </div>
              <p className="profile-name text-lg font-semibold">
                {profile.name}
              </p>
              <p className="profile-type text-sm text-app-muted capitalize">
                {profile.profile_type}
              </p>
            </button>
          ))}

          {/* Add Profile Button */}
          <button className="profile-add-card border-2 border-dashed">
            <Plus size={32} />
            <span>Add Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 5.2 Parental Gate Component

```typescript
// components/ParentalGate.tsx (NEW)

import React, { useState } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { Lock } from 'lucide-react'

interface ParentalGateProps {
  onVerify: () => void
}

export default function ParentalGate({ onVerify }: ParentalGateProps) {
  const { currentProfile } = useProfile()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    if (!password) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/verify-parental-gate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id: currentProfile?.profile_id,
            password
          })
        }
      )

      const data = await response.json()
      if (data.verified) {
        onVerify()
      } else {
        setError('Incorrect password')
      }
    } catch (err) {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  // Future: Biometric authentication
  const handleBiometric = async () => {
    // Integration point for expo-local-authentication
    // if (await BiometricAuth.authenticate()) {
    //   onVerify()
    // }
  }

  return (
    <div className="parental-gate-screen fixed inset-0 bg-black/80 flex items-center justify-center">
      <div className="parental-gate-card card-base p-8 max-w-md w-full mx-4">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-app-pink/20 flex items-center justify-center">
            <Lock size={32} className="text-app-pink" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center mb-2">
          Parent Access Required
        </h2>
        <p className="text-app-muted text-center mb-6">
          Enter your password to access parent features
        </p>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="input-auth w-full mb-4"
          disabled={loading}
        />

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleVerify}
          disabled={loading || !password}
          className="button-primary w-full mb-3"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        {/* Biometric Option - Future */}
        <button
          onClick={handleBiometric}
          className="w-full py-3 border border-app-border rounded-lg text-app-text hover:bg-app-surface transition-colors"
        >
          Use Biometric
        </button>
      </div>
    </div>
  )
}
```

---

## PHASE 6: DATA QUERIES BY PROFILE

### 6.1 Profile-Scoped Queries

All existing queries now filtered by `profile_id`:

```typescript
// Examples of updated queries:

// Library queries
const { data: stories } = await supabase
  .from('my_stories')
  .select('*')
  .eq('profile_id', currentProfile.profile_id)
  .order('created_at', { ascending: false })

// Pet queries
const { data: pet } = await supabase
  .from('pet_status')
  .select('*')
  .eq('profile_id', currentProfile.profile_id)
  .single()

// Reading sessions
const { data: sessions } = await supabase
  .from('reading_sessions')
  .select('*')
  .eq('profile_id', currentProfile.profile_id)
```

### 6.2 Parent Dashboard - Aggregate Queries

```typescript
// Get stats for all kids
const { data: kidProfiles } = await supabase
  .from('profiles')
  .select(`
    *,
    kid_profiles(*),
    my_stories(count),
    pet_status(*)
  `)
  .eq('parent_profile_id', currentProfile.profile_id)
  .eq('profile_type', 'kid')

// Reading time aggregation
const { data: readingStats } = await supabase
  .from('reading_sessions')
  .select('profile_id, duration')
  .in('profile_id', kidProfileIds)
  .gte('created_at', startDate)
```

---

## PHASE 7: FUTURE - EXPO BIOMETRICS INTEGRATION

### 7.1 Structure (Post-Web Implementation)

```typescript
// When migrating to Expo:

import * as LocalAuthentication from 'expo-local-authentication'

const handleBiometricGate = async () => {
  const compatible = await LocalAuthentication.hasHardwareAsync()
  const savedBiometrics = await LocalAuthentication.supportedAuthenticationTypesAsync()

  if (compatible && savedBiometrics.length > 0) {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      })
      if (result.success) {
        onVerify()
      }
    } catch (error) {
      console.error('Biometric auth failed:', error)
    }
  }
}
```

---

## IMPLEMENTATION TIMELINE

### Week 1: Data Models & Backend
- [ ] Create Profile context
- [ ] Add Supabase schema (profiles, parent_settings, kid_profiles)
- [ ] Create RLS policies
- [ ] Implement edge functions (get-profiles, switch-profile, verify-parental-gate)

### Week 2: Routing & Navigation
- [ ] Refactor App.tsx with conditional stacks
- [ ] Create KidsStack and ParentStack
- [ ] Create KidsLayout and ParentLayout
- [ ] Implement ProfileSelector component
- [ ] Implement ParentalGate component

### Week 3: Profile-Scoped Data
- [ ] Update all queries to use profile_id
- [ ] Refactor Library.tsx for kids
- [ ] Refactor PetDashboard for kids
- [ ] Implement ParentDashboard
- [ ] Create parent feature pages

### Week 4: Styling Refactor (Concurrent)
- [ ] Convert inline styles to Tailwind
- [ ] Extract CSS injections to tailwind.config.js
- [ ] Create reusable component classes
- [ ] Update all components

### Week 5: Testing & Refinement
- [ ] End-to-end testing
- [ ] Profile switching testing
- [ ] Parental gate testing
- [ ] Data isolation verification

---

## FILE STRUCTURE (POST-IMPLEMENTATION)

```
frontend/src/
├── components/
│   ├── navigation/
│   │   ├── KidsNavbar.tsx (NEW)
│   │   ├── KidsFooter.tsx (NEW)
│   │   ├── ParentNavbar.tsx (NEW)
│   │   ├── ParentSidebar.tsx (NEW)
│   │   ├── ParentFooter.tsx (NEW)
│   │   └── ProfileSwitcher.tsx (NEW)
│   ├── ProfileSelector.tsx (NEW)
│   ├── ParentalGate.tsx (NEW)
│   ├── Library.tsx (MODIFIED - kids only)
│   ├── PetDashBoard.tsx (MODIFIED - kids only)
│   └── ... (existing components)
├── pages/
│   ├── kids/
│   │   ├── Home.tsx (NEW)
│   │   └── ... (kids pages)
│   └── parent/
│       ├── ParentDashboard.tsx (NEW)
│       ├── KidsManagement.tsx (NEW)
│       ├── ReadingMetrics.tsx (NEW)
│       ├── ContentReview.tsx (NEW)
│       ├── ControlSettings.tsx (NEW)
│       └── ParentLibrary.tsx (NEW)
├── layouts/
│   ├── KidsLayout.tsx (NEW)
│   └── ParentLayout.tsx (NEW)
├── navigation/
│   ├── KidsStack.tsx (NEW)
│   └── ParentStack.tsx (NEW)
├── contexts/
│   ├── ProfileContext.tsx (NEW)
│   ├── ThemeContext.tsx (existing)
│   └── ... (existing contexts)
├── App.tsx (MODIFIED)
└── types.ts (MODIFIED - add Profile interfaces)
```

---

## DECISION POINTS FOR USER

1. **Profile Creation:**
   - Should parents create kid profiles, or kids self-create?
   - Recommended: Parents create from parent dashboard

2. **Parental Gate:**
   - Password-only for now?
   - Biometric setup during parent profile creation?

3. **Profile Switching:**
   - Should profile persist across sessions or reset on reload?
   - Recommended: Persist in localStorage

4. **Parent Features Priority:**
   - Which features first: Metrics? Content review? Controls?
   - Can be phased in

5. **Migration Strategy:**
   - Existing users: Automatic profile creation?
   - New users: Profile creation on signup?

---

## BENEFITS

✅ Netflix-like UX familiar to users
✅ Complete isolation between kids and parent content
✅ Scalable to multiple kids
✅ Future-proof for biometrics
✅ Prevents "state leaking" via navigation
✅ Parental controls built in
✅ Sets foundation for all new parent features

---
