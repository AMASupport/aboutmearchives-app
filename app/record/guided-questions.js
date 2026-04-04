import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getToken } from '../../utils/auth';
import { getGuidedQuestions } from '../../utils/api';

export default function GuidedQuestionsListScreen() {
  const params = useLocalSearchParams();
  const {
    categorySlug = '',
    categoryName = 'Questions',
    categoryColor = '#2C5F7B',
    categoryIcon = '',
  } = params;

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadQuestions = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const { data, error } = await getGuidedQuestions(token);
    if (data && data.success) {
      const category = data.categories.find(c => c.slug === categorySlug);
      if (category) {
        setQuestions(category.questions);
      }
    }
    setLoading(false);
  }, [categorySlug]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleRecord = (question) => {
    router.push({
      pathname: '/record/camera',
      params: {
        questionText: question.question_text,
        videoType: 'guided_gallery',
        maxDuration: 600,
        guidedQuestionId: question.id,
        guidedCategory: categorySlug,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2C5F7B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
          <Text style={styles.headerSubtitle}>{questions.length} questions</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Question List */}
      {questions.map((question, index) => (
        <TouchableOpacity
          key={question.id}
          style={styles.questionCard}
          onPress={() => handleRecord(question)}
          activeOpacity={0.7}
        >
          <View style={styles.questionContent}>
            <View style={styles.questionRow}>
              <View style={[styles.qNumber, { backgroundColor: categoryColor + '20' }]}>
                <Text style={[styles.qNumberText, { color: categoryColor }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.qTextContainer}>
                <Text style={styles.questionText}>{question.question_text}</Text>
                <View style={styles.metaRow}>
                  {question.difficulty_level && (
                    <Text style={styles.metaTag}>{question.difficulty_level}</Text>
                  )}
                  {question.estimated_duration > 0 && (
                    <Text style={styles.metaTag}>~{question.estimated_duration} min</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.questionAction}>
            {question.recorded ? (
              <View style={styles.recordedBadge}>
                <Ionicons name="checkmark-circle" size={22} color="#8FA99A" />
                <Text style={styles.recordedText}>Done</Text>
              </View>
            ) : (
              <View style={styles.recordBadge}>
                <Ionicons name="videocam" size={20} color="#D4A574" />
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436' },
  headerSubtitle: { fontSize: 12, color: '#636E72', marginTop: 2 },

  questionCard: {
    flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16,
    marginBottom: 10, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  questionContent: { flex: 1 },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  qNumber: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center',
    alignItems: 'center', marginRight: 10, marginTop: 2,
  },
  qNumberText: { fontSize: 13, fontWeight: '700' },
  qTextContainer: { flex: 1 },
  questionText: { fontSize: 15, color: '#2D3436', lineHeight: 21 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  metaTag: {
    fontSize: 11, color: '#636E72', backgroundColor: '#F0F0F0',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },

  questionAction: { marginLeft: 8, justifyContent: 'center' },
  recordedBadge: { alignItems: 'center' },
  recordedText: { fontSize: 10, color: '#8FA99A', marginTop: 2 },
  recordBadge: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDF5ED',
    justifyContent: 'center', alignItems: 'center',
  },
});