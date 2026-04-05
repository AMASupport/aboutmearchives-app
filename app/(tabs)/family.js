import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Alert, RefreshControl, TextInput, Modal, Platform,
  KeyboardAvoidingView,
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
// Family Tree HTML for WebView — v6
// Uses the EXACT proven layout engine from the web version
// (AMA - Family Tree V2 JavaScript v5.0)
// ============================================================
function buildTreeHTML(token) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#FAF8F5;font-family:-apple-system,sans-serif;overflow:hidden}
#tree-container{width:100vw;height:100vh}
#loading{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center}
#loading p{color:#636E72;font-size:14px;margin-top:10px}
.spinner{width:30px;height:30px;border:3px solid #E8E8E8;border-top-color:#2C5F7B;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto}
@keyframes spin{to{transform:rotate(360deg)}}
#empty{display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#636E72;font-size:15px}
#detail-panel{display:none;position:absolute;bottom:0;left:0;right:0;background:#fff;border-top-left-radius:16px;border-top-right-radius:16px;padding:16px 20px 30px;box-shadow:0 -4px 20px rgba(0,0,0,.1);z-index:10}
#detail-panel .dp-name{font-size:18px;font-weight:700;color:#2D3436}
#detail-panel .dp-rel{font-size:13px;color:#636E72;margin-top:2px}
#detail-panel .dp-status{display:inline-block;font-size:11px;font-weight:600;padding:3px 10px;border-radius:10px;margin-top:6px}
#detail-panel .dp-close{position:absolute;top:12px;right:16px;font-size:20px;color:#636E72;cursor:pointer;padding:4px}
#zoom-controls{position:absolute;bottom:16px;right:16px;display:flex;flex-direction:column;gap:6px;z-index:5}
.zoom-btn{width:40px;height:40px;border-radius:10px;background:#fff;border:1px solid #E8E5DE;display:flex;align-items:center;justify-content:center;font-size:20px;color:#2C5F7B;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.08)}
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
var TOKEN='${token}';
var API='${API_BASE}/family/tree';

// CONFIG — matches web version exactly
var CONFIG={
  card:{width:160,height:180,memorialHeight:200,radius:14,photoRadius:28,photoCx:80,photoCy:58,gapX:50,gapY:80,coupleGap:16},
  colors:{primary:'#2C5F7B',secondary:'#D4A574',accent:'#8FA99A',text:'#2D3436',textLight:'#636E72',background:'#FAF8F5',white:'#FFFFFF'}
};

var placeholderPhoto='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect width="56" height="56" fill="#E8E6E1"/><circle cx="28" cy="22" r="10" fill="#C8C5C0"/><ellipse cx="28" cy="46" rx="16" ry="11" fill="#C8C5C0"/></svg>');

var svgEl,gZoom,zoomBehavior;

async function init(){
  try{
    var resp=await fetch(API,{headers:{'Authorization':'Bearer '+TOKEN}});
    var data=await resp.json();
    document.getElementById('loading').style.display='none';
    if(!data.success||!data.nodes||data.nodes.length===0){document.getElementById('empty').style.display='block';return;}
    runTree(data.nodes,data.selfMemberId);
  }catch(e){document.getElementById('loading').innerHTML='<p style="color:#E74C3C;">Could not load tree data.</p>';}
}

function runTree(nodes,selfId){
  var W=window.innerWidth,H=window.innerHeight;
  svgEl=d3.select('#tree-svg').attr('width',W).attr('height',H);
  zoomBehavior=d3.zoom().scaleExtent([0.15,2.5]).on('zoom',function(e){gZoom.attr('transform',e.transform);});
  svgEl.call(zoomBehavior);
  gZoom=svgEl.append('g');

  // === DEFS ===
  var defs=gZoom.append('defs');
  var shadow=defs.append('filter').attr('id','cardShadow').attr('x','-15%').attr('y','-10%').attr('width','130%').attr('height','140%');
  shadow.append('feDropShadow').attr('dx',0).attr('dy',1).attr('stdDeviation',2).attr('flood-color','#000').attr('flood-opacity',.04);
  shadow.append('feDropShadow').attr('dx',0).attr('dy',4).attr('stdDeviation',6).attr('flood-color','#000').attr('flood-opacity',.04);
  var memGrad=defs.append('linearGradient').attr('id','memGrad').attr('x1','0').attr('y1','0').attr('x2','0').attr('y2','1');
  memGrad.append('stop').attr('offset','0%').attr('stop-color','#FFFDF8');
  memGrad.append('stop').attr('offset','100%').attr('stop-color','#FFFFFF');

  // Build tree using EXACT web version logic
  var tree=buildHierarchy(nodes,selfId);
  if(!tree){document.getElementById('empty').style.display='block';return;}
  var positions=computeLayout(tree);
  optimizePositions(tree,positions);
  resolveCollisions(tree,positions);

  // Draw
  var linesG=gZoom.append('g');
  drawConnections(linesG,tree,positions);
  var heartsG=gZoom.append('g');
  drawCoupleHearts(heartsG,tree,positions);
  var labelsG=gZoom.append('g');
  drawGenLabels(labelsG,tree,positions);
  var nodesG=gZoom.append('g');
  Object.keys(positions).forEach(function(nid){
    var node=tree.nodeMap[nid];if(!node)return;
    drawCard(nodesG,node,positions[nid]);
  });
  fitView();
}

// ================================================================
// buildHierarchy — EXACT copy from web v5.0
// ================================================================
function buildHierarchy(nodes,selfId){
  if(!nodes||nodes.length===0)return null;
  var nodeMap={};
  nodes.forEach(function(n){nodeMap[n.id]=Object.assign({},n,{_children:[],_spouse:null});});
  var root=null;
  nodes.forEach(function(n){if(n.isCurrentUser)root=nodeMap[n.id];});
  if(!root){if(nodeMap[selfId])root=nodeMap[selfId];else root=nodeMap[nodes[0].id];}

  var childToParents={},parentToChildren={};
  nodes.forEach(function(n){
    var parents=[];
    if(n.fid&&nodeMap[n.fid])parents.push(n.fid);
    if(n.mid&&nodeMap[n.mid])parents.push(n.mid);
    if(parents.length>0){
      childToParents[n.id]=parents;
      parents.forEach(function(pid){
        if(!parentToChildren[pid])parentToChildren[pid]=[];
        if(parentToChildren[pid].indexOf(n.id)===-1)parentToChildren[pid].push(n.id);
      });
    }
  });

  // Bridge duplicate persons
  var userIdToNodes={};
  nodes.forEach(function(n){if(n.userId){if(!userIdToNodes[n.userId])userIdToNodes[n.userId]=[];userIdToNodes[n.userId].push(n.id);}});
  Object.keys(userIdToNodes).forEach(function(uid){
    var nids=userIdToNodes[uid];if(nids.length<=1)return;
    var primaryId=nids[0],hasCU=false;
    nids.forEach(function(nid){if(nodeMap[nid]&&nodeMap[nid].isCurrentUser){primaryId=nid;hasCU=true;}});
    if(!hasCU){var best=9999;nids.forEach(function(nid){var n=nodeMap[nid];if(!n)return;var d=n.depth!==undefined?n.depth:9999;if(d<best){best=d;primaryId=nid;}});}
    var pn=nodeMap[primaryId];
    nids.forEach(function(nid){
      if(nid===primaryId)return;var dn=nodeMap[nid];if(!dn)return;
      if(dn.pids)dn.pids.forEach(function(pid){if(pid!==primaryId&&pn.pids&&pn.pids.indexOf(pid)===-1){if(!pn.pids)pn.pids=[];pn.pids.push(pid);}if(nodeMap[pid]&&nodeMap[pid].pids){var idx=nodeMap[pid].pids.indexOf(nid);if(idx!==-1)nodeMap[pid].pids[idx]=primaryId;}});
      Object.keys(nodeMap).forEach(function(oid){var on=nodeMap[oid];if(!on||!on.pids)return;var di=on.pids.indexOf(nid);if(di!==-1){if(on.pids.indexOf(primaryId)!==-1)on.pids.splice(di,1);else on.pids[di]=primaryId;}});
      Object.keys(childToParents).forEach(function(cid){var ps=childToParents[cid];var idx=ps.indexOf(nid);if(idx!==-1){ps[idx]=primaryId;if(!parentToChildren[primaryId])parentToChildren[primaryId]=[];if(parentToChildren[primaryId].indexOf(cid)===-1)parentToChildren[primaryId].push(cid);}});
      if(parentToChildren[nid]){if(!parentToChildren[primaryId])parentToChildren[primaryId]=[];parentToChildren[nid].forEach(function(cid){if(parentToChildren[primaryId].indexOf(cid)===-1)parentToChildren[primaryId].push(cid);var cp=childToParents[cid]||[];var idx=cp.indexOf(nid);if(idx!==-1)cp[idx]=primaryId;});}
      if(dn.fid&&!pn.fid){pn.fid=dn.fid;if(!childToParents[primaryId])childToParents[primaryId]=[];if(childToParents[primaryId].indexOf(dn.fid)===-1)childToParents[primaryId].push(dn.fid);}
      if(dn.mid&&!pn.mid){pn.mid=dn.mid;if(!childToParents[primaryId])childToParents[primaryId]=[];if(childToParents[primaryId].indexOf(dn.mid)===-1)childToParents[primaryId].push(dn.mid);}
      dn._merged=true;
    });
  });
  Object.keys(nodeMap).forEach(function(nid){if(nodeMap[nid]._merged)delete nodeMap[nid];});
  Object.keys(nodeMap).forEach(function(nid){var n=nodeMap[nid];if(n.pids&&n.pids.length>1){var s={};n.pids=n.pids.filter(function(p){if(s[p])return false;s[p]=true;return true;});}});

  // Spouse pairing — iterate nodeMap keys (v5.1 fix)
  var spousePairs={},spouseOf={};
  Object.keys(nodeMap).forEach(function(nid){
    var n=nodeMap[nid];if(!n.pids||n.pids.length===0)return;
    n.pids.forEach(function(pid){
      if(!nodeMap[pid])return;
      if(!spouseOf[n.id]&&!spouseOf[pid]){spouseOf[n.id]=pid;spouseOf[pid]=n.id;var c=n.id<pid?n.id:pid;spousePairs[c]=[n.id,pid];}
    });
  });

  // BFS generation assignment
  var generations={};generations[root.id]=0;
  var queue=[root.id],visited={};visited[root.id]=true;
  while(queue.length>0){
    var cur=queue.shift(),cg=generations[cur];
    (childToParents[cur]||[]).forEach(function(pid){if(!visited[pid]&&nodeMap[pid]){generations[pid]=cg-1;visited[pid]=true;queue.push(pid);}});
    (parentToChildren[cur]||[]).forEach(function(cid){if(!visited[cid]&&nodeMap[cid]){generations[cid]=cg+1;visited[cid]=true;queue.push(cid);}});
    if(spouseOf[cur]&&!visited[spouseOf[cur]]&&nodeMap[spouseOf[cur]]){generations[spouseOf[cur]]=cg;visited[spouseOf[cur]]=true;queue.push(spouseOf[cur]);}
  }

  var genGroups={},minGen=0,maxGen=0;
  Object.keys(generations).forEach(function(nid){var g=generations[nid];if(g<minGen)minGen=g;if(g>maxGen)maxGen=g;if(!genGroups[g])genGroups[g]=[];genGroups[g].push(nid);});

  return{nodeMap:nodeMap,generations:generations,genGroups:genGroups,minGen:minGen,maxGen:maxGen,spouseOf:spouseOf,spousePairs:spousePairs,childToParents:childToParents,parentToChildren:parentToChildren,root:root};
}

// ================================================================
// computeLayout — lineage-aware, EXACT from web v5.0
// ================================================================
function computeLayout(tree){
  var positions={};
  var cW=CONFIG.card.width,cH=CONFIG.card.height,gX=CONFIG.card.gapX,gY=CONFIG.card.gapY,cG=CONFIG.card.coupleGap;
  var genOff=-tree.minGen;

  // Lineage tagging
  var lg={};var rId=tree.root.id;var sId=tree.spouseOf[rId]||null;
  lg[rId]='center';if(sId)lg[sId]='center';
  function tagAnc(start,grp){var q=[start],v={};v[start]=true;while(q.length>0){var c=q.shift();if(!lg[c])lg[c]=grp;var cs=tree.spouseOf[c];if(cs&&!v[cs]&&tree.nodeMap[cs]){if(!lg[cs])lg[cs]=grp;v[cs]=true;q.push(cs);}(tree.childToParents[c]||[]).forEach(function(p){if(!v[p]&&tree.nodeMap[p]){v[p]=true;q.push(p);}});var mp=tree.childToParents[c]||[];mp.forEach(function(p){(tree.parentToChildren[p]||[]).forEach(function(ci){if(ci!==c&&!v[ci]&&tree.nodeMap[ci]){v[ci]=true;q.push(ci);}});});}}
  (tree.childToParents[rId]||[]).forEach(function(p){if(tree.nodeMap[p])tagAnc(p,'left');});
  if(sId)(tree.childToParents[sId]||[]).forEach(function(p){if(tree.nodeMap[p])tagAnc(p,'right');});
  function tagDesc(start,grp){var q=[start],v={};v[start]=true;while(q.length>0){var c=q.shift();if(!lg[c])lg[c]=grp;(tree.parentToChildren[c]||[]).forEach(function(ci){if(!v[ci]&&tree.nodeMap[ci]){v[ci]=true;q.push(ci);}});var cs=tree.spouseOf[c];if(cs&&!v[cs]&&tree.nodeMap[cs]){v[cs]=true;q.push(cs);}}}
  tagDesc(rId,'center');if(sId)(tree.parentToChildren[sId]||[]).forEach(function(ci){if(tree.nodeMap[ci])tagDesc(ci,'center');});
  Object.keys(tree.nodeMap).forEach(function(nid){if(!lg[nid])lg[nid]='left';});

  function genSame(a,b){return tree.generations[a]===tree.generations[b];}

  for(var g=tree.minGen;g<=tree.maxGen;g++){
    var nig=(tree.genGroups[g]||[]).filter(function(n){return!!tree.nodeMap[n];});if(nig.length===0)continue;
    var y=(g+genOff)*(cH+gY);
    var placed={},lU=[],cU=[],rU=[];
    function mkUnit(nid){
      if(placed[nid])return null;
      if(tree.spouseOf[nid]&&tree.nodeMap[tree.spouseOf[nid]]&&genSame(nid,tree.spouseOf[nid])){
        var sid=tree.spouseOf[nid];if(placed[sid])return null;
        var l=nid,r=sid;if(tree.nodeMap[sid]&&tree.nodeMap[sid].isCurrentUser){l=sid;r=nid;}
        placed[nid]=true;placed[sid]=true;return[l,r];
      }else{placed[nid]=true;return[nid];}
    }
    nig.forEach(function(nid){if(placed[nid])return;var grp=lg[nid]||'center';var u=mkUnit(nid);if(!u)return;if(grp==='left')lU.push(u);else if(grp==='right')rU.push(u);else cU.push(u);});
    var allU=lU.concat(cU).concat(rU);
    function secW(units){var w=0;units.forEach(function(u,i){w+=(u.length===2)?(cW*2+cG):cW;if(i<units.length-1)w+=gX;});return w;}
    var lW=secW(lU),cWid=secW(cU),rW=secW(rU);
    var cSX=-cWid/2,sGap=gX*1.5;
    var lEX=cSX-(lU.length>0&&cU.length>0?sGap:0),lSX=lEX-lW;
    var cEX=cSX+cWid,rSX=cEX+(rU.length>0&&cU.length>0?sGap:0);
    if(cU.length===0){var hg=sGap/2;lSX=-lW-hg;rSX=hg;}
    function placeUnits(units,startX){var cx=startX;units.forEach(function(u,i){if(u.length===2){positions[u[0]]={x:cx,y:y};positions[u[1]]={x:cx+cW+cG,y:y};cx+=cW*2+cG;}else{positions[u[0]]={x:cx,y:y};cx+=cW;}if(i<units.length-1)cx+=gX;});}
    placeUnits(lU,lSX);placeUnits(cU,cSX);placeUnits(rU,rSX);
  }
  return positions;
}

// ================================================================
// optimizePositions — center parents above their children
// ================================================================
function optimizePositions(tree,positions){
  var cW=CONFIG.card.width;
  for(var pass=0;pass<5;pass++){
    var done={};
    Object.keys(tree.parentToChildren).forEach(function(pid){
      if(done[pid]||!positions[pid]||!tree.nodeMap[pid])return;
      var kids=(tree.parentToChildren[pid]||[]).filter(function(c){return!!positions[c];});if(kids.length===0)return;
      var sp=tree.spouseOf[pid],isCouple=sp&&positions[sp]&&tree.generations[sp]===tree.generations[pid];
      done[pid]=true;if(isCouple)done[sp]=true;
      if(isCouple){(tree.parentToChildren[sp]||[]).forEach(function(c){if(positions[c]&&kids.indexOf(c)===-1)kids.push(c);});}
      var cXs=kids.map(function(c){return positions[c].x+cW/2;});
      var cMin=Math.min.apply(null,cXs),cMax=Math.max.apply(null,cXs),cCenter=(cMin+cMax)/2;
      if(isCouple){var pL=Math.min(positions[pid].x,positions[sp].x),pR=Math.max(positions[pid].x,positions[sp].x)+cW;var uC=(pL+pR)/2;var sh=cCenter-uC;positions[pid].x+=sh;positions[sp].x+=sh;}
      else{var cur=positions[pid].x+cW/2;positions[pid].x+=cCenter-cur;}
    });
    Object.keys(tree.childToParents).forEach(function(cid){
      if(!positions[cid])return;
      var ps=(tree.childToParents[cid]||[]).filter(function(p){return!!positions[p];});if(ps.length===0)return;
      var p0=ps[0];var allKids=(tree.parentToChildren[p0]||[]).filter(function(c){return!!positions[c];});if(allKids.length>1)return;
      var pXs=ps.map(function(p){return positions[p].x+cW/2;});var pC=pXs.reduce(function(a,b){return a+b;},0)/pXs.length;
      var sh=pC-(positions[cid].x+cW/2);positions[cid].x+=sh;
      var cs=tree.spouseOf[cid];if(cs&&positions[cs]&&tree.generations[cs]===tree.generations[cid])positions[cs].x+=sh;
    });
  }
}

// ================================================================
// resolveCollisions
// ================================================================
function resolveCollisions(tree,positions){
  var cW=CONFIG.card.width,minGap=25;
  for(var g=tree.minGen;g<=tree.maxGen;g++){
    var nig=(tree.genGroups[g]||[]).filter(function(n){return!!positions[n]&&!!tree.nodeMap[n];});if(nig.length<=1)continue;
    nig.sort(function(a,b){return positions[a].x-positions[b].x;});
    for(var i=1;i<nig.length;i++){
      var pR=positions[nig[i-1]].x+cW,cL=positions[nig[i]].x;
      if(cL<pR+minGap){var ov=(pR+minGap)-cL;positions[nig[i]].x+=ov;var cs=tree.spouseOf[nig[i]];if(cs&&positions[cs]&&positions[cs].x>positions[nig[i]].x&&tree.generations[cs]===g)positions[cs].x+=ov;}
    }
  }
}

// ================================================================
// DRAWING — connections, hearts, labels, cards
// ================================================================
function drawConnections(group,tree,positions){
  Object.keys(tree.childToParents).forEach(function(cid){
    if(!positions[cid])return;
    var ps=(tree.childToParents[cid]||[]).filter(function(p){return!!positions[p];});if(ps.length===0)return;
    var cX=positions[cid].x+CONFIG.card.width/2,cY=positions[cid].y;
    var pXs=ps.map(function(p){return positions[p].x+CONFIG.card.width/2;});
    var pMX=pXs.reduce(function(a,b){return a+b;},0)/pXs.length;
    var pN=tree.nodeMap[ps[0]];var pH=pN&&pN.deceased?CONFIG.card.memorialHeight:CONFIG.card.height;
    var pY=positions[ps[0]].y+pH;var midY=pY+(cY-pY)/2;
    group.append('path').attr('d','M '+pMX+' '+pY+' C '+pMX+' '+midY+', '+cX+' '+midY+', '+cX+' '+cY)
      .attr('fill','none').attr('stroke',CONFIG.colors.secondary).attr('stroke-width',2).attr('stroke-opacity',.3);
    group.append('circle').attr('cx',pMX).attr('cy',pY).attr('r',3).attr('fill',CONFIG.colors.secondary).attr('fill-opacity',.3);
    group.append('circle').attr('cx',cX).attr('cy',cY).attr('r',3).attr('fill',CONFIG.colors.secondary).attr('fill-opacity',.3);
  });
}

function drawCoupleHearts(group,tree,positions){
  var drawn={};
  Object.keys(tree.spousePairs).forEach(function(c){
    var p=tree.spousePairs[c];if(!positions[p[0]]||!positions[p[1]]||drawn[c])return;drawn[c]=true;
    if(tree.generations[p[0]]!==tree.generations[p[1]])return;
    var lX=Math.min(positions[p[0]].x,positions[p[1]].x)+CONFIG.card.width;
    var rX=Math.max(positions[p[0]].x,positions[p[1]].x);
    var mX=(lX+rX)/2,mY=positions[p[0]].y+CONFIG.card.height/2;
    group.append('line').attr('x1',lX).attr('y1',mY).attr('x2',rX).attr('y2',mY).attr('stroke',CONFIG.colors.secondary).attr('stroke-width',2).attr('stroke-opacity',.3);
    group.append('text').attr('x',mX).attr('y',mY+5).attr('text-anchor','middle').attr('font-size','14px').attr('fill',CONFIG.colors.secondary).attr('fill-opacity',.6).text('\u2665');
  });
}

function drawGenLabels(group,tree,positions){
  var names={'-3':'Great-Grandparents','-2':'Grandparents','-1':'Parents','0':'You','1':'Children','2':'Grandchildren'};
  var allX=[];Object.keys(positions).forEach(function(n){allX.push(positions[n].x);allX.push(positions[n].x+CONFIG.card.width);});
  var gMinX=Math.min.apply(null,allX)-40,gMaxX=Math.max.apply(null,allX)+40;
  for(var g=tree.minGen;g<=tree.maxGen;g++){
    if(!tree.genGroups[g]||tree.genGroups[g].length===0)continue;
    var label=names[String(g)]||'Gen '+g;
    var fn=tree.genGroups[g][0];if(!positions[fn])continue;
    var y=positions[fn].y-20;var lx=(gMinX+gMaxX)/2;
    group.append('line').attr('x1',gMinX).attr('y1',y).attr('x2',gMaxX).attr('y2',y).attr('stroke',CONFIG.colors.primary).attr('stroke-opacity',.06).attr('stroke-width',1);
    group.append('rect').attr('x',lx-50).attr('y',y-9).attr('width',100).attr('height',18).attr('fill',CONFIG.colors.background).attr('rx',4);
    group.append('text').attr('x',lx).attr('y',y+4).attr('text-anchor','middle').attr('fill',CONFIG.colors.textLight).attr('font-size','10px').attr('font-weight','600').attr('letter-spacing','0.5px').text(label);
  }
}

function drawCard(group,node,pos){
  var isMe=node.isCurrentUser,isDead=node.deceased;
  var cW=CONFIG.card.width,cH=isDead?CONFIG.card.memorialHeight:CONFIG.card.height,r=CONFIG.card.radius;
  var card=group.append('g').attr('transform','translate('+pos.x+','+pos.y+')').style('cursor','pointer').on('click',function(){showDetail(node);});

  // Card bg
  if(isDead)card.append('rect').attr('width',cW).attr('height',cH).attr('rx',r).attr('fill','url(#memGrad)').attr('filter','url(#cardShadow)');
  else card.append('rect').attr('width',cW).attr('height',cH).attr('rx',r).attr('fill','#FFF').attr('stroke',isMe?'rgba(44,95,123,.15)':'none').attr('stroke-width',isMe?1.5:0).attr('filter','url(#cardShadow)');

  // Status stripe
  var sc=CONFIG.colors.accent;if(isMe||node.isRegistered)sc=CONFIG.colors.primary;else if(node.isInvited)sc=CONFIG.colors.secondary;if(isDead)sc=CONFIG.colors.secondary;
  card.append('rect').attr('x',30).attr('y',0).attr('width',cW-60).attr('height',3).attr('fill',sc);

  // YOU badge
  if(isMe){
    card.append('rect').attr('x',cW-42).attr('y',2).attr('width',36).attr('height',18).attr('rx',9).attr('fill',CONFIG.colors.primary);
    card.append('text').attr('x',cW-24).attr('y',14).attr('text-anchor','middle').attr('fill','#fff').attr('font-size','9px').attr('font-weight','700').text('You');
  }

  // Photo circle
  var pR=CONFIG.card.photoRadius,pCx=CONFIG.card.photoCx,pCy=CONFIG.card.photoCy;
  card.append('circle').attr('cx',pCx).attr('cy',pCy).attr('r',pR+3).attr('fill',CONFIG.colors.background);
  var clipId='clip_'+String(node.id).replace(/[^a-zA-Z0-9_]/g,'_');
  card.append('defs').append('clipPath').attr('id',clipId).append('circle').attr('cx',pCx).attr('cy',pCy).attr('r',pR);
  var photoUrl=(node.hasPhoto&&node.photo)?node.photo:placeholderPhoto;
  card.append('image').attr('x',pCx-pR).attr('y',pCy-pR).attr('width',pR*2).attr('height',pR*2).attr('clip-path','url(#'+clipId+')').attr('preserveAspectRatio','xMidYMid slice').attr('href',photoUrl);

  // Status dot
  if(!isDead){var dc=CONFIG.colors.accent;if(isMe||node.isRegistered)dc=CONFIG.colors.primary;else if(node.isInvited)dc=CONFIG.colors.secondary;
    card.append('circle').attr('cx',pCx+pR-4).attr('cy',pCy+pR-4).attr('r',5).attr('fill',dc).attr('stroke','#fff').attr('stroke-width',2);}

  // Name + relationship
  var nm=node.name||'';var sn=nm.length>18?nm.substring(0,17)+'\u2026':nm;
  if(isDead){
    card.append('text').attr('x',cW/2).attr('y',pCy+pR+22).attr('text-anchor','middle').attr('fill',CONFIG.colors.secondary).attr('font-size','13px').attr('font-weight','600').text(sn);
    card.append('text').attr('x',cW/2).attr('y',pCy+pR+37).attr('text-anchor','middle').attr('fill',CONFIG.colors.secondary).attr('font-size','8px').attr('font-style','italic').text('In Loving Memory');
    card.append('text').attr('x',cW/2).attr('y',pCy+pR+52).attr('text-anchor','middle').attr('fill',CONFIG.colors.textLight).attr('font-size','9px').text(node.relationship||'');
  }else{
    card.append('text').attr('x',cW/2).attr('y',pCy+pR+22).attr('text-anchor','middle').attr('fill',CONFIG.colors.text).attr('font-size','13px').attr('font-weight','600').text(sn);
    card.append('text').attr('x',cW/2).attr('y',pCy+pR+38).attr('text-anchor','middle').attr('fill',CONFIG.colors.textLight).attr('font-size','9px').text(isMe?'You':(node.relationship||''));
  }
}

function showDetail(node){
  document.getElementById('dp-name').textContent=node.name||'';
  document.getElementById('dp-rel').textContent=node.isCurrentUser?'You':(node.relationship||'');
  var el=document.getElementById('dp-status');
  if(node.isCurrentUser){el.style.display='none';}
  else{el.style.display='inline-block';if(node.isRegistered||node.status==='registered'){el.textContent='Joined';el.style.background='#e8f8f0';el.style.color='#27ae60';}else if(node.status==='invited'||node.isInvited){el.textContent='Invited';el.style.background='#fdf3eb';el.style.color='#D4A574';}else{el.textContent='Not Invited';el.style.background='#f0f0f0';el.style.color='#636E72';}}
  document.getElementById('detail-panel').style.display='block';
}
function closePanel(){document.getElementById('detail-panel').style.display='none';}
function zoomIn(){svgEl.transition().duration(300).call(zoomBehavior.scaleBy,1.4);}
function zoomOut(){svgEl.transition().duration(300).call(zoomBehavior.scaleBy,.7);}
function fitView(){
  var b=gZoom.node().getBBox();if(!b.width||!b.height)return;
  var w=window.innerWidth,h=window.innerHeight,p=50;
  var s=Math.min((w-p*2)/b.width,(h-p*2)/b.height,1.5);
  svgEl.transition().duration(500).call(zoomBehavior.transform,d3.zoomIdentity.translate(w/2-(b.x+b.width/2)*s,h/2-(b.y+b.height/2)*s).scale(s));
}

init();
<\/script>
</body></html>`;
}

// ============================================================
// REACT NATIVE COMPONENT — unchanged
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
  const openTree = async () => { const token = await getToken(); if (!token) { Alert.alert('Error', 'You must be logged in.'); return; } setTreeToken(token); setShowTree(true); };

  const formatDateToString = (date) => { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, '0'); const d = String(date.getDate()).padStart(2, '0'); return `${y}-${m}-${d}`; };
  const formatDateForDisplay = (dateStr) => { if (!dateStr) return ''; const parts = dateStr.split('-'); if (parts.length < 3) return dateStr; const months = ['January','February','March','April','May','June','July','August','September','October','November','December']; return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, ${parts[0]}`; };
  const parseDateString = (dateStr) => { if (!dateStr) return null; const [y, m, d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d); };
  const resetForm = () => { setFormData({ first_name: '', last_name: '', relationship_to_user: '', email: '', birth_date: '', is_deceased: false, death_date: '' }); setTempBirthDate(new Date(1970, 0, 1)); setTempDeathDate(new Date()); setEditingMember(null); };
  const openAddForm = () => { resetForm(); setShowAddForm(true); };
  const openEditForm = (member) => { const relValue = RELATIONSHIP_OPTIONS.find(o => o.value === (member.relationship || '').toLowerCase() || o.label.toLowerCase() === (member.relationship || '').toLowerCase())?.value || member.relationship?.toLowerCase() || ''; setEditingMember(member); setFormData({ first_name: member.first_name || '', last_name: member.last_name || '', relationship_to_user: relValue, email: member.email || '', birth_date: member.birth_date || '', is_deceased: member.is_deceased || false, death_date: member.death_date || '' }); setTempBirthDate(parseDateString(member.birth_date) || new Date(1970, 0, 1)); setTempDeathDate(parseDateString(member.death_date) || new Date()); setShowDetail(false); setShowAddForm(true); };
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
    setSaving(true); const token = await getToken(); if (!token) { Alert.alert('Error', 'You must be logged in.'); setSaving(false); return; }
    const payload = { first_name: formData.first_name.trim(), last_name: formData.last_name.trim(), relationship: formData.relationship_to_user };
    if (formData.email.trim()) payload.email = formData.email.trim(); if (formData.birth_date) payload.birth_date = formData.birth_date;
    if (formData.is_deceased) { payload.is_deceased = 1; if (formData.death_date) payload.death_date = formData.death_date; } else { payload.is_deceased = 0; payload.death_date = ''; }
    let result; if (editingMember) { result = await editFamilyMember(token, editingMember.id, payload); } else { result = await addFamilyMember(token, payload); }
    setSaving(false);
    if (result.data && result.data.success) { Alert.alert(editingMember ? 'Updated!' : 'Added!', editingMember ? `${payload.first_name} has been updated.` : `${payload.first_name} has been added to your family tree.`); closeAddForm(); loadMembers(false); }
    else { Alert.alert('Error', result.error || result.data?.message || 'Could not save member.'); }
  };
  const openDetail = (member) => { setSelectedMember(member); setShowDetail(true); };
  const closeDetail = () => { setShowDetail(false); setSelectedMember(null); };
  const handleDelete = (member) => { Alert.alert('Remove Family Member', `Are you sure you want to remove ${member.first_name} ${member.last_name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: async () => { const token = await getToken(); if (!token) return; const result = await removeFamilyMember(token, member.id); if (result.data && result.data.success) { Alert.alert('Removed', result.data.message); closeDetail(); loadMembers(false); } else { Alert.alert('Error', result.error || 'Could not remove member.'); } } }]); };
  const handleInvite = async (member) => { setInviting(true); const token = await getToken(); if (!token) { setInviting(false); return; } const result = await inviteFamilyMember(token, member.id); setInviting(false); if (result.data && result.data.success) { Alert.alert('Sent!', result.data.message); loadMembers(false); const updated = await getFamilyMembers(token); if (updated.data && updated.data.success) { const refreshed = updated.data.members.find(m => m.id === member.id); if (refreshed) setSelectedMember(refreshed); } } else { Alert.alert('Error', result.error || 'Could not send invitation.'); } };
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
        {nonSelfMembers.length === 0 ? (<View style={styles.emptyState}><Text style={styles.emptyIcon}>🌳</Text><Text style={styles.emptyTitle}>Start your family tree</Text><Text style={styles.emptyDesc}>Add family members to build a living tree that grows as your family joins.</Text><TouchableOpacity style={styles.addBtn} activeOpacity={0.7} onPress={openAddForm}><Text style={styles.addBtnText}>+ Add Family Member</Text></TouchableOpacity></View>) : (<View>{nonSelfMembers.map((member) => { const badge = getStatusBadge(member.status); return (<TouchableOpacity key={member.id} style={styles.card} activeOpacity={0.7} onPress={() => openDetail(member)}>{member.photo ? (<Image source={{ uri: member.photo }} style={styles.photo} />) : (<View style={styles.initialsCircle}><Text style={styles.initialsText}>{getInitials(member.first_name, member.last_name)}</Text></View>)}<View style={styles.cardInfo}><Text style={styles.cardName}>{member.first_name} {member.last_name}</Text><Text style={styles.cardRelationship}>{member.relationship}</Text>{member.is_deceased && <Text style={styles.deceasedLabel}>✝ Memorial</Text>}</View><View style={[styles.badge, { backgroundColor: badge.bg }]}><Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text></View></TouchableOpacity>); })}{meta && meta.can_add && (<TouchableOpacity style={styles.addBtnBottom} activeOpacity={0.7} onPress={openAddForm}><Text style={styles.addBtnBottomText}>+ Add Family Member</Text></TouchableOpacity>)}</View>)}
        <View style={{ height: 40 }} />
      </ScrollView>
      <Modal visible={showTree} animationType="slide" presentationStyle="fullScreen"><View style={{ flex: 1, backgroundColor: '#FAF8F5' }}><View style={styles.treeHeader}><TouchableOpacity onPress={() => setShowTree(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.treeHeaderBack}>← Back</Text></TouchableOpacity><Text style={styles.treeHeaderTitle}>Family Tree</Text><View style={{ width: 50 }} /></View>{treeToken ? (<WebView source={{ html: buildTreeHTML(treeToken) }} style={{ flex: 1, backgroundColor: '#FAF8F5' }} originWhitelist={['*']} javaScriptEnabled={true} domStorageEnabled={true} startInLoadingState={true} renderLoading={() => (<View style={styles.webviewLoading}><ActivityIndicator size="large" color="#2C5F7B" /></View>)} />) : null}</View></Modal>
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet"><View style={styles.modalContainer}><View style={styles.modalHeader}><TouchableOpacity onPress={closeDetail} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.modalCancel}>Close</Text></TouchableOpacity><Text style={styles.modalTitle}>Member Details</Text><View style={{ width: 50 }} /></View>{selectedMember && (<ScrollView style={styles.formScroll}><View style={styles.detailProfileSection}>{selectedMember.photo ? (<Image source={{ uri: selectedMember.photo }} style={styles.detailPhoto} />) : (<View style={styles.detailInitialsCircle}><Text style={styles.detailInitialsText}>{getInitials(selectedMember.first_name, selectedMember.last_name)}</Text></View>)}<Text style={styles.detailName}>{selectedMember.first_name} {selectedMember.last_name}</Text><Text style={styles.detailRelationship}>{selectedMember.relationship}</Text>{(() => { const badge = getStatusBadge(selectedMember.status); return (<View style={[styles.detailBadge, { backgroundColor: badge.bg }]}><Text style={[styles.detailBadgeText, { color: badge.color }]}>{badge.label}</Text></View>); })()}{selectedMember.is_deceased && <Text style={styles.detailDeceased}>✝ Memorial</Text>}</View><View style={styles.detailCard}>{selectedMember.email && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Email</Text><Text style={styles.detailValue}>{selectedMember.email}</Text></View>)}{selectedMember.birth_date && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Born</Text><Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.birth_date)}</Text></View>)}{selectedMember.is_deceased && selectedMember.death_date && (<View style={styles.detailRow}><Text style={styles.detailLabel}>Passed</Text><Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.death_date)}</Text></View>)}{selectedMember.created_at && (<View style={[styles.detailRow, { borderBottomWidth: 0 }]}><Text style={styles.detailLabel}>Added</Text><Text style={styles.detailValue}>{formatDateForDisplay(selectedMember.created_at?.split(' ')[0])}</Text></View>)}</View><View style={styles.detailActions}><TouchableOpacity style={styles.actionBtn} onPress={() => openEditForm(selectedMember)} activeOpacity={0.7}><Text style={styles.actionBtnText}>✏️  Edit Details</Text></TouchableOpacity>{selectedMember.email && selectedMember.status !== 'registered' && (<TouchableOpacity style={[styles.actionBtn, styles.actionBtnGold]} onPress={() => handleInvite(selectedMember)} disabled={inviting} activeOpacity={0.7}><Text style={styles.actionBtnGoldText}>{inviting ? 'Sending...' : selectedMember.invitation_sent ? '📧  Resend Invitation' : '📧  Send Invitation'}</Text></TouchableOpacity>)}<TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(selectedMember)} activeOpacity={0.7}><Text style={styles.actionBtnDangerText}>🗑  Remove</Text></TouchableOpacity></View><View style={{ height: 40 }} /></ScrollView>)}</View></Modal>
      <Modal visible={showAddForm} animationType="slide" presentationStyle="pageSheet"><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.modalContainer}><View style={styles.modalHeader}><TouchableOpacity onPress={closeAddForm} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={styles.modalCancel}>Cancel</Text></TouchableOpacity><Text style={styles.modalTitle}>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</Text><TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}><Text style={[styles.modalSave, saving && { opacity: 0.4 }]}>{saving ? 'Saving...' : 'Save'}</Text></TouchableOpacity></View><ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled"><Text style={styles.fieldLabel}>First Name *</Text><TextInput style={styles.textInput} placeholder="First name" placeholderTextColor="#B2BEC3" value={formData.first_name} onChangeText={(val) => setFormData(prev => ({ ...prev, first_name: val }))} autoCapitalize="words" returnKeyType="next" /><Text style={styles.fieldLabel}>Last Name</Text><TextInput style={styles.textInput} placeholder="Last name" placeholderTextColor="#B2BEC3" value={formData.last_name} onChangeText={(val) => setFormData(prev => ({ ...prev, last_name: val }))} autoCapitalize="words" returnKeyType="next" /><Text style={styles.fieldLabel}>Relationship *</Text><TouchableOpacity style={styles.pickerBtn} onPress={() => setShowRelPicker(true)} activeOpacity={0.7}><Text style={[styles.pickerBtnText, !formData.relationship_to_user && { color: '#B2BEC3' }]}>{getRelationshipLabel(formData.relationship_to_user)}</Text><Text style={styles.pickerArrow}>▼</Text></TouchableOpacity><Text style={styles.fieldLabel}>Email (optional)</Text><Text style={styles.fieldHint}>Add email to send an invitation to join</Text><TextInput style={styles.textInput} placeholder="email@example.com" placeholderTextColor="#B2BEC3" value={formData.email} onChangeText={(val) => setFormData(prev => ({ ...prev, email: val }))} keyboardType="email-address" autoCapitalize="none" returnKeyType="next" /><Text style={styles.fieldLabel}>Birth Date (optional)</Text><TouchableOpacity style={styles.pickerBtn} onPress={() => setShowBirthPicker(true)} activeOpacity={0.7}><Text style={[styles.pickerBtnText, !formData.birth_date && { color: '#B2BEC3' }]}>{formData.birth_date ? formatDateForDisplay(formData.birth_date) : 'Select date...'}</Text><Text style={styles.pickerArrow}>📅</Text></TouchableOpacity>{showBirthPicker && Platform.OS === 'ios' && (<View style={styles.datePickerContainer}><DateTimePicker value={tempBirthDate} mode="date" display="spinner" onChange={onBirthDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} style={{ height: 150 }} /><View style={styles.datePickerActions}><TouchableOpacity onPress={clearBirthDate} style={styles.datePickerClear}><Text style={styles.datePickerClearText}>Clear</Text></TouchableOpacity><TouchableOpacity onPress={confirmBirthDate} style={styles.datePickerConfirm}><Text style={styles.datePickerConfirmText}>Done</Text></TouchableOpacity></View></View>)}{showBirthPicker && Platform.OS === 'android' && (<DateTimePicker value={tempBirthDate} mode="date" display="default" onChange={onBirthDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} />)}<TouchableOpacity style={styles.toggleRow} onPress={() => setFormData(prev => ({ ...prev, is_deceased: !prev.is_deceased, death_date: '' }))} activeOpacity={0.7}><View style={[styles.toggleBox, formData.is_deceased && styles.toggleBoxOn]}>{formData.is_deceased && <Text style={styles.toggleCheck}>✓</Text>}</View><Text style={styles.toggleLabel}>This person is deceased</Text></TouchableOpacity>{formData.is_deceased && (<><Text style={styles.fieldLabel}>Death Date (optional)</Text><TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDeathPicker(true)} activeOpacity={0.7}><Text style={[styles.pickerBtnText, !formData.death_date && { color: '#B2BEC3' }]}>{formData.death_date ? formatDateForDisplay(formData.death_date) : 'Select date...'}</Text><Text style={styles.pickerArrow}>📅</Text></TouchableOpacity>{showDeathPicker && Platform.OS === 'ios' && (<View style={styles.datePickerContainer}><DateTimePicker value={tempDeathDate} mode="date" display="spinner" onChange={onDeathDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} style={{ height: 150 }} /><View style={styles.datePickerActions}><TouchableOpacity onPress={clearDeathDate} style={styles.datePickerClear}><Text style={styles.datePickerClearText}>Clear</Text></TouchableOpacity><TouchableOpacity onPress={confirmDeathDate} style={styles.datePickerConfirm}><Text style={styles.datePickerConfirmText}>Done</Text></TouchableOpacity></View></View>)}{showDeathPicker && Platform.OS === 'android' && (<DateTimePicker value={tempDeathDate} mode="date" display="default" onChange={onDeathDateChange} maximumDate={new Date()} minimumDate={new Date(1900, 0, 1)} />)}</>)}<View style={{ height: 40 }} /></ScrollView></View></KeyboardAvoidingView><Modal visible={showRelPicker} animationType="fade" transparent><TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowRelPicker(false)}><View style={styles.pickerSheet}><Text style={styles.pickerSheetTitle}>Select Relationship</Text><ScrollView style={{ maxHeight: 400 }}>{RELATIONSHIP_OPTIONS.filter(o => o.value !== '').map((opt) => (<TouchableOpacity key={opt.value} style={[styles.pickerOption, formData.relationship_to_user === opt.value && styles.pickerOptionSelected]} onPress={() => { setFormData(prev => ({ ...prev, relationship_to_user: opt.value })); setShowRelPicker(false); }} activeOpacity={0.7}><Text style={[styles.pickerOptionText, formData.relationship_to_user === opt.value && styles.pickerOptionTextSelected]}>{opt.label}</Text>{formData.relationship_to_user === opt.value && <Text style={styles.pickerCheck}>✓</Text>}</TouchableOpacity>))}</ScrollView></View></TouchableOpacity></Modal></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#FAF8F5'},loadingContainer:{flex:1,backgroundColor:'#FAF8F5',justifyContent:'center',alignItems:'center'},loadingText:{marginTop:12,color:'#636E72',fontSize:14},
  header:{padding:20,paddingBottom:12},headerTitle:{fontSize:24,fontWeight:'700',color:'#2D3436'},headerSubtitle:{fontSize:14,color:'#636E72',marginTop:4},
  viewTreeBtn:{backgroundColor:'#2C5F7B',borderRadius:12,padding:14,alignItems:'center',marginHorizontal:16,marginBottom:12},viewTreeText:{color:'#FFF',fontSize:15,fontWeight:'700'},
  tierBar:{marginHorizontal:16,marginBottom:16,backgroundColor:'#FFF',borderRadius:10,padding:12,shadowColor:'#000',shadowOpacity:.05,shadowRadius:4,shadowOffset:{width:0,height:2},elevation:2},tierText:{fontSize:12,color:'#636E72',marginBottom:6},tierProgress:{height:6,backgroundColor:'#E8E8E8',borderRadius:3,overflow:'hidden'},tierFill:{height:'100%',backgroundColor:'#2C5F7B',borderRadius:3},
  emptyState:{alignItems:'center',paddingVertical:40,paddingHorizontal:20},emptyIcon:{fontSize:48,marginBottom:12},emptyTitle:{fontSize:18,fontWeight:'700',color:'#2D3436',marginBottom:6},emptyDesc:{fontSize:14,color:'#636E72',textAlign:'center',lineHeight:20,marginBottom:20},
  addBtn:{backgroundColor:'#D4A574',borderRadius:10,paddingHorizontal:24,paddingVertical:14},addBtnText:{color:'#FFF',fontSize:15,fontWeight:'700'},
  card:{flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',marginHorizontal:16,marginBottom:10,borderRadius:12,padding:14,shadowColor:'#000',shadowOpacity:.05,shadowRadius:4,shadowOffset:{width:0,height:2},elevation:2},
  photo:{width:50,height:50,borderRadius:25,marginRight:12},initialsCircle:{width:50,height:50,borderRadius:25,backgroundColor:'#2C5F7B',justifyContent:'center',alignItems:'center',marginRight:12},initialsText:{color:'#FFF',fontSize:18,fontWeight:'700'},
  cardInfo:{flex:1},cardName:{fontSize:16,fontWeight:'600',color:'#2D3436'},cardRelationship:{fontSize:13,color:'#636E72',marginTop:2},deceasedLabel:{fontSize:11,color:'#9A9A9A',marginTop:2},
  badge:{paddingHorizontal:10,paddingVertical:4,borderRadius:12},badgeText:{fontSize:11,fontWeight:'600'},
  addBtnBottom:{marginHorizontal:16,marginTop:6,backgroundColor:'#D4A574',borderRadius:12,padding:14,alignItems:'center'},addBtnBottomText:{color:'#FFF',fontSize:15,fontWeight:'700'},
  treeHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:Platform.OS==='ios'?60:20,paddingHorizontal:16,paddingBottom:14,backgroundColor:'#2C5F7B'},treeHeaderBack:{color:'#FFF',fontSize:15},treeHeaderTitle:{color:'#FFF',fontSize:17,fontWeight:'700'},
  webviewLoading:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'center',alignItems:'center',backgroundColor:'#FAF8F5'},
  modalContainer:{flex:1,backgroundColor:'#FAF8F5'},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:Platform.OS==='ios'?60:20,paddingHorizontal:16,paddingBottom:14,backgroundColor:'#2C5F7B'},
  modalCancel:{color:'#FFF',fontSize:15},modalTitle:{color:'#FFF',fontSize:17,fontWeight:'700'},modalSave:{color:'#D4A574',fontSize:15,fontWeight:'700'},formScroll:{flex:1,padding:16},
  detailProfileSection:{alignItems:'center',paddingVertical:24},detailPhoto:{width:90,height:90,borderRadius:45,marginBottom:12},detailInitialsCircle:{width:90,height:90,borderRadius:45,backgroundColor:'#2C5F7B',justifyContent:'center',alignItems:'center',marginBottom:12},detailInitialsText:{color:'#FFF',fontSize:32,fontWeight:'700'},
  detailName:{fontSize:22,fontWeight:'700',color:'#2D3436'},detailRelationship:{fontSize:15,color:'#636E72',marginTop:4},detailBadge:{marginTop:8,paddingHorizontal:14,paddingVertical:5,borderRadius:14},detailBadgeText:{fontSize:13,fontWeight:'600'},detailDeceased:{fontSize:13,color:'#9A9A9A',marginTop:6},
  detailCard:{backgroundColor:'#FFF',borderRadius:12,marginBottom:16,shadowColor:'#000',shadowOpacity:.05,shadowRadius:4,shadowOffset:{width:0,height:2},elevation:2},detailRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14,paddingHorizontal:16,borderBottomWidth:.5,borderBottomColor:'#E8E5DE'},detailLabel:{fontSize:14,color:'#636E72'},detailValue:{fontSize:14,fontWeight:'600',color:'#2D3436',textAlign:'right',flex:1,marginLeft:16},
  detailActions:{gap:10},actionBtn:{backgroundColor:'#FFF',borderRadius:12,padding:16,alignItems:'center',borderWidth:1,borderColor:'#E8E5DE'},actionBtnText:{fontSize:15,fontWeight:'600',color:'#2C5F7B'},actionBtnGold:{backgroundColor:'#FDF3EB',borderColor:'#D4A574'},actionBtnGoldText:{fontSize:15,fontWeight:'600',color:'#D4A574'},actionBtnDanger:{backgroundColor:'#FFF5F5',borderColor:'#E74C3C'},actionBtnDangerText:{fontSize:15,fontWeight:'600',color:'#E74C3C'},
  fieldLabel:{fontSize:14,fontWeight:'600',color:'#2D3436',marginTop:16,marginBottom:6},fieldHint:{fontSize:12,color:'#636E72',marginBottom:6,marginTop:-2},
  textInput:{backgroundColor:'#FFF',borderRadius:10,padding:14,fontSize:15,color:'#2D3436',borderWidth:1,borderColor:'#E8E5DE'},
  pickerBtn:{backgroundColor:'#FFF',borderRadius:10,padding:14,borderWidth:1,borderColor:'#E8E5DE',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},pickerBtnText:{fontSize:15,color:'#2D3436'},pickerArrow:{fontSize:12,color:'#636E72'},
  pickerOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'},pickerSheet:{backgroundColor:'#FFF',borderTopLeftRadius:20,borderTopRightRadius:20,paddingTop:20,paddingBottom:40,paddingHorizontal:16},pickerSheetTitle:{fontSize:18,fontWeight:'700',color:'#2D3436',textAlign:'center',marginBottom:16},
  pickerOption:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:14,paddingHorizontal:12,borderBottomWidth:.5,borderBottomColor:'#E8E5DE'},pickerOptionSelected:{backgroundColor:'#F0F7FB'},pickerOptionText:{fontSize:16,color:'#2D3436'},pickerOptionTextSelected:{color:'#2C5F7B',fontWeight:'600'},pickerCheck:{fontSize:16,color:'#2C5F7B',fontWeight:'700'},
  toggleRow:{flexDirection:'row',alignItems:'center',marginTop:20,marginBottom:4},toggleBox:{width:24,height:24,borderRadius:6,borderWidth:2,borderColor:'#D0D0D0',justifyContent:'center',alignItems:'center',marginRight:10},toggleBoxOn:{backgroundColor:'#2C5F7B',borderColor:'#2C5F7B'},toggleCheck:{color:'#FFF',fontSize:14,fontWeight:'700'},toggleLabel:{fontSize:14,color:'#2D3436'},
  datePickerContainer:{backgroundColor:'#FFF',borderRadius:10,marginTop:8,borderWidth:1,borderColor:'#E8E5DE',overflow:'hidden'},datePickerActions:{flexDirection:'row',justifyContent:'space-between',borderTopWidth:.5,borderTopColor:'#E8E5DE',padding:10},datePickerClear:{paddingVertical:6,paddingHorizontal:16},datePickerClearText:{color:'#636E72',fontSize:15},datePickerConfirm:{paddingVertical:6,paddingHorizontal:16,backgroundColor:'#2C5F7B',borderRadius:8},datePickerConfirmText:{color:'#FFF',fontSize:15,fontWeight:'600'},
});