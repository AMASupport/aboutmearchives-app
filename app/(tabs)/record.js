import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function RecordScreen() {
  const handleNavigate = (path) => {
    router.push(path);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>Record Your Story</Text>

      <RecordPath
        title="Legacy Snapshot"
        description="Your story in 10 essential questions. 2 minutes each."
        badge="Free"
        badgeColor="#E1F5EE"
        badgeText="#0F6E56"
        accentColor="#2C5F7B"
        icon="film-outline"
        featured
        onPress={() => handleNavigate('/record/snapshots')}
      />
      <RecordPath
        title="Guided Questions"
        description="140+ curated prompts across 10 categories."
        badge="Premium"
        badgeColor="#FAEEDA"
        badgeText="#854F0B"
        accentColor="#D4A574"
        icon="help-circle-outline"
        onPress={() => handleNavigate('/record/guided')}
      />
      <RecordPath
        title="Self-Guided Recording"
        description="Record up to 10 minutes on any topic you choose."
        badge="Premium"
        badgeColor="#FAEEDA"
        badgeText="#854F0B"
        accentColor="#8FA99A"
        icon="mic-outline"
        onPress={() => handleNavigate('/record/self-guided')}
      />

      <View style={styles.hint}>
        <Ionicons name="sparkles" size={16} color="#D4A574" />
        <Text style={styles.hintText}>
          Start with your <Text style={{ color: '#2C5F7B', fontWeight: '700' }}>Legacy Snapshot</Text> — it's free and takes just 2 minutes per question.
        </Text>
      </View>
    </ScrollView>
  );
}

function RecordPath({ title, description, badge, badgeColor, badgeText, accentColor, icon, featured, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.pathCard, featured && styles.pathFeatured]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={[styles.pathIcon, { backgroundColor: accentColor }]}>
        <Ionicons name={icon} size={22} color="#FFF" />
      </View>
      <View style={styles.pathInfo}>
        <Text style={styles.pathTitle}>{title}</Text>
        <Text style={styles.pathDesc}>{description}</Text>
      </View>
      <View style={styles.pathRight}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: badgeText }]}>{badge}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#B0B0B0" style={{ marginTop: 4 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16, paddingTop: 60 },
  pageTitle: {
    fontSize: 22, fontWeight: '700', color: '#2D3436', marginBottom: 16, textAlign: 'center',
  },
  pathCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFF',
    borderRadius: 12, padding: 16, borderWidth: 0.5, borderColor: '#E8E5DE',
    marginBottom: 12, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  pathFeatured: { borderColor: '#D4A574', borderWidth: 1.5 },
  pathIcon: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  pathInfo: { flex: 1 },
  pathTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 3 },
  pathDesc: { fontSize: 13, color: '#636E72', lineHeight: 18 },
  pathRight: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  hint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F5F0E8', borderRadius: 10, padding: 14, marginTop: 4,
  },
  hintText: { flex: 1, fontSize: 13, color: '#636E72', lineHeight: 18 },
});