import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getToken } from '../../utils/auth';
import { getFamilyMembers } from '../../utils/api';

export default function FamilyScreen() {
  const [members, setMembers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    const result = await getFamilyMembers(token);
    if (result.data && result.data.success) {
      setMembers(result.data.members);
      setMeta(result.data.meta);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'registered': return { label: 'Joined', color: '#27ae60', bg: '#e8f8f0' };
      case 'invited': return { label: 'Invited', color: '#D4A574', bg: '#fdf3eb' };
      default: return { label: 'Not Invited', color: '#636E72', bg: '#f0f0f0' };
    }
  };

  const getInitials = (first, last) => {
    return ((first || '')[0] || '') + ((last || '')[0] || '');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading family...</Text>
      </View>
    );
  }

  const nonSelfMembers = members.filter(m => !m.is_self);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}
    >
      {/* Header stats */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Family Tree</Text>
        <Text style={styles.headerSubtitle}>
          {meta ? `${meta.total_members} member${meta.total_members !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      {/* View Tree button */}
      <TouchableOpacity style={styles.viewTreeBtn} activeOpacity={0.7}>
        <Text style={styles.viewTreeText}>🌳  View Family Tree</Text>
      </TouchableOpacity>

      {/* Tier info for free users */}
      {meta && !meta.is_premium && (
        <View style={styles.tierBar}>
          <Text style={styles.tierText}>
            {meta.addable_count} of {meta.max_free} members used
          </Text>
          <View style={styles.tierProgress}>
            <View style={[styles.tierFill, { width: `${Math.min((meta.addable_count / meta.max_free) * 100, 100)}%` }]} />
          </View>
        </View>
      )}

      {/* Member cards */}
      {nonSelfMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌳</Text>
          <Text style={styles.emptyTitle}>Start your family tree</Text>
          <Text style={styles.emptyDesc}>
            Add family members to build a living tree that grows as your family joins.
          </Text>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+ Add Family Member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {nonSelfMembers.map((member) => {
            const badge = getStatusBadge(member.status);
            return (
              <TouchableOpacity key={member.id} style={styles.card} activeOpacity={0.7}>
                {/* Photo or initials */}
                {member.photo ? (
                  <Image source={{ uri: member.photo }} style={styles.photo} />
                ) : (
                  <View style={styles.initialsCircle}>
                    <Text style={styles.initialsText}>
                      {getInitials(member.first_name, member.last_name)}
                    </Text>
                  </View>
                )}

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {member.first_name} {member.last_name}
                  </Text>
                  <Text style={styles.cardRelationship}>{member.relationship}</Text>
                  {member.is_deceased && (
                    <Text style={styles.deceasedLabel}>✝ Memorial</Text>
                  )}
                </View>

                {/* Status badge */}
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add member button at bottom */}
          {meta && meta.can_add && (
            <TouchableOpacity style={styles.addBtnBottom} activeOpacity={0.7}>
              <Text style={styles.addBtnBottomText}>+ Add Family Member</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  loadingContainer: { flex: 1, backgroundColor: '#FAF8F5', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#636E72', fontSize: 14 },

  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#2D3436' },
  headerSubtitle: { fontSize: 14, color: '#636E72', marginTop: 4 },

  viewTreeBtn: { backgroundColor: '#2C5F7B', borderRadius: 12, padding: 14, alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  viewTreeText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  tierBar: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 10, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tierText: { fontSize: 12, color: '#636E72', marginBottom: 6 },
  tierProgress: { height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden' },
  tierFill: { height: '100%', backgroundColor: '#2C5F7B', borderRadius: 3 },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#636E72', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  addBtn: { backgroundColor: '#D4A574', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  photo: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  initialsCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2C5F7B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initialsText: { color: '#FFF', fontSize: 18, fontWeight: '700' },

  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
  cardRelationship: { fontSize: 13, color: '#636E72', marginTop: 2 },
  deceasedLabel: { fontSize: 11, color: '#9A9A9A', marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  addBtnBottom: { marginHorizontal: 16, marginTop: 6, backgroundColor: '#D4A574', borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnBottomText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});