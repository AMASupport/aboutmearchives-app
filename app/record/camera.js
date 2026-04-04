import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getToken } from '../../utils/auth';
import { getUploadUrl, saveVideo, uploadToBunny } from '../../utils/api';

export default function CameraScreen() {
  const params = useLocalSearchParams();
  const {
    questionId = '',
    questionText = '',
    categoryTag = '',
    videoType = 'guided_prescribed',
    maxDuration = '120',
    guidedQuestionId = '',
    guidedCategory = '',
  } = params;

  const maxSecs = parseInt(maxDuration, 10);

  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(maxSecs);
  const [recordedUri, setRecordedUri] = useState(null);
  const [facing, setFacing] = useState('front');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();

  useEffect(() => {
    (async () => {
      const cam = camPerm?.granted ? camPerm : await requestCamPerm();
      const mic = micPerm?.granted ? micPerm : await requestMicPerm();
      setHasPermission(cam.granted && mic.granted);
    })();
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setTimeLeft(maxSecs);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setRecordedUri(null);
    setIsRecording(true);
    startTimer();

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: maxSecs,
        quality: '720p',
      });
      // This resolves when recording stops
      setRecordedUri(video.uri);
    } catch (err) {
      console.log('Recording error:', err);
      Alert.alert('Recording Error', 'Something went wrong. Please try again.');
    }
    setIsRecording(false);
    stopTimer();
  };

  const stopRecording = async () => {
    if (!cameraRef.current) return;
    stopTimer();
    try {
      await cameraRef.current.stopRecording();
    } catch (err) {
      // May already be stopped
    }
    setIsRecording(false);
  };

  const handleRetake = () => {
    setRecordedUri(null);
    setTimeLeft(maxSecs);
  };

  const handleConfirmUpload = async () => {
    if (!recordedUri) return;

    setUploading(true);
    setUploadProgress('Getting upload URL...');

    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Not authenticated. Please log in again.');
        setUploading(false);
        return;
      }

      // Step 1: Get Bunny.net upload URL from WordPress
      const { data: urlData, error: urlError } = await getUploadUrl(token, videoType);
      if (urlError || !urlData?.success) {
        Alert.alert('Error', urlError || 'Failed to get upload URL');
        setUploading(false);
        return;
      }

      const { upload_url, cdn_url, filename, api_key } = urlData;

      // Step 2: Upload video to Bunny.net
      setUploadProgress('Uploading video...');
      
      const uploadResult = await uploadToBunny(upload_url, api_key, recordedUri);

      if (!uploadResult.success) {
        Alert.alert('Upload Failed', 'Could not upload video. Status: ' + (uploadResult.status || 'unknown') + '. Error: ' + (uploadResult.error || 'none'));
        setUploading(false);
        return;
      }

      // Step 3: Save metadata to WordPress
      setUploadProgress('Saving to your archive...');
      const videoData = {
        video_type: videoType,
        filename: filename,
        bunny_url: upload_url,
        cdn_url: cdn_url,
        duration: maxSecs - timeLeft,
        file_size: 0,
        title: questionText || 'Self-Guided Recording',
        privacy_setting: videoType === 'guided_prescribed' ? 'public' : 'private',
      };

      // Add type-specific fields
      if (videoType === 'guided_prescribed' && questionId) {
        videoData.snapshot_question_id = parseInt(questionId, 10);
        videoData.question_number = parseInt(questionId, 10);
      }
      if (videoType === 'guided_gallery' && guidedQuestionId) {
        videoData.guided_question_id = parseInt(guidedQuestionId, 10);
        videoData.category = guidedCategory;
      }

      const { data: saveData, error: saveError } = await saveVideo(token, videoData);

      if (saveError || !saveData?.success) {
        Alert.alert('Warning', 'Video uploaded but metadata save failed. Contact support if this persists.');
        setUploading(false);
        return;
      }

      // Success!
      setUploadProgress('Done!');
      Alert.alert(
        'Video Saved!',
        videoType === 'guided_prescribed'
          ? 'Your Legacy Snapshot video has been saved successfully.'
          : 'Your video has been saved successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.log('Upload process error:', err);
      Alert.alert('Error', 'Something went wrong during upload. Please try again.');
    }

    setUploading(false);
  };

  // Permission not yet determined
  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicatorWrapper />
        <Text style={styles.permissionText}>Requesting camera permissions...</Text>
      </View>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-off" size={64} color="#636E72" />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          About Me Archives needs camera and microphone access to record your stories.
          Please enable them in your device settings.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Post-recording review screen
  if (recordedUri && !isRecording) {
    return (
      <View style={styles.reviewContainer}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>Review Your Recording</Text>
          {questionText ? (
            <Text style={styles.reviewQuestion} numberOfLines={2}>{questionText}</Text>
          ) : null}
          <Text style={styles.reviewDuration}>
            Duration: {formatTime(maxSecs - timeLeft)}
          </Text>
        </View>

        <View style={styles.reviewPreview}>
          <Ionicons name="checkmark-circle" size={80} color="#8FA99A" />
          <Text style={styles.reviewPreviewText}>Recording complete</Text>
        </View>

        {uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicatorWrapper />
            <Text style={styles.uploadingText}>{uploadProgress}</Text>
          </View>
        ) : (
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
              <Ionicons name="refresh" size={22} color="#2C5F7B" />
              <Text style={styles.retakeBtnText}>Re-Record</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmUpload}>
              <Ionicons name="cloud-upload" size={22} color="#FFF" />
              <Text style={styles.confirmBtnText}>Save & Upload</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Camera / Recording view
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="video"
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              if (isRecording) {
                Alert.alert('Stop Recording?', 'Your current recording will be lost.', [
                  { text: 'Keep Recording', style: 'cancel' },
                  { text: 'Stop & Exit', style: 'destructive', onPress: () => { stopRecording(); router.back(); } },
                ]);
              } else {
                router.back();
              }
            }}
            style={styles.topBtn}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.timerBadge}>
            <View style={[styles.timerDot, isRecording && styles.timerDotActive]} />
            <Text style={[styles.timerText, timeLeft <= 10 && styles.timerTextWarning]}>
              {formatTime(timeLeft)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')}
            style={styles.topBtn}
            disabled={isRecording}
          >
            <Ionicons name="camera-reverse" size={28} color={isRecording ? '#666' : '#FFF'} />
          </TouchableOpacity>
        </View>

        {/* Question Overlay */}
        {questionText ? (
          <View style={styles.questionOverlay}>
            {categoryTag ? (
              <Text style={styles.overlayCategory}>{categoryTag}</Text>
            ) : null}
            <Text style={styles.overlayQuestion}>{questionText}</Text>
          </View>
        ) : null}

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          <View style={styles.recordBtnContainer}>
            {!isRecording ? (
              <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
                <View style={styles.recordBtnInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                <View style={styles.stopBtnInner} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.recordHint}>
            {isRecording ? 'Tap to stop' : 'Tap to record'}
          </Text>
        </View>
      </CameraView>
    </View>
  );
}

// Simple activity indicator since we can't import it conditionally
function ActivityIndicatorWrapper() {
  const { ActivityIndicator } = require('react-native');
  return <ActivityIndicator size="large" color="#2C5F7B" />;
}

const styles = StyleSheet.create({
  // Permission screens
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#1a1a1a', padding: 32,
  },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginTop: 16, marginBottom: 8 },
  permissionText: { fontSize: 14, color: '#AAA', textAlign: 'center', lineHeight: 20 },
  backButton: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: '#FFF',
  },
  backButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Camera view
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20,
  },
  topBtn: { padding: 8 },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 8,
  },
  timerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#666' },
  timerDotActive: { backgroundColor: '#FF3B30' },
  timerText: { fontSize: 20, fontWeight: '700', color: '#FFF', fontVariant: ['tabular-nums'] },
  timerTextWarning: { color: '#FF3B30' },

  questionOverlay: {
    position: 'absolute', bottom: 160, left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: 16,
  },
  overlayCategory: {
    fontSize: 12, fontWeight: '600', color: '#D4A574',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  overlayQuestion: { fontSize: 18, fontWeight: '600', color: '#FFF', lineHeight: 24 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  recordBtnContainer: { marginBottom: 8 },
  recordBtn: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4,
    borderColor: '#FFF', justifyContent: 'center', alignItems: 'center',
  },
  recordBtnInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FF3B30',
  },
  stopBtn: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4,
    borderColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
  },
  stopBtnInner: {
    width: 32, height: 32, borderRadius: 4, backgroundColor: '#FF3B30',
  },
  recordHint: { fontSize: 14, color: '#FFF', fontWeight: '500' },

  // Review screen
  reviewContainer: {
    flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'space-between',
    padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 60,
  },
  reviewHeader: { alignItems: 'center' },
  reviewTitle: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: 8 },
  reviewQuestion: { fontSize: 15, color: '#AAA', textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  reviewDuration: { fontSize: 14, color: '#D4A574', fontWeight: '600' },

  reviewPreview: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  reviewPreviewText: { fontSize: 16, color: '#8FA99A', marginTop: 12, fontWeight: '600' },

  uploadingContainer: { alignItems: 'center', paddingBottom: 40 },
  uploadingText: { color: '#FFF', marginTop: 12, fontSize: 14 },

  reviewActions: {
    flexDirection: 'row', gap: 16, paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  retakeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 8, borderWidth: 2, borderColor: '#2C5F7B', gap: 8,
  },
  retakeBtnText: { fontSize: 16, fontWeight: '600', color: '#2C5F7B' },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 8, backgroundColor: '#2C5F7B', gap: 8,
  },
  confirmBtnText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});