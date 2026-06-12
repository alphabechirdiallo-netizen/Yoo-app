import { useEffect, useRef } from 'react';
import { supabase } from './supabase';

export function usePresence(userId) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Mark user online
    const updatePresence = (isOnline) => {
      supabase.from('profiles').update({
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      }).eq('id', userId).then(() => {});
    };

    updatePresence(true);

    // Set up channel for realtime presence
    channelRef.current = supabase.channel(`presence:${userId}`);
    channelRef.current.subscribe();

    // Mark offline on unload
    const handleUnload = () => updatePresence(false);
    window.addEventListener('beforeunload', handleUnload);

    // Heartbeat every 30s
    const interval = setInterval(() => updatePresence(true), 30000);

    return () => {
      updatePresence(false);
      window.removeEventListener('beforeunload', handleUnload);
      clearInterval(interval);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [userId]);
}
