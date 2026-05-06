import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Dimensions,
  Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getToken } from '../../utils/auth';
import { getMyVideos, deleteVideo } from '../../utils/api';
import { Video } from 'expo-av';
import VideoPlayerModal from '../../components/VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const TYPE_CONFIG = {
  snapshot: { label: 'Snapshot', color: '#2C5F7B', icon: '📸' },
  guided: { label: 'Guided', color: '#8FA99A', icon: '💬' },
  self_guided: { label: 'Self-Guided', color: '#D4A574', icon: '🎙️' },
  uploaded: { label: 'Uploaded', color: '#636E72', icon: '📤' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'snapshot', label: '📸 Snapshots' },
  { key: 'guided', label: '💬 Guided' },
  { key: 'self_guided', label: '🎙️ Self-Guided' },
];

export default function MyVideosScreen() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState(null);

  const loadVideos = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await getMyVideos(token);
      if (result.data && result.data.videos) {
        setVideos(result.data.videos);
      } else if (result.data && Array.isArray(result.data)) {
        setVideos(result.data);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadVideos();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const handleDelete = (video) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to permanently delete this video? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const res = await deleteVideo(token, video.id);
              if (res.data && res.data.success) {
                Alert.alert('Deleted', 'Video has been deleted.');
                loadVideos();
              } else {
                Alert.alert('Error', res.error || 'Failed to delete video.');
              }
            } catch (err) {
              Alert.alert('Error', 'Something went wrong.');
            }
          },
        },
      ]
    );
  };

  const filteredVideos = activeFilter === 'all'
    ? videos
    : videos.filter(v => v.video_type === activeFilter);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading your videos...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#2C5F7B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>My Videos</Text>
            <Text style={styles.headerSubtitle}>{videos.length} video{videos.length !== 1 ? 's' : ''} recorded</Text>
          </View>
        </View>

        {/* Filter chips */}
        {videos.length > 0 && (
          <View style={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Video grid */}
        {filteredVideos.length > 0 ? (
          <View style={styles.grid}>
            {filteredVideos.map((video) => {
              const config = TYPE_CONFIG[video.video_type] || TYPE_CONFIG.snapshot;
              return (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  activeOpacity={0.7}
                  onPress={() => setSelectedVideo(video)}
                  onLongPress={() => handleDelete(video)}
                >
                  {/* Thumbnail placeholder */}
                  <View style={[styles.thumbnail, { backgroundColor: config.color }]}>
                    {video.cdn_url ? (
                      <Video
                        source={{ uri: video.cdn_url }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                        shouldPlay={false}
                        isMuted={true}
                        positionMillis={1000}
                      />
                    ) : null}
                    <Ionicons name="play-circle-outline" size={36} color="rgba(255,255,255,0.9)" />
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{config.icon} {config.label}</Text>
                    </View>
                  </View>
                  {/* Info */}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardQuestion} numberOfLines={2}>
                      {video.title || video.question_text || config.label + ' Recording'}
                    </Text>
                    <Text style={styles.cardDate}>{formatDate(video.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : videos.length > 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No videos match this filter</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyTitle}>No videos yet</Text>
            <Text style={styles.emptyDesc}>
              Start recording your story! Head to the Record tab to create your first video.
            </Text>
            <TouchableOpacity
              style={styles.recordBtn}
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/record')}
            >
              <Text style={styles.recordBtnText}>Start Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredVideos.length > 0 && (
          <Text style={styles.deleteHint}>Long-press any video to delete it</Text>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Video Player Modal */}
      <VideoPlayerModal
        visible={!!selectedVideo}
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#636E72', marginTop: 12, fontSize: 14 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#E8E5DE' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#2D3436' },
  headerSubtitle: { fontSize: 13, color: '#636E72', marginTop: 1 },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 0.5, borderColor: '#E8E5DE' },
  filterChipActive: { backgroundColor: '#2C5F7B', borderColor: '#2C5F7B' },
  filterChipText: { fontSize: 12, color: '#636E72' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  videoCard: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: '#E8E5DE' },
  thumbnail: { width: '100%', height: CARD_WIDTH * 0.75, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  cardInfo: { padding: 10 },
  cardQuestion: { fontSize: 13, fontWeight: '600', color: '#2D3436', marginBottom: 4, lineHeight: 18 },
  cardDate: { fontSize: 11, color: '#636E72' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20, marginBottom: 16 },
  recordBtn: { backgroundColor: '#D4A574', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  recordBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  deleteHint: { textAlign: 'center', fontSize: 11, color: '#B2BEC3', marginTop: 16 },
});