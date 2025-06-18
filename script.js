/*===== ① Firebase 設定を貼る =====*/
const firebaseConfig = {
  apiKey            : "AIzaSyDN9A-Vp7QfP9JOeHOqB845CmjTb4HS3tQ",
  authDomain        : "cclemononline.firebaseapp.com",
  databaseURL       : "https://cclemononline-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId         : "cclemononline",
  storageBucket     : "cclemononline.appspot.com",
  messagingSenderId : "954777678519",
  appId             : "1:954777678519:web:43643a836ba0eff0771332"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/*===== ② ゲーム共通状態 =====*/
let pEn=0,aEn=0,pSh=5,aSh=5,inputLocked=false,mode="PvE";
let loseStreak=0;                     // PvE 用
const traj=[];                        // 1ゲーム内 AI 学習ログ
let gameLog = [];                     // 対戦ログ用配列
const moveNameMap = {a:'攻撃',b:'防御',c:'溜め',k:'かめはめ波'}; // 技名マップ
const qTable=JSON.parse(localStorage.getItem("qTable")||"{}");

/*===== ③ DOM =====*/
const $=id=>document.getElementById(id);
const pEnE=$("pEn"),aEnE=$("aEn"),pShE=$("pSh"),aShE=$("aSh"),
      btnC=$("btnC"),btnB=$("btnB"),btnA=$("btnA"),btnK=$("btnK"),
      cutin=$("cutin"),result=$("result"),
      allBtns=[btnC,btnB,btnA,btnK],
      gameLogListE = $("gameLogList"), // ログ表示用UL要素
      btnPvE=$("btnPvE"),btnPvP=$("btnPvP"),onlinePanel=$("onlinePanel"), // gameLogListE を適切な位置に移動
      btnCreate=$("btnCreate"),btnJoin=$("btnJoin"),roomIdDisp=$("roomIdDisp"),
      joinId=$("joinId"),onlineMsg=$("onlineMsg"),opName=$("opName");

/*===== ④ UI helpers =====*/
function showUI(){
  pEnE.textContent=pEn; aEnE.textContent=aEn;
  pShE.textContent=pSh; aShE.textContent=aSh;
  btnK.style.display = pEn>=3 ? 'inline-block': 'none';
}
function lock(){inputLocked=true;allBtns.forEach(b=>b.classList.add('disabled'));}
function unlock(){inputLocked=false;allBtns.forEach(b=>b.classList.remove('disabled'));}
function flash(txt,cb){lock();cutin.textContent=txt;cutin.style.display='block';
  // flashが表示される直前にログが更新されるようにする
  setTimeout(()=>{cutin.style.display='none';unlock();cb&&cb();},850);}
function stateKey(){return `${pEn}_${aEn}`;}

/*===== ログ表示関連 =====*/
function addLogEntry(playerMoveKey, opponentMoveKey) {
  const playerAction = moveNameMap[playerMoveKey] || playerMoveKey;
  const opponentAction = moveNameMap[opponentMoveKey] || opponentMoveKey;
  gameLog.push({ playerAction, opponentAction });
  updateGameLogView();
}
function updateGameLogView() {
  gameLogListE.innerHTML = ''; // 既存のログをクリア
  gameLog.forEach(entry => {
    const listItem = document.createElement('li');
    listItem.textContent = `あなた: ${entry.playerAction} vs ${opName.textContent}: ${entry.opponentAction}`;
    gameLogListE.appendChild(listItem);
  });
}

/*===== ⑤ AI (PvE) =====*/
const acts=['a','b','c'];
function bestActionFromQ(){
  const st=qTable[stateKey()]; if(!st) return null;
  let best=null,bv=-1e9; for(const act of acts){const e=st[act]; if(e&&e.v>bv){bv=e.v;best=act;}}
  return best;
}
function randomValid(){
  const pool=[]; if(aEn>0)pool.push('a'); if(aSh>0)pool.push('b'); pool.push('c');
  return pool[Math.floor(Math.random()*pool.length)];
}
function aiStrategy(){
  // 固定
  if(aEn>=3 && pEn<=2) return 'k';
  if(pEn===0 && aEn===0) return 'c';
  // ε-greedy
  const st=stateKey(), tb=qTable[st], visits=tb?Object.values(tb).reduce((s,e)=>s+e.c,0):0;
  const best=bestActionFromQ(), bestV=best&&tb?tb[best].v:0;
  let eps=visits<5?0.4:visits<20?0.2:0.05;
  if(loseStreak>=3) eps=0.8; else if(bestV<0) eps=Math.min(1,eps+0.3);
  if(Math.random()<eps) return randomValid();
  if(best && !((best==='a'&&aEn===0)||(best==='b'&&aSh===0))) return best;
  if(Math.random()<0.5) return randomValid();
  // 簡易ヒューリスティック
  if(pEn===1) return aSh>0?'b':'a';
  if(pEn===2) return aEn>0?'a':'b';
  if(pEn>=3)  return aSh>0?'b':(aEn>0?'a':'c');
  return 'c';
}

/*===== ⑥ Q 学習更新 =====*/
function updateQ(reward){
  traj.forEach(({s,a})=>{
    qTable[s]=qTable[s]||{};
    const e=qTable[s][a]||{c:0,v:0};
    e.c++; e.v += (reward-e.v)/e.c; qTable[s][a]=e;
  });
  localStorage.setItem("qTable",JSON.stringify(qTable));
  traj.length=0;
}

/*===== ⑦ Firebase (PvP) =====*/
let roomRef=null,myRole="p1";
function createRoom(){
  const id=Math.random().toString(36).slice(2,7);
  roomRef=db.ref('rooms/'+id);
  roomRef.set({p1:{en:0,sh:5,move:null},p2:{en:0,sh:5,move:null}});
  roomRef.onDisconnect().remove();
  myRole='p1'; roomIdDisp.textContent=id; onlineMsg.textContent='相手待ち…';
  listenRoom();
}
function joinRoom(id){
  roomRef=db.ref('rooms/'+id);
  roomRef.get().then(s=>{
    if(!s.exists()){onlineMsg.textContent='ID 不存在'; return;}
    myRole='p2'; roomIdDisp.textContent=id; onlineMsg.textContent='参加！待機中…';
    listenRoom();
  });
}
function listenRoom(){
  roomRef.on('value',snap=>{
    const d=snap.val(); if(!d) return;
    const me=d[myRole],op=d[myRole==='p1'?'p2':'p1'];
    if(me&&op){pEn=me.en; pSh=me.sh; aEn=op.en; aSh=op.sh; showUI();}
    if(me.move&&op.move){
      // 判定
      roomRef.child('p1/move').set(null);
      roomRef.child('p2/move').set(null);
      processMoves(me.move,op.move,true);
      // 資源同期
      roomRef.update({
        [`p1/en`]:pEn, [`p1/sh`]:pSh,
        [`p2/en`]:aEn, [`p2/sh`]:aSh
      });
    }
  });
}
function sendMove(mv){
  roomRef.child(myRole).update({move:mv,en:pEn,sh:pSh});
}

/*===== ⑧ 判定 =====*/
function resolve(pm,am){
  if(pm==='k'&&am==='k'){
    addLogEntry('k', 'k');
    pEn-=3;aEn-=3;flash('K 同士！EN-3',reset);return true;
  }
  if(pm==='k'&&am!=='k'){
    addLogEntry('k', am);
    flash('あなた K 勝利！',reset);return true;
  }
  if(am==='k'&&pm!=='k'){
    addLogEntry(pm, 'k');
    flash((mode==='PvE'?'AI':'相手')+' K 勝利！',reset);return true;
  }
  if(pm==='a'&&am==='c'){
    addLogEntry('a', 'c');
    flash('あなた勝利！',reset);return true;
  }
  if(pm==='c'&&am==='a'){
    addLogEntry('c', 'a');
    flash((mode==='PvE'?'AI':'相手')+' 勝利！',reset);return true;
  }
  return false;
}

/*===== ⑨ ターン処理 =====*/
function processMoves(pMove,aMove,isOnline){
  if(pMove==='c')pEn++; if(aMove==='c')aEn++;
  if(pMove==='a')pEn--; if(aMove==='a')aEn--;
  if(pMove==='k')pEn-=3;if(aMove==='k')aEn-=3;
  if(pMove==='b')pSh--; if(aMove==='b')aSh--;
  if(pMove==='b'&&aMove==='a')pEn++;
  if(aMove==='b'&&pMove==='a')aEn++;

  // resolve で勝敗が決まった場合は、resolve内でログが記録され、ここで早期リターンする
  if(resolve(pMove,aMove)) return;
  // resolve で勝敗が決まらなかった場合のみ、ここでログを記録
  addLogEntry(pMove, aMove);
  flash(`あなた:${moveNameMap[pMove]}／${mode==='PvE'?'AI':'相手'}:${moveNameMap[aMove]}`);
  showUI();
}

function turn(mv){
  if(inputLocked) return;
  if(mv==='a'&&pEn===0){result.textContent='EN不足';return;}
  if(mv==='k'&&pEn<3){result.textContent='EN不足';return;}
  if(mv==='b'&&pSh===0){result.textContent='SH不足';return;}
  result.textContent='';

  if(mode==='PvE'){
    const aMove=aiStrategy();
    if(aMove!=='k') traj.push({s:stateKey(),a:aMove});
    // resolve で勝敗が決まる場合、resolve内でログが記録される
    if(resolve(mv,aMove)){
      if(aMove==='k')loseStreak++;else loseStreak=0;
      return;}
    processMoves(mv,aMove,false);
  }else{
    sendMove(mv);
    flash('選択済 ? 相手待ち…');
  }
}

/*===== ⑩ 便利 =====*/
function reset(){
  pEn=aEn=0; pSh=aSh=5;
  gameLog = []; // ログをクリア
  updateGameLogView(); // ログ表示をクリア
  showUI(); result.textContent='';
  traj.length=0; // AI学習ログもリセット
}

/*===== ⑪ UI ボタン =====*/
btnC.onclick=()=>turn('c');
btnB.onclick=()=>turn('b');
btnA.onclick=()=>turn('a');
btnK.onclick=()=>turn('k');

btnPvE.onclick=()=>{
  mode='PvE'; onlinePanel.style.display='none'; opName.textContent='AI';
  if(roomRef){roomRef.off(); roomRef=null;}
  reset();
};
btnPvP.onclick=()=>{
  mode='PvP'; onlinePanel.style.display='block'; opName.textContent='相手';
  reset();
};
btnCreate.onclick=createRoom;
btnJoin.onclick=()=>joinRoom(joinId.value.trim());

/*===== ⑫ スタート =====*/
reset();
