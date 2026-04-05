import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, Image,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { getToken } from '../../utils/auth';
import {
  getTapestryConnections, getTapestryNetwork,
  sendTapestryInvite, acceptTapestryInvite, declineTapestryInvite,
  removeTapestryConnection, resendTapestryInvite, cancelTapestryInvite,
} from '../../utils/api';

// ============================================================
// Main Tapestry Screen — List View (default)
// ============================================================

export default function TapestryScreen() {
  const [connections, setConnections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showViz, setShowViz] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  // Invite form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadData = useCallback(async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    const { data, error } = await getTapestryConnections(token);
    if (data && data.success) {
      setConnections(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ---- Actions ----

  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      Alert.alert('Missing Info', 'Please enter both name and email.');
      return;
    }
    setInviteLoading(true);
    const token = await getToken();
    if (!token) { setInviteLoading(false); return; }
    const { data, error } = await sendTapestryInvite(token, inviteName.trim(), inviteEmail.trim());
    setInviteLoading(false);
    if (error) {
      Alert.alert('Error', error);
    } else if (data && data.success) {
      Alert.alert('Sent!', data.message);
      setInviteName('');
      setInviteEmail('');
      loadData();
    } else {
      Alert.alert('Error', data?.message || 'Something went wrong.');
    }
  };

  const handleAccept = async (connectionId) => {
    setActionLoading(connectionId);
    const token = await getToken();
    if (!token) { setActionLoading(null); return; }
    const { data, error } = await acceptTapestryInvite(token, connectionId);
    setActionLoading(null);
    if (data?.success) {
      Alert.alert('Connected!', data.message);
      loadData();
    } else {
      Alert.alert('Error', error || data?.message || 'Failed to accept.');
    }
  };

  const handleDecline = async (connectionId) => {
    Alert.alert('Decline Invitation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline', style: 'destructive', onPress: async () => {
          setActionLoading(connectionId);
          const token = await getToken();
          const { data } = await declineTapestryInvite(token, connectionId);
          setActionLoading(null);
          if (data?.success) loadData();
        }
      },
    ]);
  };

  const handleRemove = async (connectionId, friendName) => {
    Alert.alert('Remove Connection', `Remove ${friendName} from your tapestry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setActionLoading(connectionId);
          const token = await getToken();
          const { data } = await removeTapestryConnection(token, connectionId);
          setActionLoading(null);
          if (data?.success) loadData();
        }
      },
    ]);
  };

  const handleResend = async (connectionId) => {
    setActionLoading(connectionId);
    const token = await getToken();
    if (!token) { setActionLoading(null); return; }
    const { data, error } = await resendTapestryInvite(token, connectionId);
    setActionLoading(null);
    if (data?.success) {
      Alert.alert('Resent!', data.message);
    } else {
      Alert.alert('Error', error || data?.message || 'Failed to resend.');
    }
  };

  const handleCancel = async (connectionId) => {
    Alert.alert('Cancel Invitation', 'Are you sure you want to cancel this invitation?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Invitation', style: 'destructive', onPress: async () => {
          setActionLoading(connectionId);
          const token = await getToken();
          const { data } = await cancelTapestryInvite(token, connectionId);
          setActionLoading(null);
          if (data?.success) loadData();
        }
      },
    ]);
  };

  // ---- Visualization ----

  if (showViz) {
    return (
      <TapestryVisualization
        onBack={() => setShowViz(false)}
      />
    );
  }

  // ---- Loading State ----

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading your tapestry...</Text>
      </View>
    );
  }

  const friends = connections?.friends || [];
  const pendingSent = connections?.pending_sent || [];
  const pendingReceived = connections?.pending_received || [];
  const friendCount = connections?.friend_count || 0;
  const friendLimit = connections?.friend_limit || -1;
  const isFree = connections?.is_free || false;
  const tierLimitReached = connections?.tier_limit_reached || false;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Tapestry</Text>
        <Text style={styles.headerSubtitle}>Your friend network</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{friendCount}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{pendingSent.length}</Text>
          <Text style={styles.statLabel}>Pending sent</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{pendingReceived.length}</Text>
          <Text style={styles.statLabel}>Received</Text>
        </View>
      </View>

      {/* Tier Progress (free users) */}
      {isFree && (
        <View style={styles.tierBar}>
          <View style={styles.tierTrack}>
            <View style={[styles.tierFill, { width: `${Math.min((friendCount / 5) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.tierText}>{friendCount} of 5 friends (free tier)</Text>
        </View>
      )}

      {/* Invite Form */}
      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Invite a friend</Text>
        <View style={styles.inviteFields}>
          <TextInput
            style={styles.inviteInput}
            placeholder="Friend's name"
            placeholderTextColor="#999"
            value={inviteName}
            onChangeText={setInviteName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.inviteInput}
            placeholder="Email address"
            placeholderTextColor="#999"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity
          style={[styles.sendBtn, (inviteLoading || tierLimitReached) && styles.sendBtnDisabled]}
          onPress={handleInvite}
          disabled={inviteLoading || tierLimitReached}
          activeOpacity={0.7}
        >
          {inviteLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.sendBtnText}>
              {tierLimitReached ? 'Upgrade to invite more' : 'Send Invitation'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* View Visualization Button */}
      {friendCount > 0 && (
        <TouchableOpacity style={styles.viewVizBtn} onPress={() => setShowViz(true)} activeOpacity={0.7}>
          <Text style={styles.viewVizText}>✦  View Tapestry</Text>
        </TouchableOpacity>
      )}

      {/* Pending Received */}
      {pendingReceived.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invitations Received</Text>
          {pendingReceived.map((item) => (
            <View key={item.connection_id} style={styles.pendingCard}>
              <View style={styles.pendingInfo}>
                <View style={[styles.avatar, { backgroundColor: '#D4A574' }]}>
                  <Text style={styles.avatarText}>
                    {item.inviter?.initials || '??'}
                  </Text>
                </View>
                <View style={styles.pendingDetails}>
                  <Text style={styles.pendingName}>{item.inviter?.name || 'Unknown'}</Text>
                  <Text style={styles.pendingDate}>
                    Invited {formatDate(item.sent_at)}
                  </Text>
                </View>
              </View>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(item.connection_id)}
                  disabled={actionLoading === item.connection_id}
                  activeOpacity={0.7}
                >
                  {actionLoading === item.connection_id ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.acceptBtnText}>Accept</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => handleDecline(item.connection_id)}
                  disabled={actionLoading === item.connection_id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Friends List */}
      {friends.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Friends</Text>
          {friends.map((friend) => (
            <View key={friend.connection_id} style={styles.friendCard}>
              <View style={styles.friendInfo}>
                {friend.photo ? (
                  <Image source={{ uri: friend.photo }} style={styles.friendPhoto} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: '#2C5F7B' }]}>
                    <Text style={styles.avatarText}>{friend.initials}</Text>
                  </View>
                )}
                <View style={styles.friendDetails}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendMeta}>
                    Connected {formatDate(friend.connected_since)}
                    {friend.video_count > 0 ? ` · ${friend.video_count} stories` : ''}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(friend.connection_id, friend.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Pending Sent */}
      {pendingSent.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pending Invitations</Text>
          {pendingSent.map((item) => (
            <View key={item.connection_id} style={styles.pendingCard}>
              <View style={styles.pendingInfo}>
                <View style={[styles.avatar, { backgroundColor: '#8FA99A' }]}>
                  <Text style={styles.avatarText}>
                    {(item.invited_name || '??').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.pendingDetails}>
                  <Text style={styles.pendingName}>{item.invited_name}</Text>
                  <Text style={styles.pendingDate}>
                    Sent {formatDate(item.sent_at)} · {item.invited_email}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={() => handleResend(item.connection_id)}
                  disabled={actionLoading === item.connection_id}
                  activeOpacity={0.7}
                >
                  {actionLoading === item.connection_id ? (
                    <ActivityIndicator size="small" color="#2C5F7B" />
                  ) : (
                    <Text style={styles.resendBtnText}>Resend</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => handleCancel(item.connection_id)}
                  disabled={actionLoading === item.connection_id}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Empty State */}
      {friends.length === 0 && pendingSent.length === 0 && pendingReceived.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🕸</Text>
          <Text style={styles.emptyTitle}>Weave your tapestry</Text>
          <Text style={styles.emptyDesc}>
            Invite friends to connect. Every life is woven into others — make yours visible.
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}


// ============================================================
// Tapestry Visualization — Cytoscape.js in WebView
// ============================================================

function TapestryVisualization({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [networkData, setNetworkData] = useState(null);
  const webviewRef = useRef(null);

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    const { data } = await getTapestryNetwork(token);
    if (data?.success) {
      setNetworkData(data);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNetwork();
    }, [loadNetwork])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2C5F7B" />
        <Text style={styles.loadingText}>Loading network...</Text>
      </View>
    );
  }

  const html = buildTapestryHTML(networkData);

  return (
    <View style={styles.vizContainer}>
      <View style={styles.vizHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.vizHeaderBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.vizHeaderTitle}>The Tapestry</Text>
        <View style={{ width: 50 }} />
      </View>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={{ flex: 1, backgroundColor: '#FAF8F5' }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        scrollEnabled={false}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#2C5F7B" />
          </View>
        )}
      />
    </View>
  );
}


// ============================================================
// Build Cytoscape.js HTML for WebView
// ============================================================

function buildTapestryHTML(networkData) {
  const nodes = networkData?.nodes || [];
  const edges = networkData?.edges || [];

  const cyNodes = nodes.map(n => ({
    data: {
      id: String(n.id),
      label: n.name || 'Unknown',
      initials: n.initials || '??',
      degree: n.degree || 0,
      isCurrentUser: n.is_current_user || false,
      videoCount: n.video_count || 0,
      photo: n.photo || '',
    }
  }));

  const cyEdges = edges.map(e => ({
    data: {
      id: e.id,
      source: String(e.source),
      target: String(e.target),
    }
  }));

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #FAF8F5; overflow: hidden; font-family: -apple-system, sans-serif; }
  #cy { width: 100vw; height: calc(100vh - 50px); }
  .toolbar {
    height: 50px; display: flex; align-items: center; justify-content: center; gap: 10px;
    background: #FFF; border-top: 1px solid #E8E5DE;
  }
  .tb-btn {
    padding: 8px 16px; border-radius: 8px; border: 1px solid #E0DDD6;
    background: #FFF; color: #2C5F7B; font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .tb-btn:active { background: #F0EFEC; }
  #detail {
    display: none; position: fixed; bottom: 50px; left: 0; right: 0;
    background: #FFF; border-top: 1px solid #E8E5DE; padding: 16px 20px;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.1);
  }
  .detail-name { font-size: 18px; font-weight: 700; color: #2D3436; }
  .detail-degree { font-size: 13px; color: #636E72; margin-top: 2px; }
  .detail-stats { font-size: 12px; color: #8FA99A; margin-top: 4px; }
  .detail-close {
    position: absolute; top: 12px; right: 16px; font-size: 18px; color: #999; cursor: pointer;
  }
  .legend {
    position: fixed; top: 10px; right: 10px; background: rgba(255,255,255,0.95);
    border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #636E72;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }
  .legend-item { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
</style>
</head>
<body>

<div id="cy"></div>

<div class="legend">
  <div class="legend-item"><div class="legend-dot" style="background:#2C5F7B"></div> You</div>
  <div class="legend-item"><div class="legend-dot" style="background:#D4A574"></div> 1st degree</div>
  <div class="legend-item"><div class="legend-dot" style="background:#8FA99A"></div> 2nd+ degree</div>
</div>

<div id="detail">
  <div class="detail-close" onclick="document.getElementById('detail').style.display='none'">&#x2715;</div>
  <div class="detail-name" id="d-name"></div>
  <div class="detail-degree" id="d-degree"></div>
  <div class="detail-stats" id="d-stats"></div>
</div>

<div class="toolbar">
  <button class="tb-btn" onclick="cy.fit(null, 30)">Fit</button>
  <button class="tb-btn" onclick="cy.zoom(cy.zoom() * 1.3); cy.center()">Zoom +</button>
  <button class="tb-btn" onclick="cy.zoom(cy.zoom() / 1.3); cy.center()">Zoom &#x2212;</button>
</div>

<script>
var elements = ${JSON.stringify([...cyNodes, ...cyEdges])};

var cy = cytoscape({
  container: document.getElementById('cy'),
  elements: elements,
  minZoom: 0.3,
  maxZoom: 3,
  style: [
    {
      selector: 'node',
      style: {
        'width': function(n) { return n.data('isCurrentUser') ? 56 : 44; },
        'height': function(n) { return n.data('isCurrentUser') ? 56 : 44; },
        'background-color': function(n) {
          if (n.data('isCurrentUser')) return '#2C5F7B';
          if (n.data('degree') === 1) return '#D4A574';
          return '#8FA99A';
        },
        'border-width': function(n) { return n.data('isCurrentUser') ? 3 : 2; },
        'border-color': function(n) { return n.data('isCurrentUser') ? '#D4A574' : '#FFF'; },
        'content': function(n) { return n.data('initials'); },
        'text-halign': 'center',
        'text-valign': 'center',
        'font-size': function(n) { return n.data('isCurrentUser') ? 14 : 12; },
        'font-weight': 600,
        'color': '#FFF',
      }
    },
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'text-valign': 'bottom',
        'text-margin-y': 8,
        'font-size': 10,
        'color': '#2D3436',
        'text-outline-color': '#FAF8F5',
        'text-outline-width': 1.5,
        'text-wrap': 'ellipsis',
        'text-max-width': 80,
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#D4A574',
        'line-opacity': 0.4,
        'curve-style': 'bezier',
      }
    },
    {
      selector: '.highlighted',
      style: {
        'line-opacity': 0.9,
        'width': 3,
        'line-color': '#D4A574',
      }
    },
    {
      selector: '.dimmed',
      style: {
        'opacity': 0.15,
      }
    },
  ],

  layout: {
    name: 'cose',
    idealEdgeLength: 120,
    nodeRepulsion: 6000,
    gravity: 0.3,
    numIter: 500,
    animate: true,
    animationDuration: 800,
    padding: 40,
  }
});

// Tap node — show detail panel
cy.on('tap', 'node', function(evt) {
  var node = evt.target;
  var d = node.data();
  document.getElementById('d-name').textContent = d.label;
  var degreeLabels = ['You', '1st degree', '2nd degree', '3rd degree'];
  document.getElementById('d-degree').textContent = degreeLabels[d.degree] || (d.degree + 'th degree');
  var stats = d.videoCount > 0 ? d.videoCount + ' stories shared' : 'No stories yet';
  document.getElementById('d-stats').textContent = stats;
  document.getElementById('detail').style.display = 'block';

  // Highlight connected edges
  cy.elements().removeClass('highlighted dimmed');
  var connected = node.connectedEdges().union(node.connectedEdges().connectedNodes());
  cy.elements().not(connected).not(node).addClass('dimmed');
  node.connectedEdges().addClass('highlighted');
});

// Tap background — reset
cy.on('tap', function(evt) {
  if (evt.target === cy) {
    cy.elements().removeClass('highlighted dimmed');
    document.getElementById('detail').style.display = 'none';
  }
});

// Fit after layout
cy.on('layoutstop', function() {
  cy.fit(null, 30);
});
<\/script>
</body>
</html>`;
}


// ============================================================
// Helper: Format date string
// ============================================================

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}


// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  centered: { flex: 1, backgroundColor: '#FAF8F5', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#636E72' },

  // Header
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#2D3436' },
  headerSubtitle: { fontSize: 14, color: '#636E72', marginTop: 4 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 0.5, borderColor: '#E8E5DE' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#2C5F7B' },
  statLabel: { fontSize: 10, color: '#636E72', marginTop: 2 },

  // Tier bar
  tierBar: { marginHorizontal: 16, marginBottom: 12 },
  tierTrack: { height: 4, backgroundColor: '#E8E5DE', borderRadius: 2, overflow: 'hidden' },
  tierFill: { height: 4, backgroundColor: '#D4A574', borderRadius: 2 },
  tierText: { fontSize: 11, color: '#636E72', marginTop: 4, textAlign: 'center' },

  // Invite form
  inviteCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, borderWidth: 0.5, borderColor: '#E8E5DE', marginHorizontal: 16, marginBottom: 12 },
  inviteLabel: { fontSize: 13, fontWeight: '700', color: '#2D3436', marginBottom: 10 },
  inviteFields: { gap: 8, marginBottom: 10 },
  inviteInput: { height: 40, borderWidth: 0.5, borderColor: '#E0DDD6', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#FAF8F5', fontSize: 14, color: '#2D3436' },
  sendBtn: { backgroundColor: '#2C5F7B', borderRadius: 8, padding: 12, alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#A0B4BF' },
  sendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // View viz button
  viewVizBtn: { backgroundColor: '#2C5F7B', borderRadius: 10, padding: 13, alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  viewVizText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Sections
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2D3436', marginBottom: 8 },

  // Friend cards
  friendCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: '#E8E5DE' },
  friendInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  friendPhoto: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  friendDetails: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  friendMeta: { fontSize: 12, color: '#636E72', marginTop: 2 },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FAF8F5', justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { fontSize: 14, color: '#999' },

  // Pending cards
  pendingCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: '#E8E5DE' },
  pendingInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pendingDetails: { flex: 1, marginLeft: 10 },
  pendingName: { fontSize: 14, fontWeight: '600', color: '#2D3436' },
  pendingDate: { fontSize: 11, color: '#636E72', marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, backgroundColor: '#2C5F7B', borderRadius: 8, padding: 10, alignItems: 'center' },
  acceptBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  declineBtn: { flex: 1, backgroundColor: '#FAF8F5', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 0.5, borderColor: '#E0DDD6' },
  declineBtnText: { color: '#636E72', fontSize: 13, fontWeight: '600' },
  resendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FAF8F5', borderWidth: 0.5, borderColor: '#E0DDD6' },
  resendBtnText: { fontSize: 12, fontWeight: '600', color: '#2C5F7B' },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFF5F5', borderWidth: 0.5, borderColor: '#E8C4C4' },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#E74C3C' },

  // Avatar
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: '#636E72', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  // Visualization
  vizContainer: { flex: 1, backgroundColor: '#FAF8F5' },
  vizHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#2C5F7B' },
  vizHeaderBack: { color: '#FFF', fontSize: 15 },
  vizHeaderTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5' },
});