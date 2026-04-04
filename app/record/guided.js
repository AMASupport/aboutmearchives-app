import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getToken } from '../../utils/auth';
import { getGuidedQuestions } from '../../utils/api';

export default function GuidedCategoriesScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCategories = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const { data, error } = await getGuidedQuestions(token);
    if (data && data.success) {
      setCategories(data.categories);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
  };

  const handleCategoryPress = (category) => {
    router.push({
      pathname: '/record/guided-questions',
      params: {
        categorySlug: category.slug,
        categoryName: category.name,
        categoryColor: category.color,
        categoryIcon: category.icon,
      },
    });
  };

  // Map icon_class (Font Awesome) to Ionicons equivalents
  const getIonIcon = (faIcon) => {
    const map = {
      'fas fa-child': 'balloon-outline',
      'fas fa-users': 'people-outline',
      'fas fa-briefcase': 'briefcase-outline',
      'fas fa-lightbulb': 'bulb-outline',
      'fas fa-star': 'star-outline',
      'fas fa-heart': 'heart-outline',
      'fas fa-globe': 'globe-outline',
      'fas fa-mountain': 'trending-up-outline',
      'fas fa-hands-helping': 'hand-left-outline',
      'fas fa-book': 'book-outline',
    };
    return map[faIcon] || 'help-circle-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading Questions Gallery...</Text>
      </View>
    );
  }

  const totalAnswered = categories.reduce((sum, c) => sum + c.answered_count, 0);
  const totalQuestions = categories.reduce((sum, c) => sum + c.question_count, 0);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2C5F7B']} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2C5F7B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Questions Gallery</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Overall Progress */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {totalAnswered} of {totalQuestions} Questions Answered
        </Text>
        <Text style={styles.summarySubtitle}>
          {categories.length} categories to explore
        </Text>
      </View>

      {/* Category Grid */}
      <View style={styles.grid}>
        {categories.map((cat) => {
          const progress = cat.question_count > 0
            ? (cat.answered_count / cat.question_count) * 100
            : 0;

          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(cat)}
              activeOpacity={0.7}
            >
              <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={getIonIcon(cat.icon)} size={28} color={cat.color} />
              </View>
              <Text style={styles.categoryName} numberOfLines={2}>{cat.name}</Text>
              <Text style={styles.categoryCount}>
                {cat.answered_count}/{cat.question_count} answered
              </Text>
              <View style={styles.miniProgressBg}>
                <View style={[styles.miniProgressFill, { width: `${progress}%`, backgroundColor: cat.color }]} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#636E72' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#2D3436' },

  summaryCard: {
    backgroundColor: '#2C5F7B', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, padding: 20, alignItems: 'center',
  },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  summarySubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 12,
    padding: 16, marginBottom: 12, marginHorizontal: '1.5%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    alignItems: 'center',
  },
  categoryIconBg: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center',
    alignItems: 'center', marginBottom: 10,
  },
  categoryName: {
    fontSize: 14, fontWeight: '700', color: '#2D3436', textAlign: 'center',
    marginBottom: 4, lineHeight: 18,
  },
  categoryCount: { fontSize: 11, color: '#636E72', marginBottom: 8 },
  miniProgressBg: {
    width: '100%', height: 4, backgroundColor: '#E8E8E8', borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: { height: 4, borderRadius: 2 },
});