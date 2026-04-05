import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, TextInput, Modal, Platform,
  ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { Video } from 'expo-av';
import { getToken } from '../../utils/auth';
import { getVaultMessages, createVaultMessage, editVaultMessage, deleteVaultMessage } from '../../utils/api';

// ============================================
// CONSTANTS
// ============================================
const VAULT_TYPES = {
  scheduled: { icon: '📅', label: 'Scheduled', color: '#2C5F7B' },
  death_activated: { icon: '🕊️', label: 'After Passing', color: '#8B5E83' },
  event_based: { icon: '🎓', label: 'Life Event', color: '#D4A574' },
};

const EVENT_TYPES = [
  { key: 'graduation', label: '🎓 Graduation', desc: 'High school, college, or any academic milestone' },
  { key: 'wedding', label: '💒 Wedding', desc: 'A message for their wedding day' },
  { key: 'birth_of_child', label: '👶 Birth of Child', desc: 'When they welcome a new baby' },
  { key: 'first_home', label: '🏠 First Home', desc: 'When they buy their first home' },
  { key: 'retirement', label: '🎉 Retirement', desc: 'A message for their retirement' },
  { key: 'custom', label: '✨ Custom Milestone', desc: 'Define your own life event' },
];

const MAX_RECORDING_SECONDS = 600; // 10 minutes

// ============================================
// MAIN VAULT SCREEN
// ============================================
export default function VaultScreen() {
  // --- List state ---
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  // --- Viewer state ---
  const [viewingMessage, setViewingMessage] = useState(null);

  // --- Create flow state ---
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState('type');
  const [selectedType, setSelectedType] = useState(null);

  // --- Form data ---
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date(Date.now() + 86400000));
  const [isRecurring, setIsRecurring] = useState(false);
  const [eventType, setEventType] = useState('');
  const [customEventName, setCustomEventName] = useState('');
  const [recipients, setRecipients] = useState([{ name: '', email: '' }]);
  const [personalMessage, setPersonalMessage] = useState('');
  const [postDeliveryAction, setPostDeliveryAction] = useState('none');

  // --- Recording state ---
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [videoUri, setVideoUri] = useState(null);
  const [cameraFacing, setCameraFacing] = useState('front');
  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  // --- Saving state ---
  const [saving, setSaving] = useState(false);

  // ============================================
  // DATA LOADING
  // ============================================
  const loadMessages = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await getVaultMessages(token);
      if (data.success) {
        setMessages(data.messages || []);
        setStats(data.stats || null);
        setUpgradeRequired(false);
      } else if (data.upgrade_required) {
        setUpgradeRequired(true);
      }
    } catch (err) {
      console.error('Failed to load vault messages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMessages();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMessages();
  };

  // ============================================
  // FILTERING
  // ============================================
  const filteredMessages = activeFilter === 'all'
    ? messages
    : messages.filter(m => m.vault_type === activeFilter);

  // ============================================
  // DELETE HANDLER
  // ============================================
  const handleDelete = (msg) => {
    const typeInfo = VAULT_TYPES[msg.vault_type] || {};
    Alert.alert(
      'Delete Vault Message',
      `Are you sure you want to permanently delete this ${typeInfo.label || ''} vault message? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              const res = await deleteVaultMessage(token, msg.id);
              if (res.success) {
                Alert.alert('Deleted', 'Vault message has been deleted.');
                loadMessages();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete.');
              }
            } catch (err) {
              Alert.alert('Error', 'Something went wrong.');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // TIME FORMATTING
  // ============================================
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatTimeDisplay = (time) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${m} ${ampm}`;
  };

  // ============================================
  // RECORDING FUNCTIONS
  // ============================================
  const startRecording = async () => {
    if (!cameraRef.current) return;
    try {
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_RECORDING_SECONDS,
      });
      setVideoUri(video.uri);
    } catch (err) {
      console.error('Recording error:', err);
      Alert.alert('Error', 'Failed to start recording.');
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    if (cameraRef.current) {
      cameraRef.current.stopRecording();
    }
  };

  // ============================================
  // UPLOAD TO BUNNY.NET
  // ============================================
  const uploadToBunny = async (uri) => {
    const API_KEY = '3b93db5e-51fe-4b3d-92e58ed747cd-4c03-43ab';
    const STORAGE_ZONE = 'legacy-reels-videos';
    const STORAGE_HOST = 'https://ny.storage.bunnycdn.com';
    const CDN_HOST = 'https://legacy-reels-videos.b-cdn.net';

    const timestamp = Date.now();
    const ext = uri.split('.').pop().toLowerCase() || 'mov';
    const contentType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
    const fileName = `vault_${timestamp}.${ext}`;
    const uploadUrl = `${STORAGE_HOST}/${STORAGE_ZONE}/${fileName}`;

    console.log('Uploading to:', uploadUrl);
    console.log('File URI:', uri);
    console.log('Content-Type:', contentType);

    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'PUT',
      uploadType: 0,
      headers: {
        AccessKey: API_KEY,
        'Content-Type': contentType,
      },
    });

    console.log('Bunny response status:', uploadResult.status);
    console.log('Bunny response body:', uploadResult.body);

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error('Bunny.net upload failed: HTTP ' + uploadResult.status + ' - ' + uploadResult.body);
    }

    return `${CDN_HOST}/${fileName}`;
  };

  // ============================================
  // SAVE VAULT MESSAGE
  // ============================================
  const handleSave = async () => {
    const validRecipients = recipients.filter(r => r.name.trim() && r.email.trim());
    if (validRecipients.length === 0) {
      Alert.alert('Recipients Required', 'Please add at least one recipient with a name and email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const r of validRecipients) {
      if (!emailRegex.test(r.email.trim())) {
        Alert.alert('Invalid Email', `"${r.email}" is not a valid email address.`);
        return;
      }
    }

    if (!videoUri) {
      Alert.alert('Video Required', 'Please record a video for your vault message.');
      return;
    }

    setSaving(true);
    try {
      const videoUrl = await uploadToBunny(videoUri);
      const token = await getToken();

      const payload = {
        vault_type: selectedType,
        video_url: videoUrl,
        video_title: `Vault - ${VAULT_TYPES[selectedType]?.label || 'Message'}`,
        recipients: validRecipients.map(r => ({
          name: r.name.trim(),
          email: r.email.trim(),
        })),
        personal_message: personalMessage.trim(),
        post_delivery_action: postDeliveryAction,
      };

      if (selectedType === 'scheduled') {
        if (!scheduledDate.trim()) {
          Alert.alert('Date Required', 'Please enter a delivery date.');
          setSaving(false);
          return;
        }
        payload.scheduled_date = scheduledDate.trim();
        payload.scheduled_time = (scheduledTime.trim() || '09:00') + ':00';
        payload.is_recurring = isRecurring;
      } else if (selectedType === 'event_based') {
        const chosenEvent = eventType === 'custom' ? customEventName.trim() : eventType;
        if (!chosenEvent) {
          Alert.alert('Event Required', 'Please select or enter an event type.');
          setSaving(false);
          return;
        }
        payload.event_type = chosenEvent;
        payload.event_details = {
          event_label: eventType === 'custom'
            ? customEventName.trim()
            : EVENT_TYPES.find(e => e.key === eventType)?.label || eventType,
        };
      }

      const res = await createVaultMessage(token, payload);

      if (res.success) {
        Alert.alert('Sealed! 🔒', 'Your vault message has been created and sealed.');
        resetCreateFlow();
        loadMessages();
      } else {
        Alert.alert('Error', res.message || 'Failed to create vault message.');
      }
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Upload failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // RESET CREATE FLOW
  // ============================================
  const resetCreateFlow = () => {
    setShowCreate(false);
    setCreateStep('type');
    setSelectedType(null);
    setScheduledDate('');
    setScheduledTime('09:00');
    setShowDatePicker(false);
    setShowTimePicker(false);
    setDatePickerValue(new Date(Date.now() + 86400000));
    setIsRecurring(false);
    setEventType('');
    setCustomEventName('');
    setRecipients([{ name: '', email: '' }]);
    setPersonalMessage('');
    setPostDeliveryAction('none');
    setVideoUri(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ============================================
  // RECIPIENT HELPERS
  // ============================================
  const addRecipient = () => {
    if (recipients.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 recipients allowed.');
      return;
    }
    setRecipients([...recipients, { name: '', email: '' }]);
  };

  const updateRecipient = (index, field, value) => {
    const updated = [...recipients];
    updated[index][field] = value;
    setRecipients(updated);
  };

  const removeRecipient = (index) => {
    if (recipients.length <= 1) return;
    const updated = recipients.filter((_, i) => i !== index);
    setRecipients(updated);
  };

  // ============================================
  // RENDER: UPGRADE REQUIRED
  // ============================================
  if (!loading && upgradeRequired) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
        <Text style={styles.emptyIcon}>🔒</Text>
        <Text style={styles.emptyTitle}>Time Vault is a Premium Feature</Text>
        <Text style={styles.emptyDesc}>
          Upgrade to Premium to create sealed video messages delivered on your schedule — birthdays, milestones, or after you're gone.
        </Text>
        <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.7}>
          <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ============================================
  // RENDER: CREATE FLOW MODAL
  // ============================================
  const renderCreateFlow = () => (
    <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* STEP: TYPE SELECTOR */}
        {createStep === 'type' && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetCreateFlow}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create Vault Message</Text>
              <View style={{ width: 60 }} />
            </View>
            <Text style={styles.modalSubtitle}>What type of sealed message do you want to create?</Text>

            <TouchableOpacity
              style={styles.typeCard}
              activeOpacity={0.7}
              onPress={() => { setSelectedType('scheduled'); setCreateStep('form'); }}
            >
              <Text style={styles.typeCardIcon}>📅</Text>
              <View style={styles.typeCardContent}>
                <Text style={styles.typeCardTitle}>Scheduled Delivery</Text>
                <Text style={styles.typeCardDesc}>Deliver on a specific date. Perfect for birthdays, anniversaries, or future milestones.</Text>
              </View>
              <Text style={styles.typeCardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeCard}
              activeOpacity={0.7}
              onPress={() => { setSelectedType('death_activated'); setCreateStep('form'); }}
            >
              <Text style={styles.typeCardIcon}>🕊️</Text>
              <View style={styles.typeCardContent}>
                <Text style={styles.typeCardTitle}>After Passing</Text>
                <Text style={styles.typeCardDesc}>Delivered to loved ones after your passing, triggered by your Legacy Steward.</Text>
              </View>
              <Text style={styles.typeCardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeCard}
              activeOpacity={0.7}
              onPress={() => { setSelectedType('event_based'); setCreateStep('form'); }}
            >
              <Text style={styles.typeCardIcon}>🎓</Text>
              <View style={styles.typeCardContent}>
                <Text style={styles.typeCardTitle}>Life Event</Text>
                <Text style={styles.typeCardDesc}>Triggered when a life milestone occurs — graduation, wedding, first home, and more.</Text>
              </View>
              <Text style={styles.typeCardArrow}>›</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* STEP: TYPE-SPECIFIC FORM */}
        {createStep === 'form' && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreateStep('type')}>
                <Text style={styles.modalCancel}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {VAULT_TYPES[selectedType]?.icon} {VAULT_TYPES[selectedType]?.label}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            {selectedType === 'scheduled' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Delivery Date</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={scheduledDate ? styles.datePickerText : styles.datePickerPlaceholder}>
                    {scheduledDate
                      ? new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Select a delivery date'}
                  </Text>
                  <Text style={styles.datePickerIcon}>📅</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={datePickerValue}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date(Date.now() + 86400000)}
                    onChange={(event, selected) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (selected) {
                        setDatePickerValue(selected);
                        const yyyy = selected.getFullYear();
                        const mm = String(selected.getMonth() + 1).padStart(2, '0');
                        const dd = String(selected.getDate()).padStart(2, '0');
                        setScheduledDate(`${yyyy}-${mm}-${dd}`);
                      }
                    }}
                  />
                )}
                {Platform.OS === 'ios' && showDatePicker && (
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.formLabel, { marginTop: 16 }]}>Delivery Time</Text>
                <TouchableOpacity
                  style={styles.datePickerBtn}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.datePickerText}>
                    {scheduledTime ? formatTimeDisplay(scheduledTime) : '9:00 AM'}
                  </Text>
                  <Text style={styles.datePickerIcon}>🕐</Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={(() => {
                      const [h, m] = (scheduledTime || '09:00').split(':');
                      const d = new Date();
                      d.setHours(parseInt(h), parseInt(m), 0);
                      return d;
                    })()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selected) => {
                      if (Platform.OS === 'android') setShowTimePicker(false);
                      if (selected) {
                        const hh = String(selected.getHours()).padStart(2, '0');
                        const mm = String(selected.getMinutes()).padStart(2, '0');
                        setScheduledTime(`${hh}:${mm}`);
                      }
                    }}
                  />
                )}
                {Platform.OS === 'ios' && showTimePicker && (
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.checkboxRow, { marginTop: 16 }]}
                  onPress={() => setIsRecurring(!isRecurring)}
                >
                  <View style={[styles.checkbox, isRecurring && styles.checkboxActive]}>
                    {isRecurring && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Repeat annually</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedType === 'death_activated' && (
              <View style={styles.formSection}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxTitle}>🕊️ How This Works</Text>
                  <Text style={styles.infoBoxText}>
                    This message will be securely stored and delivered to your chosen recipients after your passing.
                    {'\n\n'}Your Legacy Steward will confirm your passing and trigger the delivery. Make sure you've designated a Legacy Steward in your account settings on the web.
                  </Text>
                </View>
              </View>
            )}

            {selectedType === 'event_based' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Select Life Event</Text>
                {EVENT_TYPES.map(evt => (
                  <TouchableOpacity
                    key={evt.key}
                    style={[
                      styles.eventOption,
                      eventType === evt.key && styles.eventOptionActive,
                    ]}
                    onPress={() => setEventType(evt.key)}
                  >
                    <Text style={styles.eventOptionLabel}>{evt.label}</Text>
                    <Text style={styles.eventOptionDesc}>{evt.desc}</Text>
                  </TouchableOpacity>
                ))}
                {eventType === 'custom' && (
                  <TextInput
                    style={[styles.input, { marginTop: 12 }]}
                    placeholder="Enter your custom milestone name"
                    placeholderTextColor="#B2BEC3"
                    value={customEventName}
                    onChangeText={setCustomEventName}
                  />
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.nextBtn}
              activeOpacity={0.7}
              onPress={async () => {
                if (selectedType === 'scheduled' && !scheduledDate.trim()) {
                  Alert.alert('Date Required', 'Please select a delivery date.');
                  return;
                }
                if (selectedType === 'event_based' && !eventType) {
                  Alert.alert('Event Required', 'Please select an event type.');
                  return;
                }
                if (selectedType === 'event_based' && eventType === 'custom' && !customEventName.trim()) {
                  Alert.alert('Event Name Required', 'Please enter your custom milestone name.');
                  return;
                }
                const cam = await requestCameraPermission();
                const mic = await requestMicPermission();
                if (!cam.granted || !mic.granted) {
                  Alert.alert('Permissions Required', 'Camera and microphone access are needed to record your vault message.');
                  return;
                }
                setCreateStep('record');
              }}
            >
              <Text style={styles.nextBtnText}>Next: Record Your Message →</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* STEP: VIDEO RECORDING */}
        {createStep === 'record' && (
          <View style={styles.recordContainer}>
            {!videoUri ? (
              <>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing={cameraFacing}
                  mode="video"
                />
                <View style={styles.recordOverlay}>
                  <View style={styles.recordTopBar}>
                    <TouchableOpacity onPress={() => setCreateStep('form')}>
                      <Text style={styles.recordBackText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.recordTimer}>
                      {formatTime(recordingSeconds)} / {formatTime(MAX_RECORDING_SECONDS)}
                    </Text>
                    <TouchableOpacity onPress={() => setCameraFacing(f => f === 'front' ? 'back' : 'front')}>
                      <Text style={styles.recordFlipText}>🔄</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.recordBottomBar}>
                    <Text style={styles.recordHint}>
                      {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.recordButton, isRecording && styles.recordButtonActive]}
                      onPress={isRecording ? stopRecording : startRecording}
                    >
                      <View style={isRecording ? styles.recordSquare : styles.recordCircle} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.recordReview}>
                <Text style={styles.recordReviewIcon}>✅</Text>
                <Text style={styles.recordReviewTitle}>Video Recorded</Text>
                <Text style={styles.recordReviewDuration}>
                  Duration: {formatTime(recordingSeconds)}
                </Text>
                <View style={styles.recordReviewActions}>
                  <TouchableOpacity
                    style={styles.reRecordBtn}
                    onPress={() => { setVideoUri(null); setRecordingSeconds(0); }}
                  >
                    <Text style={styles.reRecordBtnText}>Re-record</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.useVideoBtn}
                    onPress={() => setCreateStep('recipients')}
                  >
                    <Text style={styles.useVideoBtnText}>Use This Video →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* STEP: RECIPIENTS + MESSAGE + REVIEW */}
        {createStep === 'recipients' && (
          <ScrollView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCreateStep('record')}>
                <Text style={styles.modalCancel}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Recipients & Message</Text>
              <View style={{ width: 60 }} />
            </View>

            <Text style={styles.formLabel}>Recipients</Text>
            {recipients.map((r, index) => (
              <View key={index} style={styles.recipientRow}>
                <View style={styles.recipientFields}>
                  <TextInput
                    style={[styles.input, styles.recipientInput]}
                    placeholder="Name"
                    placeholderTextColor="#B2BEC3"
                    value={r.name}
                    onChangeText={(val) => updateRecipient(index, 'name', val)}
                  />
                  <TextInput
                    style={[styles.input, styles.recipientInput]}
                    placeholder="Email"
                    placeholderTextColor="#B2BEC3"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={r.email}
                    onChangeText={(val) => updateRecipient(index, 'email', val)}
                  />
                </View>
                {recipients.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeRecipientBtn}
                    onPress={() => removeRecipient(index)}
                  >
                    <Text style={styles.removeRecipientText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {recipients.length < 10 && (
              <TouchableOpacity style={styles.addRecipientBtn} onPress={addRecipient}>
                <Text style={styles.addRecipientText}>+ Add Another Recipient</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.formLabel, { marginTop: 20 }]}>Personal Message (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write a personal note that will accompany your video..."
              placeholderTextColor="#B2BEC3"
              multiline
              numberOfLines={4}
              value={personalMessage}
              onChangeText={setPersonalMessage}
            />

            <Text style={[styles.formLabel, { marginTop: 20 }]}>After Delivery</Text>
            {[
              { key: 'none', label: '🔒 Keep Private', desc: 'Remains in vault, not public' },
              { key: 'public', label: '🌐 Make Public', desc: 'Becomes part of your legacy profile' },
              { key: 'delete', label: '🗑️ Delete', desc: 'Permanently removed after delivery' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.radioRow,
                  postDeliveryAction === opt.key && styles.radioRowActive,
                ]}
                onPress={() => setPostDeliveryAction(opt.key)}
              >
                <View style={[styles.radio, postDeliveryAction === opt.key && styles.radioActive]}>
                  {postDeliveryAction === opt.key && <View style={styles.radioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.radioLabel}>{opt.label}</Text>
                  <Text style={styles.radioDesc}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              activeOpacity={0.7}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.saveBtnText}>  Sealing your message...</Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>🔒 Seal Vault Message</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );

  // ============================================
  // RENDER: MESSAGE CARD
  // ============================================
  const renderMessageCard = (msg) => {
    const typeInfo = VAULT_TYPES[msg.vault_type] || {};
    const recipientList = (msg.recipients || []).map(r => r.name).join(', ');
    const isDelivered = msg.delivery_status === 'delivered';

    let triggerLabel = '';
    if (msg.vault_type === 'scheduled') {
      const d = msg.scheduled_date ? new Date(msg.scheduled_date) : null;
      triggerLabel = d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';
      if (msg.is_recurring) triggerLabel += ' (Annual)';
    } else if (msg.vault_type === 'death_activated') {
      triggerLabel = 'After passing';
    } else if (msg.vault_type === 'event_based') {
      const evtInfo = EVENT_TYPES.find(e => e.key === msg.event_type);
      triggerLabel = evtInfo ? evtInfo.label : (msg.event_type || 'Life event');
    }

    return (
      <TouchableOpacity key={msg.id} style={styles.messageCard} activeOpacity={0.7} onPress={() => setViewingMessage(msg)}>
        <View style={styles.messageCardHeader}>
          <View style={[styles.messageTypeBadge, { backgroundColor: typeInfo.color || '#2C5F7B' }]}>
            <Text style={styles.messageTypeBadgeText}>{typeInfo.icon} {typeInfo.label}</Text>
          </View>
          <View style={[styles.statusBadge, isDelivered ? styles.statusDelivered : styles.statusPending]}>
            <Text style={styles.statusBadgeText}>{isDelivered ? 'Delivered' : 'Sealed'}</Text>
          </View>
        </View>

        <View style={styles.messageCardBody}>
          <Text style={styles.messageCardTrigger}>{triggerLabel}</Text>
          {recipientList ? (
            <Text style={styles.messageCardRecipients}>To: {recipientList}</Text>
          ) : null}
          {msg.personal_message ? (
            <Text style={styles.messageCardNote} numberOfLines={2}>
              "{msg.personal_message}"
            </Text>
          ) : null}
          <Text style={styles.messageCardDate}>
            Created {new Date(msg.created_at).toLocaleDateString()}
          </Text>
        </View>

        {!isDelivered && (
          <View style={styles.messageCardActions}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={(e) => { e.stopPropagation(); handleDelete(msg); }}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ============================================
  // RENDER: MAIN SCREEN
  // ============================================
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading your vault...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}
      >
        <Text style={styles.headerTitle}>Time Vault</Text>
        <Text style={styles.headerSubtitle}>Sealed messages across time</Text>

        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Sealed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.createBtn}
          activeOpacity={0.7}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.createBtnText}>+ Create Vault Message</Text>
        </TouchableOpacity>

        {messages.length > 0 && (
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'All' },
              { key: 'scheduled', label: '📅 Scheduled' },
              { key: 'death_activated', label: '🕊️ After Passing' },
              { key: 'event_based', label: '🎓 Events' },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterTab, activeFilter === f.key && styles.filterTabActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.filterTabText, activeFilter === f.key && styles.filterTabTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filteredMessages.length > 0 ? (
          filteredMessages.map(renderMessageCard)
        ) : messages.length > 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No messages match this filter</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔒</Text>
            <Text style={styles.emptyTitle}>Messages across time</Text>
            <Text style={styles.emptyDesc}>
              Record video messages for your loved ones — sealed until the moment you choose. Birthdays, milestones, or after you're gone.
            </Text>
            <View style={styles.typeRow}>
              <View style={styles.typeChip}><Text style={styles.typeText}>📅 Scheduled</Text></View>
              <View style={styles.typeChip}><Text style={styles.typeText}>🕊️ After passing</Text></View>
              <View style={styles.typeChip}><Text style={styles.typeText}>🎓 Life event</Text></View>
            </View>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Create Flow Modal */}
      {renderCreateFlow()}

      {/* Video Viewer Modal */}
      <Modal visible={!!viewingMessage} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity onPress={() => setViewingMessage(null)}>
              <Text style={styles.viewerClose}>← Close</Text>
            </TouchableOpacity>
            <Text style={styles.viewerTitle}>
              {viewingMessage ? VAULT_TYPES[viewingMessage.vault_type]?.icon : ''} Vault Message
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {viewingMessage?.video_url ? (
            <Video
              source={{ uri: viewingMessage.video_url }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode="contain"
              shouldPlay
            />
          ) : (
            <View style={styles.noVideoBox}>
              <Text style={styles.noVideoText}>Video not available</Text>
            </View>
          )}

          <ScrollView style={styles.viewerDetails}>
            <View style={styles.viewerDetailRow}>
              <Text style={styles.viewerLabel}>Type</Text>
              <Text style={styles.viewerValue}>
                {viewingMessage ? `${VAULT_TYPES[viewingMessage.vault_type]?.icon} ${VAULT_TYPES[viewingMessage.vault_type]?.label}` : ''}
              </Text>
            </View>

            {viewingMessage?.vault_type === 'scheduled' && (
              <View style={styles.viewerDetailRow}>
                <Text style={styles.viewerLabel}>Delivery Date</Text>
                <Text style={styles.viewerValue}>
                  {viewingMessage.scheduled_date
                    ? new Date(viewingMessage.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                    : 'Not set'}
                  {viewingMessage.is_recurring ? ' (Annual)' : ''}
                </Text>
              </View>
            )}

            {viewingMessage?.vault_type === 'death_activated' && (
              <View style={styles.viewerDetailRow}>
                <Text style={styles.viewerLabel}>Trigger</Text>
                <Text style={styles.viewerValue}>Delivered after passing, triggered by Legacy Steward</Text>
              </View>
            )}

            {viewingMessage?.vault_type === 'event_based' && (
              <View style={styles.viewerDetailRow}>
                <Text style={styles.viewerLabel}>Event</Text>
                <Text style={styles.viewerValue}>
                  {EVENT_TYPES.find(e => e.key === viewingMessage.event_type)?.label || viewingMessage.event_type}
                </Text>
              </View>
            )}

            <View style={styles.viewerDetailRow}>
              <Text style={styles.viewerLabel}>Recipients</Text>
              <Text style={styles.viewerValue}>
                {(viewingMessage?.recipients || []).map(r => `${r.name} (${r.email})`).join('\n')}
              </Text>
            </View>

            {viewingMessage?.personal_message ? (
              <View style={styles.viewerDetailRow}>
                <Text style={styles.viewerLabel}>Personal Message</Text>
                <Text style={styles.viewerValue}>"{viewingMessage.personal_message}"</Text>
              </View>
            ) : null}

            <View style={styles.viewerDetailRow}>
              <Text style={styles.viewerLabel}>Status</Text>
              <Text style={styles.viewerValue}>
                {viewingMessage?.delivery_status === 'delivered' ? '✅ Delivered' : '🔒 Sealed'}
              </Text>
            </View>

            <View style={styles.viewerDetailRow}>
              <Text style={styles.viewerLabel}>After Delivery</Text>
              <Text style={styles.viewerValue}>
                {viewingMessage?.post_delivery_action === 'public' ? '🌐 Make Public' :
                 viewingMessage?.post_delivery_action === 'delete' ? '🗑️ Delete' : '🔒 Keep Private'}
              </Text>
            </View>

            <View style={styles.viewerDetailRow}>
              <Text style={styles.viewerLabel}>Created</Text>
              <Text style={styles.viewerValue}>
                {viewingMessage ? new Date(viewingMessage.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#636E72', marginTop: 12, fontSize: 14 },

  headerTitle: { fontSize: 24, fontWeight: '700', color: '#2D3436', marginBottom: 2 },
  headerSubtitle: { fontSize: 13, color: '#636E72', marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: '#E8E5DE' },
  statNumber: { fontSize: 22, fontWeight: '700', color: '#2C5F7B' },
  statLabel: { fontSize: 11, color: '#636E72', marginTop: 2 },

  createBtn: { backgroundColor: '#D4A574', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filterTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 0.5, borderColor: '#E8E5DE' },
  filterTabActive: { backgroundColor: '#2C5F7B', borderColor: '#2C5F7B' },
  filterTabText: { fontSize: 12, color: '#636E72' },
  filterTabTextActive: { color: '#FFF', fontWeight: '600' },

  messageCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 0.5, borderColor: '#E8E5DE' },
  messageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  messageTypeBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  messageTypeBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusDelivered: { backgroundColor: '#E8F5E9' },
  statusBadgeText: { fontSize: 10, fontWeight: '600', color: '#2D3436' },
  messageCardBody: { gap: 4 },
  messageCardTrigger: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  messageCardRecipients: { fontSize: 13, color: '#636E72' },
  messageCardNote: { fontSize: 12, color: '#636E72', fontStyle: 'italic', marginTop: 4 },
  messageCardDate: { fontSize: 11, color: '#B2BEC3', marginTop: 6 },
  messageCardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 0.5, borderTopColor: '#F0EEEA', paddingTop: 10 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FFF0F0' },
  deleteBtnText: { color: '#E74C3C', fontSize: 12, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, paddingHorizontal: 16, marginBottom: 16 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: '#E8E5DE' },
  typeText: { fontSize: 11, color: '#2D3436' },

  upgradeBtn: { backgroundColor: '#2C5F7B', borderRadius: 10, paddingHorizontal: 30, paddingVertical: 14, marginTop: 10 },
  upgradeBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  modalContainer: { flex: 1, backgroundColor: '#FAF8F5', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: Platform.OS === 'ios' ? 10 : 0 },
  modalCancel: { color: '#2C5F7B', fontSize: 14, fontWeight: '600' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#2D3436' },
  modalSubtitle: { fontSize: 14, color: '#636E72', marginBottom: 20, textAlign: 'center' },

  typeCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 0.5, borderColor: '#E8E5DE' },
  typeCardIcon: { fontSize: 32, marginRight: 14 },
  typeCardContent: { flex: 1 },
  typeCardTitle: { fontSize: 16, fontWeight: '700', color: '#2D3436', marginBottom: 4 },
  typeCardDesc: { fontSize: 12, color: '#636E72', lineHeight: 18 },
  typeCardArrow: { fontSize: 24, color: '#B2BEC3' },

  formSection: { marginBottom: 20 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#2D3436', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 0.5, borderColor: '#E8E5DE', padding: 12, fontSize: 14, color: '#2D3436', marginBottom: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },

  datePickerBtn: { backgroundColor: '#FFF', borderRadius: 8, borderWidth: 0.5, borderColor: '#E8E5DE', padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  datePickerText: { fontSize: 14, color: '#2D3436' },
  datePickerPlaceholder: { fontSize: 14, color: '#B2BEC3' },
  datePickerIcon: { fontSize: 18 },
  datePickerDone: { alignItems: 'flex-end', paddingVertical: 8, paddingRight: 4 },
  datePickerDoneText: { color: '#2C5F7B', fontSize: 15, fontWeight: '600' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: '#B2BEC3', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#2C5F7B', borderColor: '#2C5F7B' },
  checkboxCheck: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  checkboxLabel: { fontSize: 14, color: '#2D3436' },

  eventOption: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E8E5DE' },
  eventOptionActive: { borderColor: '#D4A574', backgroundColor: '#FFF8F0' },
  eventOptionLabel: { fontSize: 14, fontWeight: '600', color: '#2D3436', marginBottom: 2 },
  eventOptionDesc: { fontSize: 12, color: '#636E72' },

  infoBox: { backgroundColor: '#F0EDE8', borderRadius: 10, padding: 16 },
  infoBoxTitle: { fontSize: 15, fontWeight: '700', color: '#2D3436', marginBottom: 8 },
  infoBoxText: { fontSize: 13, color: '#636E72', lineHeight: 20 },

  nextBtn: { backgroundColor: '#2C5F7B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 10 },
  nextBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  recordContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  recordOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  recordTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 30 },
  recordBackText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  recordTimer: { color: '#FFF', fontSize: 16, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  recordFlipText: { fontSize: 24 },
  recordBottomBar: { alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 50 : 30 },
  recordHint: { color: '#FFF', fontSize: 13, marginBottom: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  recordButton: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  recordButtonActive: { borderColor: '#E74C3C' },
  recordCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E74C3C' },
  recordSquare: { width: 28, height: 28, borderRadius: 4, backgroundColor: '#E74C3C' },

  recordReview: { flex: 1, backgroundColor: '#FAF8F5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  recordReviewIcon: { fontSize: 64, marginBottom: 16 },
  recordReviewTitle: { fontSize: 20, fontWeight: '700', color: '#2D3436', marginBottom: 8 },
  recordReviewDuration: { fontSize: 14, color: '#636E72', marginBottom: 24 },
  recordReviewActions: { flexDirection: 'row', gap: 12 },
  reRecordBtn: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14, borderWidth: 0.5, borderColor: '#E8E5DE' },
  reRecordBtnText: { color: '#2D3436', fontSize: 14, fontWeight: '600' },
  useVideoBtn: { backgroundColor: '#2C5F7B', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  useVideoBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  recipientRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  recipientFields: { flex: 1 },
  recipientInput: { marginBottom: 8 },
  removeRecipientBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', marginLeft: 8, marginTop: 8 },
  removeRecipientText: { color: '#E74C3C', fontSize: 14, fontWeight: '600' },
  addRecipientBtn: { paddingVertical: 10 },
  addRecipientText: { color: '#2C5F7B', fontSize: 13, fontWeight: '600' },

  radioRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E8E5DE' },
  radioRowActive: { borderColor: '#2C5F7B', backgroundColor: '#F5F9FB' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#B2BEC3', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#2C5F7B' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2C5F7B' },
  radioLabel: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  radioDesc: { fontSize: 11, color: '#636E72', marginTop: 1 },

  saveBtn: { backgroundColor: '#2C5F7B', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  savingRow: { flexDirection: 'row', alignItems: 'center' },

  // Video Viewer
  viewerContainer: { flex: 1, backgroundColor: '#FAF8F5' },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 30, backgroundColor: '#2C5F7B' },
  viewerClose: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  viewerTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  videoPlayer: { width: '100%', height: 280, backgroundColor: '#000' },
  noVideoBox: { width: '100%', height: 200, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  noVideoText: { color: '#636E72', fontSize: 14 },
  viewerDetails: { flex: 1, padding: 16 },
  viewerDetailRow: { marginBottom: 16 },
  viewerLabel: { fontSize: 12, color: '#636E72', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  viewerValue: { fontSize: 15, color: '#2D3436', lineHeight: 22 },
});