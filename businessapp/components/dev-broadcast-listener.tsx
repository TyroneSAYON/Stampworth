import { useEffect, useState } from 'react';
import { Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

type Broadcast = { id: string; title: string; message: string; target: string; created_at: string };

export function DevBroadcastListener() {
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const slideAnim = useState(() => new Animated.Value(-200))[0];

  useEffect(() => {
    // Fetch any recent broadcasts (last 24h) on mount
    const loadRecent = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('dev_broadcasts')
        .select('*')
        .eq('is_active', true)
        .or('target.eq.all,target.eq.merchants')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setBroadcast(data[0]);
      }
    };
    loadRecent();

    // Listen for new broadcasts in realtime
    const channel = supabase
      .channel('merchant-dev-broadcasts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dev_broadcasts' }, (payload) => {
        const b = payload.new as Broadcast;
        if (b.target === 'all' || b.target === 'merchants') {
          setBroadcast(b);
          setDismissed((prev) => { const next = new Set(prev); next.delete(b.id); return next; });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Animate in/out
  useEffect(() => {
    if (broadcast && !dismissed.has(broadcast.id)) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: -200, duration: 200, useNativeDriver: true }).start();
    }
  }, [broadcast, dismissed]);

  if (!broadcast || dismissed.has(broadcast.id)) return null;

  const handleDismiss = () => {
    setDismissed((prev) => new Set(prev).add(broadcast.id));
  };

  const handleRead = () => {
    handleDismiss();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.banner} onPress={handleRead} activeOpacity={0.85}>
        <View style={styles.iconCircle}>
          <Ionicons name="megaphone" size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{broadcast.title}</Text>
          <Text style={styles.message} numberOfLines={1}>{broadcast.message}</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 50, left: 16, right: 16, zIndex: 999 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#2F4366', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: '#FFFFFF' },
  message: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.75)', marginTop: 1 },
});
