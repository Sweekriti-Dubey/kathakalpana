import React, { useEffect, useState } from 'react';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import {
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageComposer,
} from '@cometchat/chat-uikit-react';
import '@cometchat/chat-uikit-react/css-variables.css';
import { useCometChat, toUID } from '../contexts/CometChatContext';
import { useProfile } from '../contexts/ProfileContext';
import { MessageCircle, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Parent-side chat panel embedded in the Parent Dashboard.
 * Shows a list of kid profiles the parent can chat with,
 * and opens an inline 1-on-1 chat when a kid is selected.
 */
const ParentChatWidget: React.FC = () => {
  const { isReady, isLoggedIn, error: chatError } = useCometChat();
  const { availableProfiles } = useProfile();
  const [selectedKid, setSelectedKid] = useState<string | null>(null);
  const [kidUser, setKidUser] = useState<CometChat.User | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const kidProfiles = availableProfiles.filter(p => p.profile_type === 'kid');

  // Load the CometChat user when a kid is selected
  useEffect(() => {
    if (!selectedKid || !isReady || !isLoggedIn) {
      setKidUser(null);
      return;
    }

    const kidUID = toUID(selectedKid);
    setLoadError(null);

    CometChat.getUser(kidUID)
      .then((user) => setKidUser(user))
      .catch((err) => {
        console.error('[ParentChat] Failed to load kid user:', err);
        setLoadError('Could not load chat for this kid');
        setKidUser(null);
      });
  }, [selectedKid, isReady, isLoggedIn]);

  if (!isReady || chatError) return null;
  if (kidProfiles.length === 0) return null;

  return (
    <div className="parent-chat-widget" id="parent-chat-widget">
      {/* Widget Header */}
      <button
        className="parent-chat-widget-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="parent-chat-icon">
            <MessageCircle size={18} />
          </div>
          <div className="text-left">
            <h4 className="parent-chat-title">Kid Messages</h4>
            <p className="parent-chat-subtitle">
              {kidProfiles.length} {kidProfiles.length === 1 ? 'kid' : 'kids'} connected
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-app-muted" /> : <ChevronDown size={18} className="text-app-muted" />}
      </button>

      {isExpanded && (
        <div className="parent-chat-body">
          {/* Kid Selector Tabs */}
          <div className="parent-chat-kids-bar">
            {kidProfiles.map(kid => (
              <button
                key={kid.profile_id}
                onClick={() => setSelectedKid(kid.profile_id)}
                className={`parent-chat-kid-tab ${selectedKid === kid.profile_id ? 'active' : ''}`}
              >
                <span className="text-lg">{kid.avatar_emoji}</span>
                <span className="text-sm font-medium truncate">{kid.name}</span>
              </button>
            ))}
          </div>

          {/* Chat Area */}
          {!selectedKid ? (
            <div className="parent-chat-empty">
              <MessageCircle size={32} className="text-app-muted opacity-40 mb-3" />
              <p className="text-app-muted text-sm">Select a kid to view their messages</p>
            </div>
          ) : !isLoggedIn ? (
            <div className="parent-chat-empty">
              <div className="chat-parent-spinner" />
              <p className="text-app-muted text-sm mt-3">Connecting...</p>
            </div>
          ) : loadError ? (
            <div className="parent-chat-empty">
              <p className="text-red-400 text-sm">😔 {loadError}</p>
              <button
                onClick={() => { setLoadError(null); setSelectedKid(null); }}
                className="text-xs text-app-violet mt-2 hover:underline"
              >
                Try another kid
              </button>
            </div>
          ) : !kidUser ? (
            <div className="parent-chat-empty">
              <div className="chat-parent-spinner" />
              <p className="text-app-muted text-sm mt-3">Loading chat...</p>
            </div>
          ) : (
            <div className="parent-chat-messages">
              <CometChatMessageHeader user={kidUser} />
              <div className="parent-chat-message-list">
                <CometChatMessageList user={kidUser} />
              </div>
              <CometChatMessageComposer user={kidUser} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentChatWidget;
