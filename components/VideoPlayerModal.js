import React, { useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Dimensions, ScrollView, Platform,
} from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VideoPlayerModal({ visible, video, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (visible) {
      Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.stopAsync().catch(() => {});
    }
  }, [visible]);

  if (!video) return null;

  const videoUrl = video.cdn_url || video.bunny_url || video.video_url || '';

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const typeLabel = (type) => {
    switch (type) {
      case 'snapshot': return 'Legacy Snapshot';
      case 'legacy_snapshot': return 'Legacy Snapshot';
      case 'guided_prescribed': return 'Legacy Snapshot';
      case 'guided': return 'Guided Question';
      case 'guided_gallery': return 'Guided Question';
      case 'self_guided': return 'Self-Guided';
      case 'self': return 'Self-Guided';
      case 'vault': return 'Vault Message';
      case 'uploaded': return 'Uploaded';
      default: return type || 'Video';
    }
  };

  const typeColor = (type) => {
    switch (type) {
      case 'snapshot': return '#2C5F7B';
      case 'legacy_snapshot': return '#2C5F7B';
      case 'guided_prescribed': return '#2C5F7B';
      case 'guided': return '#8FA99A';
      case 'guided_gallery': return '#8FA99A';
      case 'self_guided': return '#D4A574';
      case 'self': return '#D4A574';
      case 'vault': return '#8B5E83';
      default: return '#2C5F7B';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {video.question_text || typeLabel(video.video_type)}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Video Player */}
        <View style={styles.videoContainer}>
          {videoUrl ? (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          ) : (
            <View style={styles.noVideo}>
              <Ionicons name="videocam-off-outline" size={48} color="#636E72" />
              <Text style={styles.noVideoText}>Video not available</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <ScrollView style={styles.details} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Type + Privacy chips */}
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: typeColor(video.video_type) }]}>  
              <Text style={styles.chipText}>{typeLabel(video.video_type)}</Text>
            </View>
            {video.privacy_setting && (
              <View style={[styles.chip, styles.privacyChip]}>
                <Ionicons
                  name={video.privacy_setting === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                  size={12}
                  color="#636E72"
                />
                <Text style={styles.privacyChipText}>
                  {video.privacy_setting === 'public' ? 'Public' : video.privacy_setting === 'family' ? 'Family Only' : 'Private'}
                </Text>
              </View>
            )}
          </View>

          {/* Question text */}
          {video.question_text ? (
            <Text style={styles.questionText}>{video.question_text}</Text>
          ) : null}

          {/* Creator info (for Explore Stories videos) */}
          {video.creator_name ? (
            <View style={styles.creatorRow}>
              <View style={styles.creatorAvatar}>
                <Text style={styles.creatorInitial}>
                  {video.creator_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.creatorName}>{video.creator_name}</Text>
                {video.bio_short ? (
                  <Text style={styles.creatorBio} numberOfLines={1}>{video.bio_short}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Date */}
          {video.created_at ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recorded</Text>
              <Text style={styles.detailValue}>{formatDate(video.created_at)}</Text>
            </View>
          ) : null}

          {/* Category */}
          {video.category ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{video.category}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#2C5F7B',
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', marginHorizontal: 8 },
  videoContainer: {
    width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
  },
  video: { width: '100%', height: '100%' },
  noVideo: { alignItems: 'center', justifyContent: 'center' },
  noVideoText: { color: '#636E72', marginTop: 8, fontSize: 14 },
  details: {
    flex: 1, backgroundColor: '#FAF8F5', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    marginTop: -16, paddingTop: 24, paddingHorizontal: 20,
  },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  privacyChip: { backgroundColor: '#F0EDE8', flexDirection: 'row', alignItems: 'center', gap: 4 },
  privacyChipText: { color: '#636E72', fontSize: 12 },
  questionText: { fontSize: 18, fontWeight: '600', color: '#2D3436', marginBottom: 16, lineHeight: 26 },
  creatorRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#E8E4DF', marginBottom: 12,
  },
  creatorAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#2C5F7B',
    alignItems: 'center', justifyContent: 'center',
  },
  creatorInitial: { color: '#fff', fontSize: 16, fontWeight: '600' },
  creatorName: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  creatorBio: { fontSize: 13, color: '#636E72', fontStyle: 'italic' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0EDE8',
  },
  detailLabel: { fontSize: 14, color: '#636E72' },
  detailValue: { fontSize: 14, color: '#2D3436', fontWeight: '500' },
});