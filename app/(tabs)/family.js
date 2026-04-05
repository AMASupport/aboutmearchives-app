import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, RefreshControl, TextInput, Modal, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { getToken } from '../../utils/auth';
import {
  getFamilyMembers, addFamilyMember, editFamilyMember,
  removeFamilyMember, inviteFamilyMember,
} from '../../utils/api';

const RELATIONSHIP_OPTIONS = [
  { label: 'Select relationship...', value: '' },
  { label: 'Spouse', value: 'spouse' },
  { label: 'Mother', value: 'mother' },
  { label: 'Father', value: 'father' },
  { label: 'Daughter', value: 'daughter' },
  { label: 'Son', value: 'son' },
  { label: 'Sister', value: 'sister' },
  { label: 'Brother', value: 'brother' },
  { label: 'Grandmother', value: 'grandmother' },
  { label: 'Grandfather', value: 'grandfather' },
  { label: 'Granddaughter', value: 'granddaughter' },
  { label: 'Grandson', value: 'grandson' },
  { label: 'Aunt', value: 'aunt' },
  { label: 'Uncle', value: 'uncle' },
  { label: 'Niece', value: 'niece' },
  { label: 'Nephew', value: 'nephew' },
  { label: 'Cousin', value: 'cousin' },
  { label: 'Other', value: 'other' },
];

export default function FamilyScreen() {
  const [members, setMembers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null = add mode, object = edit mode
  const [saving, setSaving] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    relationship_to_user: '',
    email: '',
    birth_date: '',
    is_deceased: false,
    death_date: '',
  });

  // Date picker state
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [showDeathPicker, setShowDeathPicker] = useState(false);
  const [tempBirthDate, setTempBirthDate] = useState(new Date(1970, 0, 1));
  const [tempDeathDate, setTempDeathDate] = useState(new Date());

  // Detail modal state
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [inviting, setInviting] = useState(false);

  // ============================================================
  // Data loading
  // ============================================================

  const loadMembers = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    const result = await getFamilyMembers(token);
    if (result.data && result.data.success) {
      setMembers(result.data.members);
      setMeta(result.data.meta);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers(false);
  };

  // ============================================================
  // Date helpers
  // ============================================================

  const formatDateToString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
};

  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // ============================================================
  // Add/Edit form logic
  // ============================================================

  const resetForm = () => {
    setFormData({
      first_name: '', last_name: '', relationship_to_user: '',
      email: '', birth_date: '', is_deceased: false, death_date: '',
    });
    setTempBirthDate(new Date(1970, 0, 1));
    setTempDeathDate(new Date());
    setEditingMember(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const openEditForm = (member) => {
    // Find the relationship value that matches the display label
    const relValue = RELATIONSHIP_OPTIONS.find(
  o => o.value === (member.relationship || '').toLowerCase() ||
       o.label.toLowerCase() === (member.relationship || '').toLowerCase()
)?.value || member.relationship?.toLowerCase() || '';

    setEditingMember(member);
    setFormData({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      relationship_to_user: relValue,
      email: member.email || '',
      birth_date: member.birth_date || '',
      is_deceased: member.is_deceased || false,
      death_date: member.death_date || '',
    });
    setTempBirthDate(parseDateString(member.birth_date) || new Date(1970, 0, 1));
    setTempDeathDate(parseDateString(member.death_date) || new Date());
    setShowDetail(false);
    setShowAddForm(true);
  };

  const closeAddForm = () => {
    setShowAddForm(false);
    resetForm();
  };

  // Birth date picker handlers
  const onBirthDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowBirthPicker(false);
      if (event.type === 'set' && selectedDate) {
        setTempBirthDate(selectedDate);
        setFormData(prev => ({ ...prev, birth_date: formatDateToString(selectedDate) }));
      }
    } else {
      if (selectedDate) setTempBirthDate(selectedDate);
    }
  };

  const confirmBirthDate = () => {
    setFormData(prev => ({ ...prev, birth_date: formatDateToString(tempBirthDate) }));
    setShowBirthPicker(false);
  };

  const clearBirthDate = () => {
    setFormData(prev => ({ ...prev, birth_date: '' }));
    setTempBirthDate(new Date(1970, 0, 1));
    setShowBirthPicker(false);
  };

  // Death date picker handlers
  const onDeathDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDeathPicker(false);
      if (event.type === 'set' && selectedDate) {
        setTempDeathDate(selectedDate);
        setFormData(prev => ({ ...prev, death_date: formatDateToString(selectedDate) }));
      }
    } else {
      if (selectedDate) setTempDeathDate(selectedDate);
    }
  };

  const confirmDeathDate = () => {
    setFormData(prev => ({ ...prev, death_date: formatDateToString(tempDeathDate) }));
    setShowDeathPicker(false);
  };

  const clearDeathDate = () => {
    setFormData(prev => ({ ...prev, death_date: '' }));
    setTempDeathDate(new Date());
    setShowDeathPicker(false);
  };

  const handleSave = async () => {
    if (!formData.first_name.trim()) {
      Alert.alert('Required', 'First name is required.');
      return;
    }
    if (!formData.relationship_to_user) {
      Alert.alert('Required', 'Please select a relationship.');
      return;
    }
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSaving(true);
    const token = await getToken();
    if (!token) { Alert.alert('Error', 'You must be logged in.'); setSaving(false); return; }

    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      relationship: formData.relationship_to_user,
    };
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.birth_date) payload.birth_date = formData.birth_date;
    if (formData.is_deceased) {
      payload.is_deceased = 1;
      if (formData.death_date) payload.death_date = formData.death_date;
    } else {
      payload.is_deceased = 0;
      payload.death_date = '';
    }

    let result;
    if (editingMember) {
      result = await editFamilyMember(token, editingMember.id, payload);
    } else {
      result = await addFamilyMember(token, payload);
    }
    setSaving(false);

    if (result.data && result.data.success) {
      const msg = editingMember
        ? `${payload.first_name} has been updated.`
        : `${payload.first_name} has been added to your family tree.`;
      Alert.alert(editingMember ? 'Updated!' : 'Added!', msg);
      closeAddForm();
      loadMembers(false);
    } else {
      Alert.alert('Error', result.error || result.data?.message || 'Could not save member.');
    }
  };

  // ============================================================
  // Detail modal actions
  // ============================================================

  const openDetail = (member) => {
    setSelectedMember(member);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedMember(null);
  };

  const handleDelete = (member) => {
    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove ${member.first_name} ${member.last_name} from your family tree? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) return;
            const result = await removeFamilyMember(token, member.id);
            if (result.data && result.data.success) {
              Alert.alert('Removed', result.data.message);
              closeDetail();
              loadMembers(false);
            } else {
              Alert.alert('Error', result.error || result.data?.message || 'Could not remove member.');
            }
          },
        },
      ]
    );
  };

  const handleInvite = async (member) => {
    setInviting(true);
    const token = await getToken();
    if (!token) { setInviting(false); return; }
    const result = await inviteFamilyMember(token, member.id);
    setInviting(false);
    if (result.data && result.data.success) {
      Alert.alert('Sent!', result.data.message);
      loadMembers(false);
      // Refresh the selected member data
      const updated = await getFamilyMembers(token);
      if (updated.data && updated.data.success) {
        const refreshed = updated.data.members.find(m => m.id === member.id);
        if (refreshed) setSelectedMember(refreshed);
      }
    } else {
      Alert.alert('Error', result.error || result.data?.message || 'Could not send invitation.');
    }
  };

  // ============================================================
  // Helpers
  // ============================================================

  const getStatusBadge = (status) => {
    switch (status) {
      case 'registered': return { label: 'Joined', color: '#27ae60', bg: '#e8f8f0' };
      case 'invited': return { label: 'Invited', color: '#D4A574', bg: '#fdf3eb' };
      default: return { label: 'Not Invited', color: '#636E72', bg: '#f0f0f0' };
    }
  };

  const getInitials = (first, last) => {
    return ((first || '')[0] || '') + ((last || '')[0] || '');
  };

  const getRelationshipLabel = (value) => {
    const opt = RELATIONSHIP_OPTIONS.find(o => o.value === value);
    return opt ? opt.label : 'Select relationship...';
  };

  // ============================================================
  // Loading state
  // ============================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading family...</Text>
      </View>
    );
  }

  const nonSelfMembers = members.filter(m => !m.is_self);

  // ============================================================
  // Render
  // ============================================================

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family Tree</Text>
          <Text style={styles.headerSubtitle}>
            {meta ? `${meta.total_members} member${meta.total_members !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>

        {/* View Tree button */}
        <TouchableOpacity style={styles.viewTreeBtn} activeOpacity={0.7}>
          <Text style={styles.viewTreeText}>🌳  View Family Tree</Text>
        </TouchableOpacity>

        {/* Tier info */}
        {meta && !meta.is_premium && (
          <View style={styles.tierBar}>
            <Text style={styles.tierText}>
              {meta.addable_count} of {meta.max_free} members used
            </Text>
            <View style={styles.tierProgress}>
              <View style={[styles.tierFill, { width: `${Math.min((meta.addable_count / meta.max_free) * 100, 100)}%` }]} />
            </View>
          </View>
        )}

        {/* Member cards */}
        {nonSelfMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌳</Text>
            <Text style={styles.emptyTitle}>Start your family tree</Text>
            <Text style={styles.emptyDesc}>
              Add family members to build a living tree that grows as your family joins.
            </Text>
            <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={openAddForm}>
              <Text style={styles.addBtnText}>+ Add Family Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {nonSelfMembers.map((member) => {
              const badge = getStatusBadge(member.status);
              return (
                <TouchableOpacity
                  key={member.id} style={styles.card} activeOpacity={0.7}
                  onPress={() => openDetail(member)}
                >
                  {member.photo ? (
                    <Image source={{ uri: member.photo }} style={styles.photo} />
                  ) : (
                    <View style={styles.initialsCircle}>
                      <Text style={styles.initialsText}>
                        {getInitials(member.first_name, member.last_name)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{member.first_name} {member.last_name}</Text>
                    <Text style={styles.cardRelationship}>{member.relationship}</Text>
                    {member.is_deceased && <Text style={styles.deceasedLabel}>✝ Memorial</Text>}
                  </View>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {meta && meta.can_add && (
              <TouchableOpacity style={styles.addBtnBottom} activeOpacity={0.7} onPress={openAddForm}>
                <Text style={styles.addBtnBottomText}>+ Add Family Member</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ============================================================
          MEMBER DETAIL MODAL
          ============================================================ */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeDetail} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Member Details</Text>
            <View style={{ width: 50 }} />
          </View>

          {selectedMember && (
            <ScrollView style={styles.formScroll}>
              {/* Profile header */}
              <View style={styles.detailProfileSection}>
                {selectedMember.photo ? (
                  <Image source={{ uri: selectedMember.photo }} style={styles.detailPhoto} />
                ) : (
                  <View style={styles.detailInitialsCircle}>
                    <Text style={styles.detailInitialsText}>
                      {getInitials(selectedMember.first_name, selectedMember.last_name)}
                    </Text>
                  </View>
                )}
                <Text style={styles.detailName}>
                  {selectedMember.first_name} {selectedMember.last_name}
                </Text>
                <Text style={styles.detailRelationship}>{selectedMember.relationship}</Text>
                {(() => {
                  const badge = getStatusBadge(selectedMember.status);
                  return (
                    <View style={[styles.detailBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.detailBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  );
                })()}
                {selectedMember.is_deceased && (
                  <Text style={styles.detailDeceased}>✝ Memorial</Text>
                )}
              </View>

              {/* Info rows */}
              <View style={styles.detailCard}>
                {selectedMember.email && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedMember.email}</Text>
                  </View>
                )}
                {selectedMember.birth_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Born</Text>
                    <Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.birth_date)}</Text>
                  </View>
                )}
                {selectedMember.is_deceased && selectedMember.death_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Passed</Text>
                    <Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.death_date)}</Text>
                  </View>
                )}
                {selectedMember.invitation_sent && selectedMember.invitation_sent_at && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invitation Sent</Text>
                    <Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.invitation_sent_at?.split(' ')[0])}</Text>
                  </View>
                )}
                {selectedMember.created_at && (
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>Added</Text>
                    <Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.created_at?.split(' ')[0])}</Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.detailActions}>
                {/* Edit button */}
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => openEditForm(selectedMember)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnText}>✏️  Edit Details</Text>
                </TouchableOpacity>

                {/* Invite / Resend button — show if has email and not registered */}
                {selectedMember.email && selectedMember.status !== 'registered' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnGold]}
                    onPress={() => handleInvite(selectedMember)}
                    disabled={inviting}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionBtnGoldText}>
                      {inviting ? 'Sending...' : selectedMember.invitation_sent ? '📧  Resend Invitation' : '📧  Send Invitation'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Delete button */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => handleDelete(selectedMember)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionBtnDangerText}>🗑  Remove from Family Tree</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ============================================================
          ADD / EDIT MEMBER MODAL
          ============================================================ */}
      <Modal visible={showAddForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeAddForm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              {/* First Name */}
              <Text style={styles.fieldLabel}>First Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="First name"
                placeholderTextColor="#B2BEC3"
                value={formData.first_name}
                onChangeText={(val) => setFormData(prev => ({ ...prev, first_name: val }))}
                autoCapitalize="words"
                returnKeyType="next"
              />

              {/* Last Name */}
              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Last name"
                placeholderTextColor="#B2BEC3"
                value={formData.last_name}
                onChangeText={(val) => setFormData(prev => ({ ...prev, last_name: val }))}
                autoCapitalize="words"
                returnKeyType="next"
              />

              {/* Relationship Picker */}
              <Text style={styles.fieldLabel}>Relationship *</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowRelPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.pickerBtnText,
                  !formData.relationship_to_user && { color: '#B2BEC3' }
                ]}>
                  {getRelationshipLabel(formData.relationship_to_user)}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {/* Email */}
              <Text style={styles.fieldLabel}>Email (optional)</Text>
              <Text style={styles.fieldHint}>Add email to send an invitation to join</Text>
              <TextInput
                style={styles.textInput}
                placeholder="email@example.com"
                placeholderTextColor="#B2BEC3"
                value={formData.email}
                onChangeText={(val) => setFormData(prev => ({ ...prev, email: val }))}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />

              {/* Birth Date */}
              <Text style={styles.fieldLabel}>Birth Date (optional)</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowBirthPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerBtnText, !formData.birth_date && { color: '#B2BEC3' }]}>
                  {formData.birth_date ? formatDateForDisplay(formData.birth_date) : 'Select date...'}
                </Text>
                <Text style={styles.pickerArrow}>📅</Text>
              </TouchableOpacity>

              {showBirthPicker && Platform.OS === 'ios' && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker
                    value={tempBirthDate} mode="date" display="spinner"
                    onChange={onBirthDateChange}
                    maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
                    style={{ height: 150 }}
                  />
                  <View style={styles.datePickerActions}>
                    <TouchableOpacity onPress={clearBirthDate} style={styles.datePickerClear}>
                      <Text style={styles.datePickerClearText}>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmBirthDate} style={styles.datePickerConfirm}>
                      <Text style={styles.datePickerConfirmText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {showBirthPicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={tempBirthDate} mode="date" display="default"
                  onChange={onBirthDateChange}
                  maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
                />
              )}

              {/* Deceased toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setFormData(prev => ({ ...prev, is_deceased: !prev.is_deceased, death_date: '' }))}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleBox, formData.is_deceased && styles.toggleBoxOn]}>
                  {formData.is_deceased && <Text style={styles.toggleCheck}>✓</Text>}
                </View>
                <Text style={styles.toggleLabel}>This person is deceased</Text>
              </TouchableOpacity>

              {/* Death Date */}
              {formData.is_deceased && (
                <>
                  <Text style={styles.fieldLabel}>Death Date (optional)</Text>
                  <TouchableOpacity
                    style={styles.pickerBtn}
                    onPress={() => setShowDeathPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerBtnText, !formData.death_date && { color: '#B2BEC3' }]}>
                      {formData.death_date ? formatDateForDisplay(formData.death_date) : 'Select date...'}
                    </Text>
                    <Text style={styles.pickerArrow}>📅</Text>
                  </TouchableOpacity>

                  {showDeathPicker && Platform.OS === 'ios' && (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={tempDeathDate} mode="date" display="spinner"
                        onChange={onDeathDateChange}
                        maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
                        style={{ height: 150 }}
                      />
                      <View style={styles.datePickerActions}>
                        <TouchableOpacity onPress={clearDeathDate} style={styles.datePickerClear}>
                          <Text style={styles.datePickerClearText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={confirmDeathDate} style={styles.datePickerConfirm}>
                          <Text style={styles.datePickerConfirmText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {showDeathPicker && Platform.OS === 'android' && (
                    <DateTimePicker
                      value={tempDeathDate} mode="date" display="default"
                      onChange={onDeathDateChange}
                      maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)}
                    />
                  )}
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* Relationship Picker */}
        <Modal visible={showRelPicker} animationType="fade" transparent>
          <TouchableOpacity
            style={styles.pickerOverlay} activeOpacity={1}
            onPress={() => setShowRelPicker(false)}
          >
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerSheetTitle}>Select Relationship</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {RELATIONSHIP_OPTIONS.filter(o => o.value !== '').map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.pickerOption, formData.relationship_to_user === opt.value && styles.pickerOptionSelected]}
                    onPress={() => { setFormData(prev => ({ ...prev, relationship_to_user: opt.value })); setShowRelPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerOptionText, formData.relationship_to_user === opt.value && styles.pickerOptionTextSelected]}>
                      {opt.label}
                    </Text>
                    {formData.relationship_to_user === opt.value && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </Modal>
    </View>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  loadingContainer: { flex: 1, backgroundColor: '#FAF8F5', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#636E72', fontSize: 14 },

  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#2D3436' },
  headerSubtitle: { fontSize: 14, color: '#636E72', marginTop: 4 },

  viewTreeBtn: { backgroundColor: '#2C5F7B', borderRadius: 12, padding: 14, alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  viewTreeText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  tierBar: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFF', borderRadius: 10, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  tierText: { fontSize: 12, color: '#636E72', marginBottom: 6 },
  tierProgress: { height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden' },
  tierFill: { height: '100%', backgroundColor: '#2C5F7B', borderRadius: 3 },

  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: '#636E72', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  addBtn: { backgroundColor: '#D4A574', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  photo: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  initialsCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2C5F7B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  initialsText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#2D3436' },
  cardRelationship: { fontSize: 13, color: '#636E72', marginTop: 2 },
  deceasedLabel: { fontSize: 11, color: '#9A9A9A', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  addBtnBottom: { marginHorizontal: 16, marginTop: 6, backgroundColor: '#D4A574', borderRadius: 12, padding: 14, alignItems: 'center' },
  addBtnBottomText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // ============================================================
  // Modal shared styles
  // ============================================================
  modalContainer: { flex: 1, backgroundColor: '#FAF8F5' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#2C5F7B',
  },
  modalCancel: { color: '#FFF', fontSize: 15 },
  modalTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  modalSave: { color: '#D4A574', fontSize: 15, fontWeight: '700' },
  formScroll: { flex: 1, padding: 16 },

  // ============================================================
  // Detail modal styles
  // ============================================================
  detailProfileSection: { alignItems: 'center', paddingVertical: 24 },
  detailPhoto: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  detailInitialsCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#2C5F7B',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  detailInitialsText: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  detailName: { fontSize: 22, fontWeight: '700', color: '#2D3436' },
  detailRelationship: { fontSize: 15, color: '#636E72', marginTop: 4 },
  detailBadge: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  detailBadgeText: { fontSize: 13, fontWeight: '600' },
  detailDeceased: { fontSize: 13, color: '#9A9A9A', marginTop: 6 },

  detailCard: {
    backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#E8E5DE',
  },
  detailLabel: { fontSize: 14, color: '#636E72' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#2D3436', textAlign: 'right', flex: 1, marginLeft: 16 },

  detailActions: { gap: 10 },
  actionBtn: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#E8E5DE',
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#2C5F7B' },
  actionBtnGold: { backgroundColor: '#FDF3EB', borderColor: '#D4A574' },
  actionBtnGoldText: { fontSize: 15, fontWeight: '600', color: '#D4A574' },
  actionBtnDanger: { backgroundColor: '#FFF5F5', borderColor: '#E74C3C' },
  actionBtnDangerText: { fontSize: 15, fontWeight: '600', color: '#E74C3C' },

  // ============================================================
  // Form styles
  // ============================================================
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#2D3436', marginTop: 16, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#636E72', marginBottom: 6, marginTop: -2 },
  textInput: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 14, fontSize: 15, color: '#2D3436',
    borderWidth: 1, borderColor: '#E8E5DE',
  },
  pickerBtn: {
    backgroundColor: '#FFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E8E5DE',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerBtnText: { fontSize: 15, color: '#2D3436' },
  pickerArrow: { fontSize: 12, color: '#636E72' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 40, paddingHorizontal: 16,
  },
  pickerSheetTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', textAlign: 'center', marginBottom: 16 },
  pickerOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#E8E5DE',
  },
  pickerOptionSelected: { backgroundColor: '#F0F7FB' },
  pickerOptionText: { fontSize: 16, color: '#2D3436' },
  pickerOptionTextSelected: { color: '#2C5F7B', fontWeight: '600' },
  pickerCheck: { fontSize: 16, color: '#2C5F7B', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 4 },
  toggleBox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D0D0D0',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  toggleBoxOn: { backgroundColor: '#2C5F7B', borderColor: '#2C5F7B' },
  toggleCheck: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  toggleLabel: { fontSize: 14, color: '#2D3436' },
  datePickerContainer: {
    backgroundColor: '#FFF', borderRadius: 10, marginTop: 8,
    borderWidth: 1, borderColor: '#E8E5DE', overflow: 'hidden',
  },
  datePickerActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: '#E8E5DE', padding: 10,
  },
  datePickerClear: { paddingVertical: 6, paddingHorizontal: 16 },
  datePickerClearText: { color: '#636E72', fontSize: 15 },
  datePickerConfirm: { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#2C5F7B', borderRadius: 8 },
  datePickerConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});