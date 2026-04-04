import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getToken } from '../../utils/auth';
import { getSnapshotProgress } from '../../utils/api';

export default function SnapshotsScreen() {
  const [questions, setQuestions] = useState([]);
  const [recordedCount, setRecordedCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProgress = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const result = await getSnapshotProgress(token);
    if (result.data && result.data.success) {
      setQuestions(result.data.questions);
      setRecordedCount(result.data.recorded_count);
      setTotalQuestions(result.data.total_questions);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProgress();
  };

  const handleRecord = (question) => {
    router.push({
      pathname: '/record/camera',
      params: {
        questionId: question.question_id,
        questionText: question.question_text,
        categoryTag: question.category_tag,
        videoType: 'guided_prescribed',
        maxDuration: 120,
        existingVideoId: question.recorded && question.video ? question.video.id : '',
      },
    });
  };

  const getStatusIcon = (question, index) => {
    if (question.recorded) {
      return { icon: 'checkmark-circle', color: '#8FA99A', label: 'Recorded' };
    }
    // First unrecorded = "next"
    const firstUnrecordedIndex = questions.findIndex(q => !q.recorded);
    if (index === firstUnrecordedIndex) {
      return { icon: 'radio-button-on', color: '#D4A574', label: 'Up Next' };
    }
    return { icon: 'radio-button-off', color: '#B0B0B0', label: 'Not Recorded' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading your Legacy Snapshot...</Text>
      </View>
    );
  }

  const progressPercent = totalQuestions > 0 ? (recordedCount / totalQuestions) * 100 : 0;

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
        <Text style={styles.headerTitle}>Legacy Snapshot</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Section */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>
          {recordedCount === totalQuestions ? 'Snapshot Complete!' : 'Your Progress'}
        </Text>
        <Text style={styles.progressCount}>
          {recordedCount} of {totalQuestions} Stories Told
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
        {recordedCount === 0 && (
          <Text style={styles.progressHint}>
            Record your first video to unlock the full platform
          </Text>
        )}
        {recordedCount > 0 && recordedCount < totalQuestions && (
          <Text style={styles.progressHint}>
            Keep going — every story matters
          </Text>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#2C5F7B" />
        <Text style={styles.infoText}>
          Each video is up to 2 minutes. Record in any order. You can re-record any question anytime.
        </Text>
      </View>

      {/* Question Cards */}
      {questions.map((question, index) => {
        const status = getStatusIcon(question, index);
        return (
          <TouchableOpacity
            key={question.question_id}
            style={[
              styles.questionCard,
              question.recorded && styles.questionCardRecorded,
            ]}
            onPress={() => handleRecord(question)}
            activeOpacity={0.7}
          >
            <View style={styles.questionLeft}>
              <View style={[styles.questionNumber, question.recorded && styles.questionNumberDone]}>
                <Text style={[styles.questionNumberText, question.recorded && styles.questionNumberTextDone]}>
                  {question.sort_order}
                </Text>
              </View>
            </View>

            <View style={styles.questionCenter}>
              <Text style={styles.categoryTag}>{question.category_tag}</Text>
              <Text style={styles.questionText} numberOfLines={2}>
                {question.question_text}
              </Text>
              {question.recorded && question.video && (
                <Text style={styles.recordedDate}>
                  Recorded {new Date(question.video.created_at).toLocaleDateString()}
                </Text>
              )}
            </View>

            <View style={styles.questionRight}>
              <Ionicons name={status.icon} size={24} color={status.color} />
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
              {question.recorded ? (
                <TouchableOpacity style={styles.reRecordBtn}>
                  <Ionicons name="refresh" size={16} color="#2C5F7B" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="videocam" size={18} color="#D4A574" style={{ marginTop: 4 }} />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

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

  progressCard: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    elevation: 2,
  },
  progressTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 4 },
  progressCount: { fontSize: 14, color: '#636E72', marginBottom: 12 },
  progressBarBg: {
    height: 8, backgroundColor: '#E8E8E8', borderRadius: 4, overflow: 'hidden',
  },
  progressBarFill: {
    height: 8, backgroundColor: '#8FA99A', borderRadius: 4,
  },
  progressHint: { fontSize: 13, color: '#636E72', marginTop: 8, fontStyle: 'italic' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EBF5FB',
    marginHorizontal: 16, marginBottom: 16, borderRadius: 8, padding: 12, gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: '#2C5F7B', lineHeight: 18 },

  questionCard: {
    flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16,
    marginBottom: 10, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
    borderLeftWidth: 4, borderLeftColor: '#D4A574',
  },
  questionCardRecorded: {
    borderLeftColor: '#8FA99A', opacity: 0.9,
  },

  questionLeft: { marginRight: 12, justifyContent: 'flex-start', paddingTop: 2 },
  questionNumber: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FAF8F5',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#D4A574',
  },
  questionNumberDone: { backgroundColor: '#8FA99A', borderColor: '#8FA99A' },
  questionNumberText: { fontSize: 14, fontWeight: '700', color: '#D4A574' },
  questionNumberTextDone: { color: '#FFF' },

  questionCenter: { flex: 1, justifyContent: 'center' },
  categoryTag: {
    fontSize: 11, fontWeight: '600', color: '#2C5F7B', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 2,
  },
  questionText: { fontSize: 15, color: '#2D3436', lineHeight: 20 },
  recordedDate: { fontSize: 11, color: '#8FA99A', marginTop: 4 },

  questionRight: { marginLeft: 8, alignItems: 'center', justifyContent: 'center', width: 60 },
  statusLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  reRecordBtn: {
    marginTop: 4, padding: 4, borderRadius: 12, backgroundColor: '#EBF5FB',
  },
});