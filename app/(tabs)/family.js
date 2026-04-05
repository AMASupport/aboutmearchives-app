import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, RefreshControl, TextInput, Modal, Platform,
  KeyboardAvoidingView, Dimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from 'expo-router';
import { getToken } from '../../utils/auth';
import {
  getFamilyMembers, addFamilyMember, editFamilyMember,
  removeFamilyMember, inviteFamilyMember,
} from '../../utils/api';

const API_BASE = 'https://aboutmearchives.com/wp-json/tlr/v1';

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

// ============================================================
// Family Tree HTML for WebView
// ============================================================
function buildTreeHTML(token) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #FAF8F5; font-family: -apple-system, sans-serif; overflow: hidden; }
  #tree-container { width: 100vw; height: 100vh; }
  #loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; }
  #loading p { color: #636E72; font-size: 14px; margin-top: 10px; }
  .spinner { width: 30px; height: 30px; border: 3px solid #E8E8E8; border-top-color: #2C5F7B;
    border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
  @keyframes spin { to { transform: rotate(360deg); } }
  #empty { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    text-align: center; color: #636E72; font-size: 15px; }
  /* Detail panel */
  #detail-panel { display: none; position: absolute; bottom: 0; left: 0; right: 0;
    background: #fff; border-top-left-radius: 16px; border-top-right-radius: 16px;
    padding: 16px 20px 30px; box-shadow: 0 -4px 20px rgba(0,0,0,0.1); z-index: 10; }
  #detail-panel .dp-name { font-size: 18px; font-weight: 700; color: #2D3436; }
  #detail-panel .dp-rel { font-size: 13px; color: #636E72; margin-top: 2px; }
  #detail-panel .dp-status { display: inline-block; font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 10px; margin-top: 6px; }
  #detail-panel .dp-close { position: absolute; top: 12px; right: 16px; font-size: 20px;
    color: #636E72; cursor: pointer; padding: 4px; }
  /* Zoom controls */
  #zoom-controls { position: absolute; bottom: 16px; right: 16px; display: flex;
    flex-direction: column; gap: 6px; z-index: 5; }
  .zoom-btn { width: 40px; height: 40px; border-radius: 10px; background: #fff;
    border: 1px solid #E8E5DE; display: flex; align-items: center; justify-content: center;
    font-size: 20px; color: #2C5F7B; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
</style>
</head><body>
<div id="tree-container">
  <svg id="tree-svg"></svg>
</div>
<div id="loading"><div class="spinner"></div><p>Loading family tree...</p></div>
<div id="empty">No family tree data yet.<br>Add some family members first.</div>
<div id="detail-panel">
  <span class="dp-close" onclick="closePanel()">&times;</span>
  <div class="dp-name" id="dp-name"></div>
  <div class="dp-rel" id="dp-rel"></div>
  <div class="dp-status" id="dp-status"></div>
</div>
<div id="zoom-controls">
  <div class="zoom-btn" onclick="zoomIn()">+</div>
  <div class="zoom-btn" onclick="zoomOut()">−</div>
  <div class="zoom-btn" onclick="fitView()" style="font-size:14px;">⟲</div>
</div>

<script>
const TOKEN = '${token}';
const API = '${API_BASE}/family/tree';

// Colors
const TEAL = '#2C5F7B';
const GOLD = '#D4A574';
const CREAM = '#FAF8F5';
const SAGE = '#8FA99A';
const TEXT = '#2D3436';
const LIGHT = '#636E72';
const GRAY = '#9A9A9A';

// Card dimensions
const CARD_W = 140;
const CARD_H = 60;
const H_GAP = 40;
const V_GAP = 80;

let svg, g, zoom, nodes = [], selfId = null;

async function init() {
  try {
    const resp = await fetch(API, { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    const data = await resp.json();
    document.getElementById('loading').style.display = 'none';
    if (!data.success || !data.nodes || data.nodes.length === 0) {
      document.getElementById('empty').style.display = 'block';
      return;
    }
    nodes = data.nodes;
    selfId = data.selfMemberId;
    buildTree();
  } catch(e) {
    document.getElementById('loading').innerHTML = '<p style="color:#E74C3C;">Could not load tree data.</p>';
  }
}

function buildTree() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  svg = d3.select('#tree-svg')
    .attr('width', width)
    .attr('height', height);

  zoom = d3.zoom()
    .scaleExtent([0.2, 3])
    .on('zoom', (e) => g.attr('transform', e.transform));

  svg.call(zoom);
  g = svg.append('g');

  // Build hierarchy from nodes
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = { ...n, children: [], spouseIds: n.pids || [], x: 0, y: 0, gen: null }; });

  // Find root (current user)
  let rootId = selfId;
  if (!nodeMap[rootId]) rootId = nodes[0].id;

  // BFS to assign generations
  const queue = [rootId];
  nodeMap[rootId].gen = 0;
  const visited = new Set([rootId]);

  // Also traverse spouses at same generation
  while (queue.length > 0) {
    const cid = queue.shift();
    const cn = nodeMap[cid];
    if (!cn) continue;

    // Spouses get same generation
    (cn.spouseIds || []).forEach(sid => {
      if (nodeMap[sid] && !visited.has(sid)) {
        nodeMap[sid].gen = cn.gen;
        visited.add(sid);
        queue.push(sid);
      }
    });

    // Find children (nodes where fid or mid === cid)
    nodes.forEach(n => {
      if (!visited.has(n.id) && (n.fid === cid || n.mid === cid)) {
        nodeMap[n.id].gen = cn.gen + 1;
        visited.add(n.id);
        queue.push(n.id);
      }
    });

    // Find parents (fid/mid of current node)
    [cn.fid, cn.mid].forEach(pid => {
      if (pid && nodeMap[pid] && !visited.has(pid)) {
        nodeMap[pid].gen = cn.gen - 1;
        visited.add(pid);
        queue.push(pid);
      }
    });
  }

  // Handle unvisited nodes
  nodes.forEach(n => {
    if (!visited.has(n.id) && nodeMap[n.id]) {
      nodeMap[n.id].gen = 0;
    }
  });

  // Group by generation
  const genGroups = {};
  Object.values(nodeMap).forEach(n => {
    const g = n.gen || 0;
    if (!genGroups[g]) genGroups[g] = [];
    genGroups[g].push(n);
  });

  const gens = Object.keys(genGroups).map(Number).sort((a, b) => a - b);
  const minGen = gens[0] || 0;

  // Position nodes
  gens.forEach((gen, gi) => {
    const row = genGroups[gen];
    const rowWidth = row.length * (CARD_W + H_GAP) - H_GAP;
    const startX = -rowWidth / 2;
    row.forEach((node, ni) => {
      node.x = startX + ni * (CARD_W + H_GAP);
      node.y = (gen - minGen) * (CARD_H + V_GAP);
    });
  });

  // Draw connections
  const drawnConnections = new Set();

  // Parent-child lines
  Object.values(nodeMap).forEach(n => {
    [n.fid, n.mid].forEach(pid => {
      if (pid && nodeMap[pid]) {
        const key = pid + '-' + n.id;
        if (drawnConnections.has(key)) return;
        drawnConnections.add(key);
        const parent = nodeMap[pid];
        const px = parent.x + CARD_W / 2;
        const py = parent.y + CARD_H;
        const cx = n.x + CARD_W / 2;
        const cy = n.y;
        const midY = py + (cy - py) / 2;
        g.append('path')
          .attr('d', 'M' + px + ',' + py + ' L' + px + ',' + midY + ' L' + cx + ',' + midY + ' L' + cx + ',' + cy)
          .attr('fill', 'none')
          .attr('stroke', GOLD)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.6);
      }
    });
  });

  // Spouse lines
  Object.values(nodeMap).forEach(n => {
    (n.spouseIds || []).forEach(sid => {
      const key = Math.min(n.id, sid) + '_sp_' + Math.max(n.id, sid);
      if (drawnConnections.has(key)) return;
      drawnConnections.add(key);
      if (!nodeMap[sid]) return;
      const s = nodeMap[sid];
      const y = n.y + CARD_H / 2;
      const x1 = Math.min(n.x, s.x) + CARD_W;
      const x2 = Math.max(n.x, s.x);
      g.append('line')
        .attr('x1', x1).attr('y1', y)
        .attr('x2', x2).attr('y2', y)
        .attr('stroke', GOLD)
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.7);
      // Heart
      const hx = (x1 + x2) / 2;
      g.append('text')
        .attr('x', hx).attr('y', y + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .text('♥')
        .attr('fill', GOLD);
    });
  });

  // Draw node cards
  Object.values(nodeMap).forEach(n => {
    const card = g.append('g')
      .attr('transform', 'translate(' + n.x + ',' + n.y + ')')
      .style('cursor', 'pointer')
      .on('click', () => showDetail(n));

    // Card background
    const isMe = n.isCurrentUser;
    const isDead = n.deceased;
    const fillColor = isDead ? '#F0F0F0' : '#FFFFFF';
    const strokeColor = isMe ? GOLD : (isDead ? GRAY : '#E8E5DE');
    const strokeW = isMe ? 2.5 : 1;

    card.append('rect')
      .attr('width', CARD_W).attr('height', CARD_H)
      .attr('rx', 10).attr('ry', 10)
      .attr('fill', fillColor)
      .attr('stroke', strokeColor)
      .attr('stroke-width', strokeW);

    // Initials circle
    const initials = ((n.firstName || n.name?.split(' ')[0] || '')[0] || '') +
                     ((n.lastName || n.name?.split(' ').slice(-1)[0] || '')[0] || '');
    const circleColor = isMe ? TEAL : (isDead ? GRAY : SAGE);
    card.append('circle')
      .attr('cx', 22).attr('cy', CARD_H / 2)
      .attr('r', 16)
      .attr('fill', circleColor);
    card.append('text')
      .attr('x', 22).attr('y', CARD_H / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(initials.toUpperCase());

    // Name
    const displayName = n.name || (n.firstName + ' ' + (n.lastName || '')).trim();
    const shortName = displayName.length > 14 ? displayName.substring(0, 13) + '…' : displayName;
    card.append('text')
      .attr('x', 44).attr('y', CARD_H / 2 - 4)
      .attr('fill', TEXT)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(shortName);

    // Relationship label
    const rel = isMe ? 'You' : (n.relationship || '');
    card.append('text')
      .attr('x', 44).attr('y', CARD_H / 2 + 10)
      .attr('fill', LIGHT)
      .attr('font-size', '9px')
      .text(rel);

    // "You" badge
    if (isMe) {
      card.append('rect')
        .attr('x', CARD_W - 32).attr('y', 4)
        .attr('width', 28).attr('height', 14)
        .attr('rx', 7)
        .attr('fill', TEAL);
      card.append('text')
        .attr('x', CARD_W - 18).attr('y', 13)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '8px')
        .attr('font-weight', '700')
        .text('YOU');
    }

    // Deceased cross
    if (isDead) {
      card.append('text')
        .attr('x', CARD_W - 14).attr('y', CARD_H - 6)
        .attr('fill', GRAY)
        .attr('font-size', '12px')
        .text('✝');
    }
  });

  // Fit view
  fitView();
}

function showDetail(node) {
  document.getElementById('dp-name').textContent = node.name || (node.firstName + ' ' + (node.lastName || ''));
  document.getElementById('dp-rel').textContent = node.isCurrentUser ? 'You' : (node.relationship || '');
  const statusEl = document.getElementById('dp-status');
  if (node.isCurrentUser) {
    statusEl.style.display = 'none';
  } else {
    statusEl.style.display = 'inline-block';
    if (node.isRegistered || node.status === 'registered') {
      statusEl.textContent = 'Joined';
      statusEl.style.background = '#e8f8f0';
      statusEl.style.color = '#27ae60';
    } else if (node.status === 'invited') {
      statusEl.textContent = 'Invited';
      statusEl.style.background = '#fdf3eb';
      statusEl.style.color = '#D4A574';
    } else {
      statusEl.textContent = 'Not Invited';
      statusEl.style.background = '#f0f0f0';
      statusEl.style.color = '#636E72';
    }
  }
  document.getElementById('detail-panel').style.display = 'block';
}

function closePanel() {
  document.getElementById('detail-panel').style.display = 'none';
}

function zoomIn() {
  svg.transition().duration(300).call(zoom.scaleBy, 1.4);
}
function zoomOut() {
  svg.transition().duration(300).call(zoom.scaleBy, 0.7);
}
function fitView() {
  const bounds = g.node().getBBox();
  if (!bounds.width || !bounds.height) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const pad = 60;
  const scale = Math.min((w - pad * 2) / bounds.width, (h - pad * 2) / bounds.height, 1.5);
  const tx = w / 2 - (bounds.x + bounds.width / 2) * scale;
  const ty = h / 2 - (bounds.y + bounds.height / 2) * scale;
  svg.transition().duration(500).call(
    zoom.transform,
    d3.zoomIdentity.translate(tx, ty).scale(scale)
  );
}

init();
</script>
</body></html>`;
}

export default function FamilyScreen() {
  const [members, setMembers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', relationship_to_user: '',
    email: '', birth_date: '', is_deceased: false, death_date: '',
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

  // Tree visualization state
  const [showTree, setShowTree] = useState(false);
  const [treeToken, setTreeToken] = useState('');

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
  // Tree visualization
  // ============================================================

  const openTree = async () => {
    const token = await getToken();
    if (!token) { Alert.alert('Error', 'You must be logged in.'); return; }
    setTreeToken(token);
    setShowTree(true);
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

  const openAddForm = () => { resetForm(); setShowAddForm(true); };

  const openEditForm = (member) => {
    const relValue = RELATIONSHIP_OPTIONS.find(
      o => o.value === (member.relationship || '').toLowerCase() ||
           o.label.toLowerCase() === (member.relationship || '').toLowerCase()
    )?.value || member.relationship?.toLowerCase() || '';

    setEditingMember(member);
    setFormData({
      first_name: member.first_name || '', last_name: member.last_name || '',
      relationship_to_user: relValue, email: member.email || '',
      birth_date: member.birth_date || '', is_deceased: member.is_deceased || false,
      death_date: member.death_date || '',
    });
    setTempBirthDate(parseDateString(member.birth_date) || new Date(1970, 0, 1));
    setTempDeathDate(parseDateString(member.death_date) || new Date());
    setShowDetail(false);
    setShowAddForm(true);
  };

  const closeAddForm = () => { setShowAddForm(false); resetForm(); };

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
    if (!formData.first_name.trim()) { Alert.alert('Required', 'First name is required.'); return; }
    if (!formData.relationship_to_user) { Alert.alert('Required', 'Please select a relationship.'); return; }
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.'); return;
    }
    setSaving(true);
    const token = await getToken();
    if (!token) { Alert.alert('Error', 'You must be logged in.'); setSaving(false); return; }
    const payload = {
      first_name: formData.first_name.trim(), last_name: formData.last_name.trim(),
      relationship: formData.relationship_to_user,
    };
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.birth_date) payload.birth_date = formData.birth_date;
    if (formData.is_deceased) {
      payload.is_deceased = 1;
      if (formData.death_date) payload.death_date = formData.death_date;
    } else { payload.is_deceased = 0; payload.death_date = ''; }

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

  const openDetail = (member) => { setSelectedMember(member); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelectedMember(null); };

  const handleDelete = (member) => {
    Alert.alert(
      'Remove Family Member',
      `Are you sure you want to remove ${member.first_name} ${member.last_name} from your family tree? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          const token = await getToken();
          if (!token) return;
          const result = await removeFamilyMember(token, member.id);
          if (result.data && result.data.success) {
            Alert.alert('Removed', result.data.message);
            closeDetail(); loadMembers(false);
          } else {
            Alert.alert('Error', result.error || result.data?.message || 'Could not remove member.');
          }
        }},
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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Family Tree</Text>
          <Text style={styles.headerSubtitle}>
            {meta ? `${meta.total_members} member${meta.total_members !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>

        <TouchableOpacity style={styles.viewTreeBtn} activeOpacity={0.7} onPress={openTree}>
          <Text style={styles.viewTreeText}>🌳  View Family Tree</Text>
        </TouchableOpacity>

        {meta && !meta.is_premium && (
          <View style={styles.tierBar}>
            <Text style={styles.tierText}>{meta.addable_count} of {meta.max_free} members used</Text>
            <View style={styles.tierProgress}>
              <View style={[styles.tierFill, { width: `${Math.min((meta.addable_count / meta.max_free) * 100, 100)}%` }]} />
            </View>
          </View>
        )}

        {nonSelfMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌳</Text>
            <Text style={styles.emptyTitle}>Start your family tree</Text>
            <Text style={styles.emptyDesc}>Add family members to build a living tree that grows as your family joins.</Text>
            <TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={openAddForm}>
              <Text style={styles.addBtnText}>+ Add Family Member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {nonSelfMembers.map((member) => {
              const badge = getStatusBadge(member.status);
              return (
                <TouchableOpacity key={member.id} style={styles.card} activeOpacity={0.7} onPress={() => openDetail(member)}>
                  {member.photo ? (
                    <Image source={{ uri: member.photo }} style={styles.photo} />
                  ) : (
                    <View style={styles.initialsCircle}>
                      <Text style={styles.initialsText}>{getInitials(member.first_name, member.last_name)}</Text>
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
          TREE VISUALIZATION MODAL
          ============================================================ */}
      <Modal visible={showTree} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
          <View style={styles.treeHeader}>
            <TouchableOpacity onPress={() => setShowTree(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.treeHeaderBack}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.treeHeaderTitle}>Family Tree</Text>
            <View style={{ width: 50 }} />
          </View>
          {treeToken ? (
            <WebView
              source={{ html: buildTreeHTML(treeToken) }}
              style={{ flex: 1, backgroundColor: '#FAF8F5' }}
              originWhitelist={['*']}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color="#2C5F7B" />
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>

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
              <View style={styles.detailProfileSection}>
                {selectedMember.photo ? (
                  <Image source={{ uri: selectedMember.photo }} style={styles.detailPhoto} />
                ) : (
                  <View style={styles.detailInitialsCircle}>
                    <Text style={styles.detailInitialsText}>{getInitials(selectedMember.first_name, selectedMember.last_name)}</Text>
                  </View>
                )}
                <Text style={styles.detailName}>{selectedMember.first_name} {selectedMember.last_name}</Text>
                <Text style={styles.detailRelationship}>{selectedMember.relationship}</Text>
                {(() => {
                  const badge = getStatusBadge(selectedMember.status);
                  return (
                    <View style={[styles.detailBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.detailBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                  );
                })()}
                {selectedMember.is_deceased && <Text style={styles.detailDeceased}>✝ Memorial</Text>}
              </View>
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
              <View style={styles.detailActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(selectedMember)} activeOpacity={0.7}>
                  <Text style={styles.actionBtnText}>✏️  Edit Details</Text>
                </TouchableOpacity>
                {selectedMember.email && selectedMember.status !== 'registered' && (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGold]} onPress={() => handleInvite(selectedMember)} disabled={inviting} activeOpacity={0.7}>
                    <Text style={styles.actionBtnGoldText}>
                      {inviting ? 'Sending...' : selectedMember.invitation_sent ? '📧  Resend Invitation' : '📧  Send Invitation'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(selectedMember)} activeOpacity={0.7}>
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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeAddForm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>First Name *</Text>
              <TextInput style={styles.textInput} placeholder="First name" placeholderTextColor="#B2BEC3"
                value={formData.first_name} onChangeText={(val) => setFormData(prev => ({ ...prev, first_name: val }))}
                autoCapitalize="words" returnKeyType="next" />

              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput style={styles.textInput} placeholder="Last name" placeholderTextColor="#B2BEC3"
                value={formData.last_name} onChangeText={(val) => setFormData(prev => ({ ...prev, last_name: val }))}
                autoCapitalize="words" returnKeyType="next" />

              <Text style={styles.fieldLabel}>Relationship *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowRelPicker(true)} activeOpacity={0.7}>
                <Text style={[styles.pickerBtnText, !formData.relationship_to_user && { color: '#B2BEC3' }]}>
                  {getRelationshipLabel(formData.relationship_to_user)}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Email (optional)</Text>
              <Text style={styles.fieldHint}>Add email to send an invitation to join</Text>
              <TextInput style={styles.textInput} placeholder="email@example.com" placeholderTextColor="#B2BEC3"
                value={formData.email} onChangeText={(val) => setFormData(prev => ({ ...prev, email: val }))}
                keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />

              <Text style={styles.fieldLabel}>Birth Date (optional)</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowBirthPicker(true)} activeOpacity={0.7}>
                <Text style={[styles.pickerBtnText, !formData.birth_date && { color: '#B2BEC3' }]}>
                  {formData.birth_date ? formatDateForDisplay(formData.birth_date) : 'Select date...'}
                </Text>
                <Text style={styles.pickerArrow}>📅</Text>
              </TouchableOpacity>
              {showBirthPicker && Platform.OS === 'ios' && (
                <View style={styles.datePickerContainer}>
                  <DateTimePicker value={tempBirthDate} mode="date" display="spinner" onChange={onBirthDateChange}
                    maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} style={{ height: 150 }} />
                  <View style={styles.datePickerActions}>
                    <TouchableOpacity onPress={clearBirthDate} style={styles.datePickerClear}><Text style={styles.datePickerClearText}>Clear</Text></TouchableOpacity>
                    <TouchableOpacity onPress={confirmBirthDate} style={styles.datePickerConfirm}><Text style={styles.datePickerConfirmText}>Done</Text></TouchableOpacity>
                  </View>
                </View>
              )}
              {showBirthPicker && Platform.OS === 'android' && (
                <DateTimePicker value={tempBirthDate} mode="date" display="default" onChange={onBirthDateChange}
                  maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} />
              )}

              <TouchableOpacity style={styles.toggleRow}
                onPress={() => setFormData(prev => ({ ...prev, is_deceased: !prev.is_deceased, death_date: '' }))} activeOpacity={0.7}>
                <View style={[styles.toggleBox, formData.is_deceased && styles.toggleBoxOn]}>
                  {formData.is_deceased && <Text style={styles.toggleCheck}>✓</Text>}
                </View>
                <Text style={styles.toggleLabel}>This person is deceased</Text>
              </TouchableOpacity>

              {formData.is_deceased && (
                <>
                  <Text style={styles.fieldLabel}>Death Date (optional)</Text>
                  <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDeathPicker(true)} activeOpacity={0.7}>
                    <Text style={[styles.pickerBtnText, !formData.death_date && { color: '#B2BEC3' }]}>
                      {formData.death_date ? formatDateForDisplay(formData.death_date) : 'Select date...'}
                    </Text>
                    <Text style={styles.pickerArrow}>📅</Text>
                  </TouchableOpacity>
                  {showDeathPicker && Platform.OS === 'ios' && (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker value={tempDeathDate} mode="date" display="spinner" onChange={onDeathDateChange}
                        maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} style={{ height: 150 }} />
                      <View style={styles.datePickerActions}>
                        <TouchableOpacity onPress={clearDeathDate} style={styles.datePickerClear}><Text style={styles.datePickerClearText}>Clear</Text></TouchableOpacity>
                        <TouchableOpacity onPress={confirmDeathDate} style={styles.datePickerConfirm}><Text style={styles.datePickerConfirmText}>Done</Text></TouchableOpacity>
                      </View>
                    </View>
                  )}
                  {showDeathPicker && Platform.OS === 'android' && (
                    <DateTimePicker value={tempDeathDate} mode="date" display="default" onChange={onDeathDateChange}
                      maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} />
                  )}
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        <Modal visible={showRelPicker} animationType="fade" transparent>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowRelPicker(false)}>
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerSheetTitle}>Select Relationship</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {RELATIONSHIP_OPTIONS.filter(o => o.value !== '').map((opt) => (
                  <TouchableOpacity key={opt.value}
                    style={[styles.pickerOption, formData.relationship_to_user === opt.value && styles.pickerOptionSelected]}
                    onPress={() => { setFormData(prev => ({ ...prev, relationship_to_user: opt.value })); setShowRelPicker(false); }}
                    activeOpacity={0.7}>
                    <Text style={[styles.pickerOptionText, formData.relationship_to_user === opt.value && styles.pickerOptionTextSelected]}>{opt.label}</Text>
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

  // Tree visualization
  treeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: '#2C5F7B',
  },
  treeHeaderBack: { color: '#FFF', fontSize: 15 },
  treeHeaderTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5',
  },

  // Modal shared
  modalContainer: { flex: 1, backgroundColor: '#FAF8F5' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: '#2C5F7B',
  },
  modalCancel: { color: '#FFF', fontSize: 15 },
  modalTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  modalSave: { color: '#D4A574', fontSize: 15, fontWeight: '700' },
  formScroll: { flex: 1, padding: 16 },

  // Detail
  detailProfileSection: { alignItems: 'center', paddingVertical: 24 },
  detailPhoto: { width: 90, height: 90, borderRadius: 45, marginBottom: 12 },
  detailInitialsCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#2C5F7B', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  detailInitialsText: { color: '#FFF', fontSize: 32, fontWeight: '700' },
  detailName: { fontSize: 22, fontWeight: '700', color: '#2D3436' },
  detailRelationship: { fontSize: 15, color: '#636E72', marginTop: 4 },
  detailBadge: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14 },
  detailBadgeText: { fontSize: 13, fontWeight: '600' },
  detailDeceased: { fontSize: 13, color: '#9A9A9A', marginTop: 6 },
  detailCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#E8E5DE' },
  detailLabel: { fontSize: 14, color: '#636E72' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#2D3436', textAlign: 'right', flex: 1, marginLeft: 16 },
  detailActions: { gap: 10 },
  actionBtn: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E8E5DE' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#2C5F7B' },
  actionBtnGold: { backgroundColor: '#FDF3EB', borderColor: '#D4A574' },
  actionBtnGoldText: { fontSize: 15, fontWeight: '600', color: '#D4A574' },
  actionBtnDanger: { backgroundColor: '#FFF5F5', borderColor: '#E74C3C' },
  actionBtnDangerText: { fontSize: 15, fontWeight: '600', color: '#E74C3C' },

  // Form
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#2D3436', marginTop: 16, marginBottom: 6 },
  fieldHint: { fontSize: 12, color: '#636E72', marginBottom: 6, marginTop: -2 },
  textInput: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, fontSize: 15, color: '#2D3436', borderWidth: 1, borderColor: '#E8E5DE' },
  pickerBtn: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E8E5DE', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerBtnText: { fontSize: 15, color: '#2D3436' },
  pickerArrow: { fontSize: 12, color: '#636E72' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingBottom: 40, paddingHorizontal: 16 },
  pickerSheetTitle: { fontSize: 18, fontWeight: '700', color: '#2D3436', textAlign: 'center', marginBottom: 16 },
  pickerOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: '#E8E5DE' },
  pickerOptionSelected: { backgroundColor: '#F0F7FB' },
  pickerOptionText: { fontSize: 16, color: '#2D3436' },
  pickerOptionTextSelected: { color: '#2C5F7B', fontWeight: '600' },
  pickerCheck: { fontSize: 16, color: '#2C5F7B', fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 4 },
  toggleBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#D0D0D0', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  toggleBoxOn: { backgroundColor: '#2C5F7B', borderColor: '#2C5F7B' },
  toggleCheck: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  toggleLabel: { fontSize: 14, color: '#2D3436' },
  datePickerContainer: { backgroundColor: '#FFF', borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#E8E5DE', overflow: 'hidden' },
  datePickerActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#E8E5DE', padding: 10 },
  datePickerClear: { paddingVertical: 6, paddingHorizontal: 16 },
  datePickerClearText: { color: '#636E72', fontSize: 15 },
  datePickerConfirm: { paddingVertical: 6, paddingHorizontal: 16, backgroundColor: '#2C5F7B', borderRadius: 8 },
  datePickerConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});