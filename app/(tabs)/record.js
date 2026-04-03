import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function RecordScreen() {
  return (
    <ScrollView style={styles.container}>
      <RecordPath
        title="Legacy Snapshot"
        description="Your story in 10 essential questions. 2 minutes each."
        badge="Free"
        badgeColor="#E1F5EE"
        badgeText="#0F6E56"
        accentColor="#2C5F7B"
        featured
      />
      <RecordPath
        title="Guided Questions"
        description="140+ curated prompts across 10 categories."
        badge="Premium"
        badgeColor="#FAEEDA"
        badgeText="#854F0B"
        accentColor="#D4A574"
      />
      <RecordPath
        title="Self-Guided Recording"
        description="Record up to 10 minutes on any topic you choose."
        badge="Premium"
        badgeColor="#FAEEDA"
        badgeText="#854F0B"
        accentColor="#8FA99A"
      />
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Start with your <Text style={{ color: '#2C5F7B', fontWeight: '700' }}>Legacy Snapshot</Text> — it's free and takes just 2 minutes per question.
        </Text>
      </View>
    </ScrollView>
  );
}

function RecordPath({ title, description, badge, badgeColor, badgeText, accentColor, featured }) {
  return (
    <TouchableOpacity style={[styles.pathCard, featured && styles.pathFeatured]} activeOpacity={0.7}>
      <View style={[styles.pathIcon, { backgroundColor: accentColor }]}>
        <Text style={styles.pathIconText}>{title === 'Legacy Snapshot' ? '◆' : title === 'Guided Questions' ? '?' : '🎙'}</Text>
      </View>
      <View style={styles.pathInfo}>
        <Text style={styles.pathTitle}>{title}</Text>
        <Text style={styles.pathDesc}>{description}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: badgeColor }]}>
        <Text style={[styles.badgeText, { color: badgeText }]}>{badge}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  pathCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 0.5, borderColor: '#E8E5DE', marginBottom: 10, gap: 12 },
  pathFeatured: { borderColor: '#D4A574', borderWidth: 1.5 },
  pathIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pathIconText: { color: '#FFF', fontSize: 18 },
  pathInfo: { flex: 1 },
  pathTitle: { fontSize: 14, fontWeight: '700', color: '#2D3436', marginBottom: 2 },
  pathDesc: { fontSize: 11, color: '#636E72', lineHeight: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  hint: { backgroundColor: '#F5F0E8', borderRadius: 10, padding: 12, marginTop: 4 },
  hintText: { fontSize: 12, color: '#636E72', textAlign: 'center', lineHeight: 18 },
});