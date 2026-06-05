import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { requireSupabaseClient } from '../lib/supabaseClient';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWithCharacterProps {
  /** Name of the story's protagonist */
  characterName: string;
  /** Title of the story */
  storyTitle: string;
  /** The story's moral / summary for context */
  storySummary: string;
  /** Called when the chat panel is closed */
  onClose: () => void;
}

/**
 * AI-powered in-character chat that lets kids talk to the story's main character.
 * Uses a Supabase Edge Function (Groq LLM) to generate in-character responses.
 */
const ChatWithCharacter: React.FC<ChatWithCharacterProps> = ({
  characterName,
  storyTitle,
  storySummary,
  onClose,
}) => {
  const supabase = requireSupabaseClient();
  const edgeBaseUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  const functionsBaseUrl = edgeBaseUrl?.trim()?.replace(/\/$/, '');
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi there! I'm ${characterName} from "${storyTitle}"! Did you enjoy the story? Ask me anything! 😊`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.access_token ?? '';
  };

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const token = await getAccessToken();
      const res = await fetch(`${functionsBaseUrl}/chat-with-character`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          character_name: characterName,
          story_title: storyTitle,
          story_summary: storySummary,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (err) {
      console.error('[ChatWithCharacter] Error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Oops! I got a little confused. Can you ask me again? 🤔`,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-character-container" id="chat-with-character-panel">
      {/* Header */}
      <div className="chat-character-header">
        <div className="chat-character-header-left">
          <div className="chat-character-avatar">✨</div>
          <div>
            <h4 className="chat-character-title">Chat with {characterName}</h4>
            <p className="chat-character-subtitle">From: {storyTitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="chat-character-close-btn"
          title="Close chat"
        >
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-character-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-character-bubble ${
              msg.role === 'user' ? 'chat-character-user' : 'chat-character-bot'
            }`}
          >
            {msg.role === 'assistant' && (
              <span className="chat-character-bubble-avatar">
                <Sparkles size={14} />
              </span>
            )}
            <p className="chat-character-bubble-text">{msg.content}</p>
          </div>
        ))}

        {isLoading && (
          <div className="chat-character-bubble chat-character-bot">
            <span className="chat-character-bubble-avatar">
              <Sparkles size={14} className="animate-spin" />
            </span>
            <p className="chat-character-bubble-text chat-character-typing">
              {characterName} is thinking
              <span className="chat-character-dots">
                <span>.</span><span>.</span><span>.</span>
              </span>
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-character-input-bar">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${characterName} something...`}
          className="chat-character-input"
          disabled={isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="chat-character-send-btn"
          title="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default ChatWithCharacter;
