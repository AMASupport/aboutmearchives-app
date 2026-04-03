import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { getToken, getUser, clearAuth } from '../../utils/auth';
import { getDashboard } from '../../utils/api';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ snapshots: 0, family: 0, friends: 0, vault: 0 });

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  async function checkAuthAndLoad() {
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const savedUser = await getUser();
    setUser(savedUser);

    const result = await getDashboard(token);
    if (result.error && result.status === 401) {
      router.replace('/login');
      return;
    }

    if (result.data && result.data.stats) {
      setStats(result.data.stats);
    }

    setLoading(false);
  }

  async function handleLogout() {
    await clearAuth();
    router.replace('/login');
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7B" />
      </View>
    );
  }

  const greeting = user ? `Welcome, ${user.first_name || user.display_name}` : 'Welcome';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>{greeting}</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.snapshots}</Text>
          <Text style={styles.statLabel}>Snapshots</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.family}</Text>
          <Text style={styles.statLabel}>Family</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.friends}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
      </View>
      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Record your next snapshot</Text>
        <Text style={styles.ctaSub}>Tell us who you are — just 2 minutes</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>RECENT ACTIVITY</Text>
        <Text style={styles.cardText}>Welcome to About Me Archives!</Text>
        <Text style={styles.cardSub}>Your story starts here</Text>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Explore stories</Text>
      </View>
      <Text style={styles.placeholder}>Community stories will appear here</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5' },
  greeting: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#E8E5DE' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#2C5F7B' },
  statLabel: { fontSize: 11, color: '#636E72', marginTop: 2 },
  ctaCard: { backgroundColor: '#D4A574', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  ctaTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
  card: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: '#E8E5DE', marginBottom: 12 },
  cardLabel: { fontSize: 10, color: '#636E72', letterSpacing: 0.5, marginBottom: 4 },
  cardText: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  cardSub: { fontSize: 12, color: '#636E72', marginTop: 2 },
  sectionHeader: { marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2D3436' },
  placeholder: { fontSize: 13, color: '#636E72', textAlign: 'center', paddingVertical: 24 },
  logoutBtn: { marginTop: 20, marginBottom: 40, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E8E5DE', alignItems: 'center' },
  logoutText: { color: '#636E72', fontSize: 14, fontWeight: '600' },
});