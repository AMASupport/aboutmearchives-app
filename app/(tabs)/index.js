import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Snapshots</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Family</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
      </View>
      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Record your first snapshot</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
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
});