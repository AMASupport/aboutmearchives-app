import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getExploreVideos } from '../../utils/api';
import { Video } from 'expo-av';
import VideoPlayerModal from '../../components/VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const TYPE_CONFIG = {
  legacy_snapshot: { label: 'Snapshot', color: '#2C5F7B', icon: '📸' },
  guided_prescribed: { label: 'Snapshot', color: '#2C5F7B', icon: '📸' },
  guided_gallery: { label: 'Guided', color: '#8FA99A', icon: '💬' },
  self: { label: 'Self-Guided', color: '#D4A574', icon: '🎙️' },
};

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'snapshot', label: '📸 Snapshots' },
  { key: 'guided', label: '💬 Guided' },
  { key: 'self_guided', label: '🎙️ Self-Guided' },
];

export default function ExploreScreen() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadVideos = async (pageNum = 1, category = activeFilter, append = false) => {
    try {
      const result = await getExploreVideos(pageNum, category);
      if (result.data && result.data.videos) {
        if (append) {
          setVideos(prev => [...prev, ...result.data.videos]);
        } else {
          setVideos(result.data.videos);
        }
        if (result.data.pagination) {
          setTotalPages(result.data.pagination.total_pages);
        }
      }
    } catch (err) {
      console.error('Failed to load explore videos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setPage(1);
      loadVideos(1, activeFilter, false);
    }, [activeFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadVideos(1, activeFilter, false);
  };

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoadingMore(true);
    loadVideos(nextPage, activeFilter, true);
  };

  const handleFilterChange = (key) => {
    setActiveFilter(key);
    setPage(1);
    setLoading(true);
    loadVideos(1, key, false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading stories...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}
        onScroll={({ nativeEvent }) => {
          if (isCloseToBottom(nativeEvent)) loadMore();
        }}
        scrollEventThrottle={400}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#2C5F7B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Explore Stories</Text>
            <Text style={styles.headerSubtitle}>Discover stories from the community</Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => handleFilterChange(f.key)}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Video grid */}
        {videos.length > 0 ? (
          <View style={styles.grid}>
            {videos.map((video) => {
              const config = TYPE_CONFIG[video.video_type] || TYPE_CONFIG.legacy_snapshot;
              return (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  activeOpacity={0.7}
                  onPress={() => setSelectedVideo(video)}
                >
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
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {video.title || 'Untitled'}
                    </Text>
                    <View style={styles.creatorRow}>
                      <View style={styles.creatorDot}>
                        <Text style={styles.creatorInitial}>
                          {(video.creator_name || 'A').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.creatorName} numberOfLines={1}>
                        {video.creator_name || 'Anonymous'}
                      </Text>
                    </View>
                    <Text style={styles.cardDate}>{formatDate(video.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌍</Text>
            <Text style={styles.emptyTitle}>No stories yet</Text>
            <Text style={styles.emptyDesc}>
              Public stories from the community will appear here. Be the first to share your story!
            </Text>
          </View>
        )}

        {/* Load more indicator */}
        {loadingMore && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color="#2C5F7B" />
            <Text style={styles.loadingMoreText}>Loading more stories...</Text>
          </View>
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
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#2D3436', marginBottom: 6, lineHeight: 18 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  creatorDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#2C5F7B', alignItems: 'center', justifyContent: 'center' },
  creatorInitial: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  creatorName: { fontSize: 11, color: '#636E72', flex: 1 },
  cardDate: { fontSize: 10, color: '#B2BEC3' },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  loadingMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingMoreText: { fontSize: 13, color: '#636E72' },
});