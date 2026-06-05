import React, { useEffect, useState } from 'react';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import {
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageComposer,
} from '@cometchat/chat-uikit-react';
import '@cometchat/chat-uikit-react/css-variables.css';
import { useCometChat } from '../contexts/CometChatContext';
import { MessageCircle, X, Minimize2 } from 'lucide-react';

interface ChatWithParentProps {
  /** Title of the story that was just finished */
  storyTitle?: string;
  /** Whether to show as a floating widget vs inline */
  mode?: 'inline' | 'floating';
  /** Called when the chat panel is closed */
  onClose?: () => void;
}

/**
 * A secure 1-on-1 chat widget that lets a kid message their parent.
 * Shown after the kid finishes reading a story, or as a floating widget.
 */
const ChatWithParent: React.FC<ChatWithParentProps> = ({ storyTitle, mode = 'floating', onClose }) => {
  const { isReady, isLoggedIn, parentUID, parentName, error: chatError } = useCometChat();
  const [parentUser, setParentUser] = useState<CometChat.User | null>(null);
  const [isOpen, setIsOpen] = useState(mode === 'inline');
  const [isMinimized, setIsMinimized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !isLoggedIn || !parentUID) return;

    CometChat.getUser(parentUID)
      .then((user) => setParentUser(user))
      .catch((err) => {
        console.error('[ChatWithParent] Failed to load parent user:', err);
        setLoadError('Could not connect to parent chat');
      });
  }, [isReady, isLoggedIn, parentUID]);

  // Don't render anything if chat is not configured
  if (!parentUID || chatError) return null;

  // Floating bubble button
  if (mode === 'floating' && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="chat-parent-fab"
        title={`Chat with ${parentName || 'Parent'}`}
        id="chat-with-parent-fab"
      >
        <MessageCircle size={24} />
        <span className="chat-parent-fab-label">Chat with {parentName || 'Parent'}</span>
      </button>
    );
  }

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const containerClass = mode === 'floating'
    ? `chat-parent-floating ${isMinimized ? 'chat-parent-minimized' : ''}`
    : 'chat-parent-inline';

  return (
    <div className={containerClass} id="chat-with-parent-panel">
      {/* Custom Header Bar */}
      <div className="chat-parent-header">
        <div className="chat-parent-header-left">
          <div className="chat-parent-avatar">
            💬
          </div>
          <div>
            <h4 className="chat-parent-title">
              Chat with {parentName || 'Parent'}
            </h4>
            {storyTitle && (
              <p className="chat-parent-subtitle">
                About: {storyTitle}
              </p>
            )}
          </div>
        </div>
        <div className="chat-parent-header-actions">
          {mode === 'floating' && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="chat-parent-header-btn"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              <Minimize2 size={16} />
            </button>
          )}
          <button onClick={handleClose} className="chat-parent-header-btn" title="Close chat">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Chat Body */}
      {!isMinimized && (
        <div className="chat-parent-body">
          {!isReady || !isLoggedIn ? (
            <div className="chat-parent-loading">
              <div className="chat-parent-spinner" />
              <p>Connecting to chat...</p>
            </div>
          ) : loadError ? (
            <div className="chat-parent-error">
              <p>😔 {loadError}</p>
              <p className="text-xs mt-2">Please try again later</p>
            </div>
          ) : !parentUser ? (
            <div className="chat-parent-loading">
              <div className="chat-parent-spinner" />
              <p>Loading chat...</p>
            </div>
          ) : (
            <>
              {/* Prompt Banner */}
              {storyTitle && (
                <div className="chat-parent-prompt">
                  <span className="chat-parent-prompt-emoji">📖</span>
                  <div>
                    <p className="chat-parent-prompt-text">
                      Have any doubt regarding the story?
                    </p>
                    <p className="chat-parent-prompt-cta">
                      Reach out to <strong>{parentName || 'your parent'}</strong>!
                    </p>
                  </div>
                </div>
              )}

              {/* CometChat UI Components */}
              <div className="chat-parent-messages">
                <CometChatMessageHeader user={parentUser} />
                <div className="chat-parent-message-list">
                  <CometChatMessageList user={parentUser} />
                </div>
                <CometChatMessageComposer user={parentUser} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWithParent;
