import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getToken } from '../../utils/auth';
import { getMyVideos } from '../../utils/api';

export default function SelfGuidedScreen() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVideos = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    const { data, error } = await getMyVideos(token);
    if (data && data.success) {
      // Filter to self-guided only
      const selfVideos = data.videos.filter(v => v.video_type === 'self');
      setVideos(selfVideos);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleStartRecording = () => {
    router.push({
      pathname: '/record/camera',
      params: {
        questionText: '',
        videoType: 'self',
        maxDuration: 600,
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#2C5F7B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Self-Guided Recording</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Ionicons name="mic-outline" size={32} color="#2C5F7B" />
        <Text style={styles.infoTitle}>Tell Your Story, Your Way</Text>
        <Text style={styles.infoText}>
          No prompts, no structure — just you and the camera for up to 10 minutes.
          Share whatever is on your heart.
        </Text>
      </View>

      {/* Record Button */}
      <TouchableOpacity style={styles.recordCta} onPress={handleStartRecording} activeOpacity={0.8}>
        <View style={styles.recordCtaIcon}>
          <Ionicons name="videocam" size={28} color="#FFF" />
        </View>
        <Text style={styles.recordCtaText}>Start Recording</Text>
        <Text style={styles.recordCtaSub}>Up to 10 minutes</Text>
      </TouchableOpacity>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Recording Tips</Text>
        {[
          'Find a quiet, well-lit space',
          'Position your phone at eye level',
          'Speak naturally — there are no wrong answers',
          'Share a story, a memory, or a message',
          'Take a breath before you begin',
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#8FA99A" />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Previous Recordings */}
      {videos.length > 0 && (
        <View style={styles.previousSection}>
          <Text style={styles.previousTitle}>Your Recordings ({videos.length})</Text>
          {videos.map((video) => (
            <View key={video.id} style={styles.videoCard}>
              <Ionicons name="film-outline" size={24} color="#2C5F7B" />
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle}>{video.title || 'Self-Guided Recording'}</Text>
                <Text style={styles.videoMeta}>
                  {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')} •{' '}
                  {new Date(video.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.privacyBadge}>{video.privacy_setting}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#2D3436' },

  infoCard: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  infoTitle: {
    fontSize: 18, fontWeight: '700', color: '#2D3436', marginTop: 12, marginBottom: 8,
  },
  infoText: { fontSize: 14, color: '#636E72', textAlign: 'center', lineHeight: 20 },

  recordCta: {
    backgroundColor: '#D4A574', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, padding: 24, alignItems: 'center',
  },
  recordCtaIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  recordCtaText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  recordCtaSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  tipsCard: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  tipsTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipText: { fontSize: 14, color: '#636E72', flex: 1 },

  previousSection: { marginHorizontal: 16, marginBottom: 16 },
  previousTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 10 },
  videoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 10, padding: 14, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  videoInfo: { flex: 1 },
  videoTitle: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  videoMeta: { fontSize: 12, color: '#636E72', marginTop: 2 },
  privacyBadge: {
    fontSize: 10, color: '#636E72', backgroundColor: '#F0F0F0',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, textTransform: 'capitalize',
  },
});