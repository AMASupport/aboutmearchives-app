import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function FamilyScreen() {
  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.viewTreeBtn} activeOpacity={0.7}>
        <Text style={styles.viewTreeText}>⚇  View family tree</Text>
      </TouchableOpacity>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🌳</Text>
        <Text style={styles.emptyTitle}>Start your family tree</Text>
        <Text style={styles.emptyDesc}>Add family members to build a living tree that grows as your family joins.</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Text style={styles.addBtnText}>+ Add family member</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  viewTreeBtn: { backgroundColor: '#2C5F7B', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  viewTreeText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20, marginBottom: 16 },
  addBtn: { backgroundColor: '#D4A574', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});