import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function TapestryScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>0</Text>
          <Text style={styles.statLabel}>Extended network</Text>
        </View>
      </View>
      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Invite a friend</Text>
        <View style={styles.inviteRow}>
          <View style={styles.inviteInput}><Text style={styles.inputPlaceholder}>Friend's name</Text></View>
          <View style={styles.inviteInput}><Text style={styles.inputPlaceholder}>Email</Text></View>
          <TouchableOpacity style={styles.sendBtn} activeOpacity={0.7}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.viewVizBtn} activeOpacity={0.7}>
        <Text style={styles.viewVizText}>✦  View Tapestry visualization</Text>
      </TouchableOpacity>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🕸</Text>
        <Text style={styles.emptyTitle}>Weave your tapestry</Text>
        <Text style={styles.emptyDesc}>Invite friends to connect. Every life is woven into others — make yours visible.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#E8E5DE' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#2C5F7B' },
  statLabel: { fontSize: 10, color: '#636E72', marginTop: 2 },
  inviteCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: '#E8E5DE', marginBottom: 12 },
  inviteLabel: { fontSize: 12, fontWeight: '700', color: '#2D3436', marginBottom: 8 },
  inviteRow: { flexDirection: 'row', gap: 6 },
  inviteInput: { flex: 1, height: 34, borderWidth: 0.5, borderColor: '#E0DDD6', borderRadius: 6, justifyContent: 'center', paddingHorizontal: 8, backgroundColor: '#FAF8F5' },
  inputPlaceholder: { fontSize: 11, color: '#999' },
  sendBtn: { height: 34, paddingHorizontal: 14, backgroundColor: '#2C5F7B', borderRadius: 6, justifyContent: 'center' },
  sendBtnText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  viewVizBtn: { backgroundColor: '#2C5F7B', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  viewVizText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});