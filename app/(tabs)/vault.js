import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function VaultScreen() {
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.createBtn} activeOpacity={0.7}>
        <Text style={styles.createBtnText}>+  Create a new vault message</Text>
      </TouchableOpacity>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🔒</Text>
        <Text style={styles.emptyTitle}>Messages across time</Text>
        <Text style={styles.emptyDesc}>Record video messages for your loved ones — sealed until the moment you choose. Birthdays, milestones, or after you're gone.</Text>
        <View style={styles.typeRow}>
          <View style={styles.typeChip}><Text style={styles.typeText}>📅 Scheduled</Text></View>
          <View style={styles.typeChip}><Text style={styles.typeText}>🕊 After passing</Text></View>
          <View style={styles.typeChip}><Text style={styles.typeText}>🎓 Life event</Text></View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  createBtn: { backgroundColor: '#D4A574', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16, marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: '#E8E5DE' },
  typeText: { fontSize: 11, color: '#2D3436' },
});