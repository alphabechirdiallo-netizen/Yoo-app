import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Avatar from '../components/Avatar';
import { formatTime, formatDateLabel } from '../lib/utils';

export default function Chat() {
  const { convId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conv, setConv] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversation
  useEffect(() => {
    if (!convId || !user) return;
    supabase
      .from('conversations')
      .select(`
        id, participant_a, participant_b, unread_a, unread_b,
        profile_a:profiles!conversations_participant_a_fkey(id, name, avatar_url, is_online, last_seen),
        profile_b:profiles!conversations_participant_b_fkey(id, name, avatar_url, is_online, last_seen)
      `)
      .eq('id', convId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setConv(data);
        const other = data.participant_a === user.id ? data.profile_b : data.profile_a;
        setOtherProfile(other);
      });

    // Check favorite
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('conversation_id', convId)
      .single()
      .then(({ data }) => {
        if (data) { setIsFav(true); setFavId(data.id); }
      });
  }, [convId, user]);

  // Load messages
  useEffect(() => {
    if (!convId) return;
    supabase
      .from('messages')
      .select('id, content, sender_id, created_at, read')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data || []);
        setTimeout(scrollToBottom, 100);
      });

    // Mark as read
    if (user && conv) {
      const field = conv.participant_a === user.id ? 'unread_a' : 'unread_b';
      supabase.from('conversations').update({ [field]: 0 }).eq('id', convId).then(() => {});
    }
  }, [convId, user, conv, scrollToBottom]);

  // Realtime messages
  useEffect(() => {
    if (!convId) return;
    const channel = supabase
      .channel(`messages:${convId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        setTimeout(scrollToBottom, 50);
        // Mark read if other person's message
        if (payload.new.sender_id !== user.id && conv) {
          const field = conv.participant_a === user.id ? 'unread_a' : 'unread_b';
          supabase.from('conversations').update({ [field]: 0 }).eq('id', convId).then(() => {});
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [convId, user, conv, scrollToBottom]);

  // Realtime online status
  useEffect(() => {
    if (!otherProfile) return;
    const channel = supabase
      .channel(`profile:${otherProfile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${otherProfile.id}`,
      }, (payload) => {
        setOtherProfile(prev => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [otherProfile?.id]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setInput('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      read: false,
    });

    if (!error) {
      // Update conversation last message
      const otherField = conv?.participant_a === user.id ? 'unread_b' : 'unread_a';
      const currentUnread = conv?.participant_a === user.id ? conv.unread_b : conv.unread_a;
      await supabase.from('conversations').update({
        last_message: content,
        last_message_at: new Date().toISOString(),
        [otherField]: (currentUnread || 0) + 1,
      }).eq('id', convId);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const toggleFav = async () => {
    if (isFav && favId) {
      await supabase.from('favorites').delete().eq('id', favId);
      setIsFav(false);
      setFavId(null);
    } else {
      const { data } = await supabase.from('favorites')
        .insert({ user_id: user.id, conversation_id: convId })
        .select('id').single();
      setIsFav(true);
      setFavId(data?.id);
    }
  };

  // Group messages by date
  const grouped = [];
  let lastDate = '';
  messages.forEach(msg => {
    const label = formatDateLabel(msg.created_at);
    if (label !== lastDate) {
      grouped.push({ type: 'date', label });
      lastDate = label;
    }
    grouped.push({ type: 'msg', ...msg });
  });

  const statusText = otherProfile?.is_online
    ? 'En ligne'
    : otherProfile?.last_seen
    ? `Vu ${formatTime(otherProfile.last_seen)}`
    : '';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="chat-header">
        <button className="chat-header-back" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <Avatar profile={otherProfile} size={36} showOnline />

        <div className="chat-header-info">
          <div className="chat-header-name">{otherProfile?.name || '...'}</div>
          {statusText && (
            <div className={`chat-header-status ${otherProfile?.is_online ? 'online' : ''}`}>
              {statusText}
            </div>
          )}
        </div>

        <button onClick={toggleFav} className={`fav-star ${isFav ? 'active' : ''}`} title="Favori">
          <svg width="20" height="20" viewBox="0 0 24 24"
            fill={isFav ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.8">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {grouped.map((item, i) => {
          if (item.type === 'date') {
            return <div key={`d${i}`} className="chat-date-sep">{item.label}</div>;
          }
          const isOut = item.sender_id === user.id;
          return (
            <div key={item.id} className={`msg-row ${isOut ? 'out' : 'in'}`}>
              {!isOut && <Avatar profile={otherProfile} size={28} />}
              <div className={`msg-bubble ${isOut ? 'out' : 'in'}`}>
                {item.content}
                <span className="msg-time">{formatTime(item.created_at)}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          rows={1}
        />
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || sending}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
