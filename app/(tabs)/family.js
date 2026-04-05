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
// Family Tree HTML for WebView — v5 clean rebuild
// ============================================================
function buildTreeHTML(token) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"><\/script>
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
  #detail-panel { display: none; position: absolute; bottom: 0; left: 0; right: 0;
    background: #fff; border-top-left-radius: 16px; border-top-right-radius: 16px;
    padding: 16px 20px 30px; box-shadow: 0 -4px 20px rgba(0,0,0,0.1); z-index: 10; }
  #detail-panel .dp-name { font-size: 18px; font-weight: 700; color: #2D3436; }
  #detail-panel .dp-rel { font-size: 13px; color: #636E72; margin-top: 2px; }
  #detail-panel .dp-status { display: inline-block; font-size: 11px; font-weight: 600;
    padding: 3px 10px; border-radius: 10px; margin-top: 6px; }
  #detail-panel .dp-close { position: absolute; top: 12px; right: 16px; font-size: 20px;
    color: #636E72; cursor: pointer; padding: 4px; }
  #zoom-controls { position: absolute; bottom: 16px; right: 16px; display: flex;
    flex-direction: column; gap: 6px; z-index: 5; }
  .zoom-btn { width: 40px; height: 40px; border-radius: 10px; background: #fff;
    border: 1px solid #E8E5DE; display: flex; align-items: center; justify-content: center;
    font-size: 20px; color: #2C5F7B; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
  .gen-label { font-size: 10px; fill: #B0ADA8; font-weight: 600; text-transform: uppercase;
    letter-spacing: 1.5px; }
</style>
</head><body>
<div id="tree-container"><svg id="tree-svg"></svg></div>
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
  <div class="zoom-btn" onclick="zoomOut()">\u2212</div>
  <div class="zoom-btn" onclick="fitView()" style="font-size:14px;">\u27F2</div>
</div>

<script>
var TOKEN = '${token}';
var API = '${API_BASE}/family/tree';

var TEAL = '#2C5F7B', GOLD = '#D4A574', SAGE = '#8FA99A';
var TEXT = '#2D3436', LIGHT = '#636E72', GRAY = '#9A9A9A';
var CARD_W = 140, CARD_H = 60;
var H_GAP = 40, COUPLE_GAP = 14, V_GAP = 100;

var svg, g, zoom;

async function init() {
  try {
    var resp = await fetch(API, { headers: { 'Authorization': 'Bearer ' + TOKEN } });
    var data = await resp.json();
    document.getElementById('loading').style.display = 'none';
    if (!data.success || !data.nodes || data.nodes.length === 0) {
      document.getElementById('empty').style.display = 'block';
      return;
    }
    buildTree(data.nodes, data.selfMemberId);
  } catch(e) {
    document.getElementById('loading').innerHTML = '<p style="color:#E74C3C;">Could not load tree data.</p>';
  }
}

function buildTree(nodes, selfId) {
  var W = window.innerWidth, H = window.innerHeight;
  svg = d3.select('#tree-svg').attr('width', W).attr('height', H);
  zoom = d3.zoom().scaleExtent([0.15, 3])
    .on('zoom', function(e) { g.attr('transform', e.transform); });
  svg.call(zoom);
  g = svg.append('g');

  // ================================================================
  // 1. NODE MAP
  // ================================================================
  var nm = {};
  nodes.forEach(function(n) { nm[n.id] = Object.assign({}, n, { gen: null, x: 0, y: 0 }); });
  var rootId = selfId;
  if (!nm[rootId]) rootId = nodes[0].id;

  // ================================================================
  // 2. ADJACENCY: parent->children from fid/mid
  // ================================================================
  var p2c = {}; // parentId -> [childId]
  Object.keys(nm).forEach(function(nid) {
    var n = nm[nid];
    [n.fid, n.mid].forEach(function(pid) {
      if (pid && nm[pid]) {
        if (!p2c[pid]) p2c[pid] = [];
        if (p2c[pid].indexOf(nid) === -1) p2c[pid].push(nid);
      }
    });
  });

  // ================================================================
  // 3. SPOUSE PAIRING
  // ================================================================
  var spouseOf = {};
  Object.keys(nm).forEach(function(nid) {
    var pids = nm[nid].pids || [];
    pids.forEach(function(p) {
      if (nm[p] && !spouseOf[nid] && !spouseOf[p]) {
        spouseOf[nid] = p;
        spouseOf[p] = nid;
      }
    });
  });

  // ================================================================
  // 4. BFS GENERATION ASSIGNMENT
  // ================================================================
  var queue = [rootId];
  nm[rootId].gen = 0;
  var vis = {}; vis[rootId] = true;
  while (queue.length > 0) {
    var cid = queue.shift();
    var cn = nm[cid]; if (!cn) continue;
    var cg = cn.gen;
    // Spouse
    if (spouseOf[cid] && !vis[spouseOf[cid]] && nm[spouseOf[cid]]) {
      nm[spouseOf[cid]].gen = cg; vis[spouseOf[cid]] = true; queue.push(spouseOf[cid]);
    }
    // Children
    (p2c[cid] || []).forEach(function(k) {
      if (!vis[k] && nm[k]) { nm[k].gen = cg + 1; vis[k] = true; queue.push(k); }
    });
    // Parents
    [cn.fid, cn.mid].forEach(function(pid) {
      if (pid && nm[pid] && !vis[pid]) { nm[pid].gen = cg - 1; vis[pid] = true; queue.push(pid); }
    });
  }
  Object.keys(nm).forEach(function(nid) { if (!vis[nid]) nm[nid].gen = 0; });

  // ================================================================
  // 5. BUILD COUPLES — place spouses adjacent, treat as one block
  //    A "slot" is either a couple [id1, id2] or a single [id]
  // ================================================================
  var usedInCouple = {};
  var couples = []; // { ids:[], gen:N }
  Object.keys(spouseOf).forEach(function(a) {
    var b = spouseOf[a];
    if (usedInCouple[a] || usedInCouple[b]) return;
    if (!nm[a] || !nm[b]) return;
    usedInCouple[a] = true; usedInCouple[b] = true;
    couples.push({ ids: [a, b], gen: nm[a].gen });
  });

  // Build slots per generation
  var genSlots = {}; // gen -> [ {ids:[], slotWidth:N} ]
  couples.forEach(function(c) {
    if (!genSlots[c.gen]) genSlots[c.gen] = [];
    genSlots[c.gen].push({ ids: c.ids, slotWidth: CARD_W * 2 + COUPLE_GAP });
  });
  // Add singles (not in any couple)
  Object.keys(nm).forEach(function(nid) {
    if (usedInCouple[nid]) return;
    var gen = nm[nid].gen != null ? nm[nid].gen : 0;
    if (!genSlots[gen]) genSlots[gen] = [];
    genSlots[gen].push({ ids: [nid], slotWidth: CARD_W });
  });

  // Build lookup: nodeId -> slot index within its generation
  var nodeToSlot = {}; // nid -> { gen, idx }
  Object.keys(genSlots).forEach(function(gen) {
    genSlots[gen].forEach(function(slot, idx) {
      slot.ids.forEach(function(id) { nodeToSlot[id] = { gen: parseInt(gen), idx: idx }; });
    });
  });

  // ================================================================
  // 6. LAYOUT: Position slots per generation
  //    Strategy: 
  //    a) Start with the "You" generation — lay out left to right
  //    b) For each parent generation above, position each slot
  //       centered above the midpoint of its children slots
  //    c) Resolve overlaps by pushing slots apart
  //    d) For each child generation below, center children under parents
  // ================================================================
  var gens = Object.keys(genSlots).map(Number).sort(function(a, b) { return a - b; });
  var minGen = gens[0] || 0;
  var youGen = 0; // root is gen 0

  // slotX[gen][idx] = centerX of that slot
  var slotX = {};
  gens.forEach(function(gen) { slotX[gen] = []; });

  // Helper: get the slot index for a node
  function slotOf(nid) { return nodeToSlot[nid]; }

  // Helper: which slots in parentGen are parents of slots in childGen?
  // Returns array of { parentSlotIdx, childSlotIdxs[] }
  function getParentChildSlotLinks(parentGen, childGen) {
    var childSlots = genSlots[childGen] || [];
    var parentSlots = genSlots[parentGen] || [];
    var links = {}; // parentSlotIdx -> Set of childSlotIdx
    childSlots.forEach(function(cslot, ci) {
      cslot.ids.forEach(function(cid) {
        var n = nm[cid];
        [n.fid, n.mid].forEach(function(pid) {
          if (!pid || !nm[pid]) return;
          var ps = nodeToSlot[pid];
          if (!ps || ps.gen !== parentGen) return;
          if (!links[ps.idx]) links[ps.idx] = {};
          links[ps.idx][ci] = true;
        });
      });
    });
    var result = [];
    Object.keys(links).forEach(function(pi) {
      result.push({ parentIdx: parseInt(pi), childIdxs: Object.keys(links[pi]).map(Number) });
    });
    return result;
  }

  // a) Lay out the YOU generation first
  function layoutRow(gen) {
    var slots = genSlots[gen] || [];
    var totalW = 0;
    slots.forEach(function(s, i) { totalW += s.slotWidth; if (i < slots.length - 1) totalW += H_GAP; });
    var cx = -totalW / 2;
    slots.forEach(function(s, i) {
      slotX[gen][i] = cx + s.slotWidth / 2;
      cx += s.slotWidth + H_GAP;
    });
  }

  layoutRow(youGen);

  // b) Work UPWARD from youGen: position parent slots above children
  for (var gi = gens.indexOf(youGen) - 1; gi >= 0; gi--) {
    var parentGen = gens[gi];
    var childGen = gens[gi + 1];
    var parentSlots = genSlots[parentGen] || [];
    var links = getParentChildSlotLinks(parentGen, childGen);

    // First, position linked parents centered above their children
    var positioned = {};
    links.forEach(function(link) {
      var childXs = link.childIdxs.map(function(ci) { return slotX[childGen][ci]; });
      var avg = childXs.reduce(function(a, b) { return a + b; }, 0) / childXs.length;
      slotX[parentGen][link.parentIdx] = avg;
      positioned[link.parentIdx] = true;
    });

    // Position unlinked parent slots (no children below) to the right
    var maxX = -Infinity;
    Object.keys(positioned).forEach(function(pi) {
      var s = parentSlots[parseInt(pi)];
      var right = slotX[parentGen][parseInt(pi)] + s.slotWidth / 2;
      if (right > maxX) maxX = right;
    });
    if (maxX === -Infinity) {
      // No positioned slots — just lay out evenly
      layoutRow(parentGen);
    } else {
      parentSlots.forEach(function(s, i) {
        if (positioned[i]) return;
        slotX[parentGen][i] = maxX + H_GAP + s.slotWidth / 2;
        maxX = slotX[parentGen][i] + s.slotWidth / 2;
      });
    }

    // Resolve overlaps
    resolveOverlaps(parentGen);
  }

  // c) Work DOWNWARD from youGen: position child slots under parents
  for (var gi2 = gens.indexOf(youGen) + 1; gi2 < gens.length; gi2++) {
    var childGen2 = gens[gi2];
    var parentGen2 = gens[gi2 - 1];
    var childSlots2 = genSlots[childGen2] || [];
    var links2 = getParentChildSlotLinks(parentGen2, childGen2);

    var positioned2 = {};
    links2.forEach(function(link) {
      var parentX = slotX[parentGen2][link.parentIdx];
      // Center children under this parent
      var totalW = 0;
      link.childIdxs.forEach(function(ci, i) {
        totalW += childSlots2[ci].slotWidth;
        if (i < link.childIdxs.length - 1) totalW += H_GAP;
      });
      var cx = parentX - totalW / 2;
      link.childIdxs.forEach(function(ci) {
        slotX[childGen2][ci] = cx + childSlots2[ci].slotWidth / 2;
        cx += childSlots2[ci].slotWidth + H_GAP;
        positioned2[ci] = true;
      });
    });

    // Unlinked children
    var maxX2 = -Infinity;
    childSlots2.forEach(function(s, i) {
      if (slotX[childGen2][i] !== undefined) {
        var r = slotX[childGen2][i] + s.slotWidth / 2;
        if (r > maxX2) maxX2 = r;
      }
    });
    childSlots2.forEach(function(s, i) {
      if (positioned2[i]) return;
      if (maxX2 === -Infinity) { layoutRow(childGen2); return; }
      slotX[childGen2][i] = maxX2 + H_GAP + s.slotWidth / 2;
      maxX2 = slotX[childGen2][i] + s.slotWidth / 2;
    });

    resolveOverlaps(childGen2);
  }

  function resolveOverlaps(gen) {
    var slots = genSlots[gen] || [];
    if (slots.length < 2) return;
    // Sort by x
    var indices = [];
    for (var i = 0; i < slots.length; i++) indices.push(i);
    indices.sort(function(a, b) { return slotX[gen][a] - slotX[gen][b]; });
    // Push apart
    for (var i = 1; i < indices.length; i++) {
      var prev = indices[i - 1], curr = indices[i];
      var prevRight = slotX[gen][prev] + slots[prev].slotWidth / 2;
      var currLeft = slotX[gen][curr] - slots[curr].slotWidth / 2;
      if (currLeft < prevRight + H_GAP) {
        slotX[gen][curr] = prevRight + H_GAP + slots[curr].slotWidth / 2;
      }
    }
  }

  // ================================================================
  // 7. ASSIGN x/y TO EACH NODE
  // ================================================================
  Object.keys(genSlots).forEach(function(gen) {
    var gn = parseInt(gen);
    var y = (gn - minGen) * (CARD_H + V_GAP);
    genSlots[gen].forEach(function(slot, idx) {
      var cx = slotX[gen][idx];
      if (slot.ids.length === 2) {
        nm[slot.ids[0]].x = cx - CARD_W / 2 - COUPLE_GAP / 2;
        nm[slot.ids[0]].y = y;
        nm[slot.ids[1]].x = cx + COUPLE_GAP / 2;
        nm[slot.ids[1]].y = y;
      } else {
        nm[slot.ids[0]].x = cx - CARD_W / 2;
        nm[slot.ids[0]].y = y;
      }
    });
  });

  // ================================================================
  // 8. DRAW CONNECTIONS
  // ================================================================
  // 8a: Spouse connectors
  Object.keys(spouseOf).forEach(function(a) {
    var b = spouseOf[a];
    if (a > b) return; // draw once
    if (!nm[a] || !nm[b]) return;
    var left = nm[a].x < nm[b].x ? nm[a] : nm[b];
    var right = nm[a].x < nm[b].x ? nm[b] : nm[a];
    var y = left.y + CARD_H / 2;
    g.append('line').attr('x1', left.x + CARD_W).attr('y1', y)
      .attr('x2', right.x).attr('y2', y)
      .attr('stroke', GOLD).attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3').attr('opacity', 0.7);
    g.append('text').attr('x', (left.x + CARD_W + right.x) / 2).attr('y', y + 4)
      .attr('text-anchor', 'middle').attr('font-size', '10px').text('\u2665').attr('fill', GOLD);
  });

  // 8b: Parent-child connectors
  // For each node that has fid or mid, find the parent's slot center
  // and draw a bracket connector from parent slot to child slot
  var drawnBrackets = {}; // "parentSlotGen_parentSlotIdx -> childSlotGen_childSlotIdx"

  Object.keys(nm).forEach(function(nid) {
    var n = nm[nid];
    [n.fid, n.mid].forEach(function(pid) {
      if (!pid || !nm[pid]) return;
      var ps = nodeToSlot[pid];
      var cs = nodeToSlot[nid];
      if (!ps || !cs) return;
      var key = ps.gen + '_' + ps.idx + '->' + cs.gen + '_' + cs.idx;
      if (drawnBrackets[key]) return;
      drawnBrackets[key] = true;

      var parentCX = slotX[ps.gen][ps.idx];
      var childCX = slotX[cs.gen][cs.idx];
      var parentBottomY = (ps.gen - minGen) * (CARD_H + V_GAP) + CARD_H;
      var childTopY = (cs.gen - minGen) * (CARD_H + V_GAP);
      var midY = parentBottomY + (childTopY - parentBottomY) / 2;

      // Line from parent down to midY
      g.append('line').attr('x1', parentCX).attr('y1', parentBottomY)
        .attr('x2', parentCX).attr('y2', midY)
        .attr('stroke', GOLD).attr('stroke-width', 1.5).attr('opacity', 0.5);
      // Horizontal to child
      if (Math.abs(parentCX - childCX) > 2) {
        g.append('line').attr('x1', parentCX).attr('y1', midY)
          .attr('x2', childCX).attr('y2', midY)
          .attr('stroke', GOLD).attr('stroke-width', 1.5).attr('opacity', 0.5);
      }
      // Line from midY down to child
      g.append('line').attr('x1', childCX).attr('y1', midY)
        .attr('x2', childCX).attr('y2', childTopY)
        .attr('stroke', GOLD).attr('stroke-width', 1.5).attr('opacity', 0.5);
    });
  });

  // ================================================================
  // 9. GENERATION LABELS
  // ================================================================
  gens.forEach(function(gen) {
    var label;
    if (gen === 0) label = 'You';
    else if (gen === -1) label = 'Parents';
    else if (gen === -2) label = 'Grandparents';
    else if (gen === -3) label = 'Great-Grandparents';
    else if (gen === 1) label = 'Children';
    else if (gen === 2) label = 'Grandchildren';
    else label = 'Gen ' + (gen > 0 ? '+' : '') + gen;

    var leftMost = Infinity;
    Object.values(nm).forEach(function(n) { if (n.gen === gen && n.x < leftMost) leftMost = n.x; });
    var y = (gen - minGen) * (CARD_H + V_GAP) + CARD_H / 2;
    g.append('text').attr('x', leftMost - 20).attr('y', y + 4)
      .attr('text-anchor', 'end').attr('class', 'gen-label').text(label);
  });

  // ================================================================
  // 10. DRAW CARDS
  // ================================================================
  Object.values(nm).forEach(function(n) {
    var card = g.append('g')
      .attr('transform', 'translate(' + n.x + ',' + n.y + ')')
      .style('cursor', 'pointer')
      .on('click', function() { showDetail(n); });

    var isMe = n.isCurrentUser, isDead = n.deceased;
    card.append('rect').attr('width', CARD_W).attr('height', CARD_H)
      .attr('rx', 10).attr('ry', 10)
      .attr('fill', isDead ? '#F0F0F0' : '#FFF')
      .attr('stroke', isMe ? GOLD : (isDead ? GRAY : '#E8E5DE'))
      .attr('stroke-width', isMe ? 2.5 : 1);

    // Status stripe
    var sc = isMe ? TEAL : (n.isRegistered || n.status === 'registered' ? TEAL : (n.status === 'invited' ? GOLD : SAGE));
    card.append('rect').attr('x', 4).attr('y', 0).attr('width', CARD_W - 8).attr('height', 3)
      .attr('rx', 1.5).attr('fill', sc).attr('opacity', 0.7);

    // Initials
    var fn = n.firstName || (n.name ? n.name.split(' ')[0] : '') || '';
    var ln = n.lastName || (n.name ? n.name.split(' ').slice(-1)[0] : '') || '';
    var ini = (fn[0] || '') + (ln[0] || '');
    card.append('circle').attr('cx', 22).attr('cy', CARD_H / 2).attr('r', 16)
      .attr('fill', isMe ? TEAL : (isDead ? GRAY : SAGE));
    card.append('text').attr('x', 22).attr('y', CARD_H / 2 + 4)
      .attr('text-anchor', 'middle').attr('fill', '#fff')
      .attr('font-size', '10px').attr('font-weight', '600').text(ini.toUpperCase());

    // Name
    var dn = n.name || ((fn + ' ' + ln).trim());
    var sn = dn.length > 14 ? dn.substring(0, 13) + '\u2026' : dn;
    card.append('text').attr('x', 44).attr('y', CARD_H / 2 - 4)
      .attr('fill', isDead ? GOLD : TEXT).attr('font-size', '11px').attr('font-weight', '600').text(sn);

    // Relationship
    card.append('text').attr('x', 44).attr('y', CARD_H / 2 + 10)
      .attr('fill', LIGHT).attr('font-size', '9px').text(isMe ? 'You' : (n.relationship || ''));

    // YOU badge
    if (isMe) {
      card.append('rect').attr('x', CARD_W - 32).attr('y', 4).attr('width', 28).attr('height', 14)
        .attr('rx', 7).attr('fill', TEAL);
      card.append('text').attr('x', CARD_W - 18).attr('y', 13).attr('text-anchor', 'middle')
        .attr('fill', '#fff').attr('font-size', '8px').attr('font-weight', '700').text('YOU');
    }
    if (isDead) {
      card.append('text').attr('x', CARD_W - 14).attr('y', CARD_H - 6)
        .attr('fill', GRAY).attr('font-size', '12px').text('\u271D');
    }
  });

  fitView();
}

function showDetail(node) {
  document.getElementById('dp-name').textContent = node.name || ((node.firstName || '') + ' ' + (node.lastName || ''));
  document.getElementById('dp-rel').textContent = node.isCurrentUser ? 'You' : (node.relationship || '');
  var el = document.getElementById('dp-status');
  if (node.isCurrentUser) { el.style.display = 'none'; }
  else {
    el.style.display = 'inline-block';
    if (node.isRegistered || node.status === 'registered') { el.textContent = 'Joined'; el.style.background = '#e8f8f0'; el.style.color = '#27ae60'; }
    else if (node.status === 'invited') { el.textContent = 'Invited'; el.style.background = '#fdf3eb'; el.style.color = '#D4A574'; }
    else { el.textContent = 'Not Invited'; el.style.background = '#f0f0f0'; el.style.color = '#636E72'; }
  }
  document.getElementById('detail-panel').style.display = 'block';
}
function closePanel() { document.getElementById('detail-panel').style.display = 'none'; }
function zoomIn() { svg.transition().duration(300).call(zoom.scaleBy, 1.4); }
function zoomOut() { svg.transition().duration(300).call(zoom.scaleBy, 0.7); }
function fitView() {
  var b = g.node().getBBox();
  if (!b.width || !b.height) return;
  var w = window.innerWidth, h = window.innerHeight, p = 60;
  var s = Math.min((w - p * 2) / b.width, (h - p * 2) / b.height, 1.5);
  svg.transition().duration(500).call(zoom.transform,
    d3.zoomIdentity.translate(w / 2 - (b.x + b.width / 2) * s, h / 2 - (b.y + b.height / 2) * s).scale(s));
}
init();
<\/script>
</body></html>`;
}

// ============================================================
// REACT NATIVE COMPONENT
// ============================================================

export default function FamilyScreen() {
  const [members, setMembers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showRelPicker, setShowRelPicker] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', relationship_to_user: '', email: '', birth_date: '', is_deceased: false, death_date: '' });
  const [showBirthPicker, setShowBirthPicker] = useState(false);
  const [showDeathPicker, setShowDeathPicker] = useState(false);
  const [tempBirthDate, setTempBirthDate] = useState(new Date(1970, 0, 1));
  const [tempDeathDate, setTempDeathDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [treeToken, setTreeToken] = useState('');

  const loadMembers = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    const result = await getFamilyMembers(token);
    if (result.data && result.data.success) { setMembers(result.data.members); setMeta(result.data.meta); }
    setLoading(false); setRefreshing(false);
  };
  useFocusEffect(useCallback(() => { loadMembers(); }, []));
  const onRefresh = () => { setRefreshing(true); loadMembers(false); };
  const openTree = async () => {
    const token = await getToken();
    if (!token) { Alert.alert('Error', 'You must be logged in.'); return; }
    setTreeToken(token); setShowTree(true);
  };

  const formatDateToString = (date) => { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; };
  const formatDateForDisplay = (dateStr) => { if (!dateStr) return ''; const parts = dateStr.split('-'); if (parts.length < 3) return dateStr; const months = ['January','February','March','April','May','June','July','August','September','October','November','December']; return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, ${parts[0]}`; };
  const parseDateString = (dateStr) => { if (!dateStr) return null; const [y, m, d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d); };

  const resetForm = () => { setFormData({ first_name: '', last_name: '', relationship_to_user: '', email: '', birth_date: '', is_deceased: false, death_date: '' }); setTempBirthDate(new Date(1970, 0, 1)); setTempDeathDate(new Date()); setEditingMember(null); };
  const openAddForm = () => { resetForm(); setShowAddForm(true); };
  const openEditForm = (member) => {
    const relValue = RELATIONSHIP_OPTIONS.find(o => o.value === (member.relationship || '').toLowerCase() || o.label.toLowerCase() === (member.relationship || '').toLowerCase())?.value || member.relationship?.toLowerCase() || '';
    setEditingMember(member);
    setFormData({ first_name: member.first_name || '', last_name: member.last_name || '', relationship_to_user: relValue, email: member.email || '', birth_date: member.birth_date || '', is_deceased: member.is_deceased || false, death_date: member.death_date || '' });
    setTempBirthDate(parseDateString(member.birth_date) || new Date(1970, 0, 1));
    setTempDeathDate(parseDateString(member.death_date) || new Date());
    setShowDetail(false); setShowAddForm(true);
  };
  const closeAddForm = () => { setShowAddForm(false); resetForm(); };

  const onBirthDateChange = (event, selectedDate) => { if (Platform.OS === 'android') { setShowBirthPicker(false); if (event.type === 'set' && selectedDate) { setTempBirthDate(selectedDate); setFormData(prev => ({ ...prev, birth_date: formatDateToString(selectedDate) })); } } else { if (selectedDate) setTempBirthDate(selectedDate); } };
  const confirmBirthDate = () => { setFormData(prev => ({ ...prev, birth_date: formatDateToString(tempBirthDate) })); setShowBirthPicker(false); };
  const clearBirthDate = () => { setFormData(prev => ({ ...prev, birth_date: '' })); setTempBirthDate(new Date(1970, 0, 1)); setShowBirthPicker(false); };
  const onDeathDateChange = (event, selectedDate) => { if (Platform.OS === 'android') { setShowDeathPicker(false); if (event.type === 'set' && selectedDate) { setTempDeathDate(selectedDate); setFormData(prev => ({ ...prev, death_date: formatDateToString(selectedDate) })); } } else { if (selectedDate) setTempDeathDate(selectedDate); } };
  const confirmDeathDate = () => { setFormData(prev => ({ ...prev, death_date: formatDateToString(tempDeathDate) })); setShowDeathPicker(false); };
  const clearDeathDate = () => { setFormData(prev => ({ ...prev, death_date: '' })); setTempDeathDate(new Date()); setShowDeathPicker(false); };

  const handleSave = async () => {
    if (!formData.first_name.trim()) { Alert.alert('Required', 'First name is required.'); return; }
    if (!formData.relationship_to_user) { Alert.alert('Required', 'Please select a relationship.'); return; }
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) { Alert.alert('Invalid Email', 'Please enter a valid email address.'); return; }
    setSaving(true);
    const token = await getToken();
    if (!token) { Alert.alert('Error', 'You must be logged in.'); setSaving(false); return; }
    const payload = { first_name: formData.first_name.trim(), last_name: formData.last_name.trim(), relationship: formData.relationship_to_user };
    if (formData.email.trim()) payload.email = formData.email.trim();
    if (formData.birth_date) payload.birth_date = formData.birth_date;
    if (formData.is_deceased) { payload.is_deceased = 1; if (formData.death_date) payload.death_date = formData.death_date; } else { payload.is_deceased = 0; payload.death_date = ''; }
    let result;
    if (editingMember) { result = await editFamilyMember(token, editingMember.id, payload); } else { result = await addFamilyMember(token, payload); }
    setSaving(false);
    if (result.data && result.data.success) { Alert.alert(editingMember ? 'Updated!' : 'Added!', editingMember ? `${payload.first_name} has been updated.` : `${payload.first_name} has been added to your family tree.`); closeAddForm(); loadMembers(false); }
    else { Alert.alert('Error', result.error || result.data?.message || 'Could not save member.'); }
  };

  const openDetail = (member) => { setSelectedMember(member); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelectedMember(null); };
  const handleDelete = (member) => {
    Alert.alert('Remove Family Member', `Are you sure you want to remove ${member.first_name} ${member.last_name} from your family tree? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { const token = await getToken(); if (!token) return; const result = await removeFamilyMember(token, member.id); if (result.data && result.data.success) { Alert.alert('Removed', result.data.message); closeDetail(); loadMembers(false); } else { Alert.alert('Error', result.error || result.data?.message || 'Could not remove member.'); } }},
    ]);
  };
  const handleInvite = async (member) => {
    setInviting(true); const token = await getToken(); if (!token) { setInviting(false); return; }
    const result = await inviteFamilyMember(token, member.id); setInviting(false);
    if (result.data && result.data.success) { Alert.alert('Sent!', result.data.message); loadMembers(false); const updated = await getFamilyMembers(token); if (updated.data && updated.data.success) { const refreshed = updated.data.members.find(m => m.id === member.id); if (refreshed) setSelectedMember(refreshed); } }
    else { Alert.alert('Error', result.error || result.data?.message || 'Could not send invitation.'); }
  };

  const getStatusBadge = (status) => { switch (status) { case 'registered': return { label: 'Joined', color: '#27ae60', bg: '#e8f8f0' }; case 'invited': return { label: 'Invited', color: '#D4A574', bg: '#fdf3eb' }; default: return { label: 'Not Invited', color: '#636E72', bg: '#f0f0f0' }; } };
  const getInitials = (first, last) => ((first || '')[0] || '') + ((last || '')[0] || '');
  const getRelationshipLabel = (value) => { const opt = RELATIONSHIP_OPTIONS.find(o => o.value === value); return opt ? opt.label : 'Select relationship...'; };

  if (loading) { return (<View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2C5F7B" /><Text style={styles.loadingText}>Loading family...</Text></View>); }

  const nonSelfMembers = members.filter(m => !m.is_self);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2C5F7B" />}>
        <View style={styles.header}><Text style={styles.headerTitle}>Family Tree</Text><Text style={styles.headerSubtitle}>{meta ? `${meta.total_members} member${meta.total_members !== 1 ? 's' : ''}` : ''}</Text></View>
        <TouchableOpacity style={styles.viewTreeBtn} activeOpacity={0.7} onPress={openTree}><Text style={styles.viewTreeText}>🌳  View Family Tree</Text></TouchableOpacity>
        {meta && !meta.is_premium && (<View style={styles.tierBar}><Text style={styles.tierText}>{meta.addable_count} of {meta.max_free} members used</Text><View style={styles.tierProgress}><View style={[styles.tierFill, { width: `${Math.min((meta.addable_count / meta.max_free) * 100, 100)}%` }]} /></View></View>)}
        {nonSelfMembers.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyIcon}>🌳</Text><Text style={styles.emptyTitle}>Start your family tree</Text><Text style={styles.emptyDesc}>Add family members to build a living tree that grows as your family joins.</Text><TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={openAddForm}><Text style={styles.addBtnText}>+ Add Family Member</Text></TouchableOpacity></View>
        ) : (
          <View>
            {nonSelfMembers.map((member) => { const badge = getStatusBadge(member.status); return (
              <TouchableOpacity key={member.id} style={styles.card} activeOpacity={0.7} onPress={() => openDetail(member)}>
                {member.photo ? (<Image source={{ uri: member.photo }} style={styles.photo} />) : (<View style={styles.initialsCircle}><Text style={styles.initialsText}>{getInitials(member.first_name, member.last_name)}</Text></View>)}
                <View style={styles.cardInfo}><Text style={styles.cardName}>{member.first_name} {member.last_name}</Text><Text style={styles.cardRelationship}>{member.relationship}</Text>{member.is_deceased && <Text style={styles.deceasedLabel}>✝ Memorial</Text>}</View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}><Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text></View>
              </TouchableOpacity>); })}
            {meta && meta.can_add && (<TouchableOpacity style={styles.addBtnBottom} activeOpacity={0.7} onPress={openAddForm}><Text style={styles.addBtnBottomText}>+ Add Family Member</Text></TouchableOpacity>)}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showTree} animationType="slide" presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
          <View style={styles.treeHeader}><TouchableOpacity onPress={() => setShowTree(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.treeHeaderBack}>← Back</Text></TouchableOpacity><Text style={styles.treeHeaderTitle}>Family Tree</Text><View style={{ width: 50 }} /></View>
          {treeToken ? (<WebView source={{ html: buildTreeHTML(treeToken) }} style={{ flex: 1, backgroundColor: '#FAF8F5' }} originWhitelist={['*']} javaScriptEnabled={true} domStorageEnabled={true} startInLoadingState={true} renderLoading={() => (<View style={styles.webviewLoading}><ActivityIndicator size="large" color="#2C5F7B" /></View>)} />) : null}
        </View>
      </Modal>

      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}><TouchableOpacity onPress={closeDetail} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.modalCancel}>Close</Text></TouchableOpacity><Text style={styles.modalTitle}>Member Details</Text><View style={{ width: 50 }} /></View>
          {selectedMember && (<ScrollView style={styles.formScroll}>
            <View style={styles.detailProfileSection}>
              {selectedMember.photo ? (<Image source={{ uri: selectedMember.photo }} style={styles.detailPhoto} />) : (<View style={styles.detailInitialsCircle}><Text style={styles.detailInitialsText}>{getInitials(selectedMember.first_name, selectedMember.last_name)}</Text></View>)}
              <Text style={styles.detailName}>{selectedMember.first_name} {selectedMember.last_name}</Text><Text style={styles.detailRelationship}>{selectedMember.relationship}</Text>
              {(() => { const badge = getStatusBadge(selectedMember.status); return (<View style={[styles.detailBadge, { backgroundColor: badge.bg }]}><Text style={[styles.detailBadgeText, { color: badge.color }]}>{badge.label}</Text></View>); })()}
              {selectedMember.is_deceased && <Text style={styles.detailDeceased}>✝ Memorial</Text>}
            </View>
            <View style={styles.detailCard}>
              {selectedMember.email && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Email</Text><Text style={styles.detailValue}>{selectedMember.email}</Text></View>)}
              {selectedMember.birth_date && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Born</Text><Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.birth_date)}</Text></View>)}
              {selectedMember.is_deceased && selectedMember.death_date && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Passed</Text><Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.death_date)}</Text></View>)}
              {selectedMember.invitation_sent && selectedMember.invitation_sent_at && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Invitation Sent</Text><Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.invitation_sent_at?.split(' ')[0])}</Text></View>)}
              {selectedMember.created_at && (<View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={styles.detailLabel}>Added</Text><Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.created_at?.split(' ')[0])}</Text></View>)}
            </View>
            <View style={styles.detailActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(selectedMember)} activeOpacity={0.7}><Text style={styles.actionBtnText}>✏️  Edit Details</Text></TouchableOpacity>
              {selectedMember.email && selectedMember.status !== 'registered' && (<TouchableOpacity style={[styles.actionBtn, styles.actionBtnGold]} onPress={() => handleInvite(selectedMember)} disabled={inviting} activeOpacity={0.7}><Text style={styles.actionBtnGoldText}>{inviting ? 'Sending...' : selectedMember.invitation_sent ? '📧  Resend Invitation' : '📧  Send Invitation'}</Text></TouchableOpacity>)}
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(selectedMember)} activeOpacity={0.7}><Text style={styles.actionBtnDangerText}>🗑  Remove from Family Tree</Text></TouchableOpacity>
            </View><View style={{ height: 40 }} />
          </ScrollView>)}
        </View>
      </Modal>

      <Modal visible={showAddForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeAddForm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity>
              <Text style={styles.modalTitle}>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>{saving ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>First Name *</Text>
              <TextInput style={styles.textInput} placeholder="First name" placeholderTextColor="#B2BEC3" value={formData.first_name} onChangeText={(val) => setFormData(prev => ({ ...prev, first_name: val }))} autoCapitalize="words" returnKeyType="next" />
              <Text style={styles.fieldLabel}>Last Name</Text>
              <TextInput style={styles.textInput} placeholder="Last name" placeholderTextColor="#B2BEC3" value={formData.last_name} onChangeText={(val) => setFormData(prev => ({ ...prev, last_name: val }))} autoCapitalize="words" returnKeyType="next" />
              <Text style={styles.fieldLabel}>Relationship *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowRelPicker(true)} activeOpacity={0.7}><Text style={[styles.pickerBtnText, !formData.relationship_to_user && { color: '#B2BEC3' }]}>{getRelationshipLabel(formData.relationship_to_user)}</Text><Text style={styles.pickerArrow}>▼</Text></TouchableOpacity>
              <Text style={styles.fieldLabel}>Email (optional)</Text><Text style={styles.fieldHint}>Add email to send an invitation to join</Text>
              <TextInput style={styles.textInput} placeholder="email@example.com" placeholderTextColor="#B2BEC3" value={formData.email} onChangeText={(val) => setFormData(prev => ({ ...prev, email: val }))} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" />
              <Text style={styles.fieldLabel}>Birth Date (optional)</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowBirthPicker(true)} activeOpacity={0.7}><Text style={[styles.pickerBtnText, !formData.birth_date && { color: '#B2BEC3' }]}>{formData.birth_date ? formatDateForDisplay(formData.birth_date) : 'Select date...'}</Text><Text style={styles.pickerArrow}>📅</Text></TouchableOpacity>
              {showBirthPicker && Platform.OS === 'ios' && (<View style={styles.datePickerContainer}><DateTimePicker value={tempBirthDate} mode="date" display="spinner" onChange={onBirthDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} style={{ height: 150 }} /><View style={styles.datePickerActions}><TouchableOpacity onPress={clearBirthDate} style={styles.datePickerClear}><Text style={styles.datePickerClearText}>Clear</Text></TouchableOpacity><TouchableOpacity onPress={confirmBirthDate} style={styles.datePickerConfirm}><Text style={styles.datePickerConfirmText}>Done</Text></TouchableOpacity></View></View>)}
              {showBirthPicker && Platform.OS === 'android' && (<DateTimePicker value={tempBirthDate} mode="date" display="default" onChange={onBirthDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} />)}
              <TouchableOpacity style={styles.toggleRow} onPress={() => setFormData(prev => ({ ...prev, is_deceased: !prev.is_deceased, death_date: '' }))} activeOpacity={0.7}><View style={[styles.toggleBox, formData.is_deceased && styles.toggleBoxOn]}>{formData.is_deceased && <Text style={styles.toggleCheck}>✓</Text>}</View><Text style={styles.toggleLabel}>This person is deceased</Text></TouchableOpacity>
              {formData.is_deceased && (<>
                <Text style={styles.fieldLabel}>Death Date (optional)</Text>
                <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDeathPicker(true)} activeOpacity={0.7}><Text style={[styles.pickerBtnText, !formData.death_date && { color: '#B2BEC3' }]}>{formData.death_date ? formatDateForDisplay(formData.death_date) : 'Select date...'}</Text><Text style={styles.pickerArrow}>📅</Text></TouchableOpacity>
                {showDeathPicker && Platform.OS === 'ios' && (<View style={styles.datePickerContainer}><DateTimePicker value={tempDeathDate} mode="date" display="spinner" onChange={onDeathDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} style={{ height: 150 }} /><View style={styles.datePickerActions}><TouchableOpacity onPress={clearDeathDate} style={styles.datePickerClear}><Text style={styles.datePickerClearText}>Clear</Text></TouchableOpacity><TouchableOpacity onPress={confirmDeathDate} style={styles.datePickerConfirm}><Text style={styles.datePickerConfirmText}>Done</Text></TouchableOpacity></View></View>)}
                {showDeathPicker && Platform.OS === 'android' && (<DateTimePicker value={tempDeathDate} mode="date" display="default" onChange={onDeathDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} />)}
              </>)}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        <Modal visible={showRelPicker} animationType="fade" transparent>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowRelPicker(false)}>
            <View style={styles.pickerSheet}><Text style={styles.pickerSheetTitle}>Select Relationship</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {RELATIONSHIP_OPTIONS.filter(o => o.value !== '').map((opt) => (<TouchableOpacity key={opt.value} style={[styles.pickerOption, formData.relationship_to_user === opt.value && styles.pickerOptionSelected]} onPress={() => { setFormData(prev => ({ ...prev, relationship_to_user: opt.value })); setShowRelPicker(false); }} activeOpacity={0.7}><Text style={[styles.pickerOptionText, formData.relationship_to_user === opt.value && styles.pickerOptionTextSelected]}>{opt.label}</Text>{formData.relationship_to_user === opt.value && <Text style={styles.pickerCheck}>✓</Text>}</TouchableOpacity>))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </Modal>
    </View>
  );
}

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
  treeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#2C5F7B' },
  treeHeaderBack: { color: '#FFF', fontSize: 15 },
  treeHeaderTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8F5' },
  modalContainer: { flex: 1, backgroundColor: '#FAF8F5' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: '#2C5F7B' },
  modalCancel: { color: '#FFF', fontSize: 15 },
  modalTitle: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  modalSave: { color: '#D4A574', fontSize: 15, fontWeight: '700' },
  formScroll: { flex: 1, padding: 16 },
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