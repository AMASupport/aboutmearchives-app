import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Dimensions, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio, Video } from 'expo-av';
import { getToken, getUser, clearAuth } from '../../utils/auth';
import { getDashboard, getMyVideos, getExploreVideos } from '../../utils/api';
import VideoPlayerModal from '../../components/VideoPlayerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_CARD_WIDTH = 160;

const EXPLORE_TYPE_CONFIG = {
  legacy_snapshot: { label: 'Snapshot', color: '#2C5F7B', icon: '📸' },
  guided_prescribed: { label: 'Snapshot', color: '#2C5F7B', icon: '📸' },
  guided_gallery: { label: 'Guided', color: '#8FA99A', icon: '💬' },
  self: { label: 'Self-Guided', color: '#D4A574', icon: '🎙️' },
};

const TYPE_CONFIG = {
  snapshot: { label: 'Snapshot', color: '#2C5F7B', icon: '📸' },
  guided: { label: 'Guided', color: '#8FA99A', icon: '💬' },
  self_guided: { label: 'Self-Guided', color: '#D4A574', icon: '🎙️' },
  uploaded: { label: 'Uploaded', color: '#636E72', icon: '📤' },
};

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ snapshots: 0, family: 0, friends: 0, vault: 0 });
  const [myVideos, setMyVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [exploreVideos, setExploreVideos] = useState([]);

  const loadData = async () => {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    const savedUser = await getUser();
    setUser(savedUser);

    // Load dashboard stats
    const dashResult = await getDashboard(token);
    if (dashResult.error && dashResult.status === 401) {
      router.replace('/login');
      return;
    }
    if (dashResult.data && dashResult.data.stats) {
      setStats(dashResult.data.stats);
    }

    // Load my videos
    try {
      const videoResult = await getMyVideos(token);
      if (videoResult.data && videoResult.data.videos) {
        setMyVideos(videoResult.data.videos);
      } else if (videoResult.data && Array.isArray(videoResult.data)) {
        setMyVideos(videoResult.data);
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    }

    // Load explore stories
    try {
      const exploreResult = await getExploreVideos();
      if (exploreResult.data && exploreResult.data.videos) {
        setExploreVideos(exploreResult.data.videos.slice(0, 6));
      }
    } catch (err) {
      console.error('Failed to load explore videos:', err);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  async function handleLogout() {
    await clearAuth();
    router.replace('/login');
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7B" />
      </View>
    );
  }

  const greeting = user ? `Welcome, ${user.first_name || user.display_name}` : 'Welcome';
  const recentVideos = myVideos.slice(0, 6);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}
      >
        <Text style={styles.greeting}>{greeting}</Text>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.snapshots}</Text>
            <Text style={styles.statLabel}>Snapshots</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.family}</Text>
            <Text style={styles.statLabel}>Family</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.friends}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.vault || 0}</Text>
            <Text style={styles.statLabel}>Vault</Text>
          </View>
        </View>

        {/* CTA Card */}
        <TouchableOpacity
          style={styles.ctaCard}
          activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/record')}
        >
          <Text style={styles.ctaTitle}>Record your next snapshot</Text>
          <Text style={styles.ctaSub}>Tell us who you are — just 2 minutes</Text>
        </TouchableOpacity>

        {/* Recent Activity */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>RECENT ACTIVITY</Text>
          <Text style={styles.cardText}>Welcome to About Me Archives!</Text>
          <Text style={styles.cardSub}>Your story starts here</Text>
        </View>

        {/* ============================================ */}
        {/* MY VIDEOS SECTION                           */}
        {/* ============================================ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Videos</Text>
          {myVideos.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/my-videos')}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentVideos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.videoScroll}
          >
            {recentVideos.map((video) => {
              const config = TYPE_CONFIG[video.video_type] || TYPE_CONFIG.snapshot;
              return (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  activeOpacity={0.7}
                  onPress={() => setSelectedVideo(video)}
                >
                  <View style={[styles.videoThumb, { backgroundColor: config.color }]}>
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
                    <Ionicons name="play-circle-outline" size={32} color="rgba(255,255,255,0.9)" />
                    <View style={styles.videoTypeBadge}>
                      <Text style={styles.videoTypeBadgeText}>{config.icon} {config.label}</Text>
                    </View>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoQuestion} numberOfLines={2}>
                      {video.title || video.question_text || config.label + ' Recording'}
                    </Text>
                    <Text style={styles.videoDate}>{formatDate(video.created_at)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyVideos}>
            <Text style={styles.emptyVideosIcon}>🎬</Text>
            <Text style={styles.emptyVideosText}>No videos recorded yet</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/record')}>
              <Text style={styles.emptyVideosLink}>Record your first video →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ============================================ */}
        {/* EXPLORE STORIES SECTION                     */}
        {/* ============================================ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Stories</Text>
          {exploreVideos.length > 0 && (
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          )}
        </View>

        {exploreVideos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.videoScroll}
          >
            {exploreVideos.map((video) => {
              const config = EXPLORE_TYPE_CONFIG[video.video_type] || EXPLORE_TYPE_CONFIG.legacy_snapshot;
              return (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  activeOpacity={0.7}
                  onPress={() => setSelectedVideo(video)}
                >
                  <View style={[styles.videoThumb, { backgroundColor: config.color }]}>
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
                    <Ionicons name="play-circle-outline" size={32} color="rgba(255,255,255,0.9)" />
                    <View style={styles.videoTypeBadge}>
                      <Text style={styles.videoTypeBadgeText}>{config.icon} {config.label}</Text>
                    </View>
                  </View>
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoQuestion} numberOfLines={2}>
                      {video.title || 'Untitled'}
                    </Text>
                    <Text style={styles.exploreCreator} numberOfLines={1}>
                      {video.creator_name || 'Anonymous'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyVideos}>
            <Text style={styles.emptyVideosIcon}>🌍</Text>
            <Text style={styles.emptyVideosText}>No community stories yet</Text>
          </View>
        )}

        {/* Sign Out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5' },

  greeting: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 12 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#E8E5DE' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#2C5F7B' },
  statLabel: { fontSize: 11, color: '#636E72', marginTop: 2 },

  ctaCard: { backgroundColor: '#D4A574', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  ctaTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  ctaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },

  card: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: '#E8E5DE', marginBottom: 16 },
  cardLabel: { fontSize: 10, color: '#636E72', letterSpacing: 0.5, marginBottom: 4 },
  cardText: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  cardSub: { fontSize: 12, color: '#636E72', marginTop: 2 },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436' },
  seeAll: { fontSize: 13, color: '#2C5F7B', fontWeight: '600' },

  // My Videos horizontal scroll
  videoScroll: { paddingRight: 16, gap: 10, marginBottom: 20 },
  videoCard: { width: VIDEO_CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: '#E8E5DE' },
  videoThumb: { width: '100%', height: VIDEO_CARD_WIDTH * 0.7, alignItems: 'center', justifyContent: 'center' },
  videoTypeBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  videoTypeBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '600' },
  videoInfo: { padding: 8 },
  videoQuestion: { fontSize: 12, fontWeight: '600', color: '#2D3436', marginBottom: 3, lineHeight: 16 },
  videoDate: { fontSize: 10, color: '#636E72' },
  exploreCreator: { fontSize: 11, color: '#8FA99A', fontWeight: '500' },

  // Empty videos
  emptyVideos: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#FFF', borderRadius: 12, marginBottom: 20, borderWidth: 0.5, borderColor: '#E8E5DE' },
  emptyVideosIcon: { fontSize: 32, marginBottom: 6 },
  emptyVideosText: { fontSize: 13, color: '#636E72', marginBottom: 6 },
  emptyVideosLink: { fontSize: 13, color: '#2C5F7B', fontWeight: '600' },

  // Explore placeholder
  placeholder: { fontSize: 13, color: '#636E72', textAlign: 'center', paddingVertical: 24 },

  // Logout
  logoutBtn: { marginTop: 20, marginBottom: 40, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E8E5DE', alignItems: 'center' },
  logoutText: { color: '#636E72', fontSize: 14, fontWeight: '600' },
});