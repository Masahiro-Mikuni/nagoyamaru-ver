/*===== 1. Firebase 設定 (貼り付け箇所) =====*/
// Firebaseプロジェクトの設定情報
const firebaseConfig = {
  apiKey            : "AIzaSyDN9A-Vp7QfP9JOeHOqB845CmjTb4HS3tQ", // Firebase APIキー
  authDomain        : "cclemononline.firebaseapp.com",          // Firebase認証ドメイン
  databaseURL       : "https://cclemononline-default-rtdb.asia-southeast1.firebasedatabase.app", // Firebase Realtime Database URL
  projectId         : "cclemononline",                          // FirebaseプロジェクトID
  storageBucket     : "cclemononline.appspot.com",              // Firebase Storageバケット
  messagingSenderId : "954777678519",                          // FirebaseメッセージングセンダーID
  appId             : "1:954777678519:web:43643a836ba0eff0771332" // Firebase App ID
};
firebase.initializeApp(firebaseConfig); // Firebaseアプリを初期化
const db = firebase.database(); // Firebase Realtime Databaseのインスタンスを取得

/*===== 1. サウンド再生関数 =====*/
// --- ここから音声再生関連 ---
function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0; // 再生位置を先頭に戻す
        sound.play().catch(error => {
            console.error("Audio play failed for " + soundId + ":", error);
        });
    } else {
        console.warn("Sound element not found: " + soundId);
    }
}
// --- ここまで音声再生関連 ---

/*===== 2. 定数定義 =====*/
// ゲームの基本設定値
const PLAYER_INITIAL_SHIELD = 5; // プレイヤーの初期シールド数
const SPECIAL_ACTION_ENERGY_COST = 3;    // Special Actionに必要なエネルギーコスト
const WINS_TO_VICTORY = 2; // マッチ勝利に必要な勝利数

// UI関連の定数
const FLASH_DEFAULT_DURATION_MS = 850;  // flashメッセージのデフォルト表示時間 (ミリ秒) - 行動カットイン用に戻す
const FLASH_WIN_LOSE_DURATION_MS = 2500; // 勝利・敗北メッセージの表示時間 (ミリ秒) - 長くする
const FLASH_PVP_ACTION_DURATION_MS = 1800; // PvPモード時の行動カットイン表示時間 (ミリ秒) - 延長
const RESOLVE_RESET_DELAY_MS = 1000; // 勝敗決定後、ゲームリセットまでの遅延時間 (ミリ秒)

// プレイヤーの行動を表す定数
const MOVE_CHARGE = 'c';        // 行動: 溜め
const MOVE_BLOCK = 'b';         // 行動: 防御
const MOVE_ATTACK = 'a';        // 行動: 攻撃
const MOVE_SPECIAL_ACTION = 's'; // 行動: Special Action (旧かめはめ波)

// キャラクター画像パスの定数
const IMAGE_PATH_NORMAL = 'images/robo_normal.png';
const IMAGE_PATH_ATTACK = 'images/robo_attack.png';
const IMAGE_PATH_GUARD = 'images/robo_guard.png';
const IMAGE_PATH_CHARGE = 'images/robo_charge.png';
const IMAGE_PATH_SPECIAL = 'images/robo_special.png';

// AI Q学習関連の定数
const AI_ACTIONS_FOR_Q_LEARNING = [MOVE_ATTACK, MOVE_BLOCK, MOVE_CHARGE]; // Q学習対象のアクション
const Q_TABLE_LOCAL_STORAGE_KEY = "qLearningTable"; // Qテーブルをローカルストレージに保存する際のキー
const Q_NETWORK_MODEL_PATH = 'localstorage://my-q-network'; // TensorFlow.jsモデルの保存パス
// ゲームモードを表す定数
const GAME_MODE_PVE = "PvE"; // ゲームモード: Player vs AI
const GAME_MODE_PVP = "PvP"; // ゲームモード: Player vs Player
const GAME_MODE_EVE = "EvE"; // ゲームモード: AI vs AI (New)

// Firebase Realtime Database関連の定数 (PvP用)
const FIREBASE_ROOMS_PATH = 'rooms/';       // Firebase上のルームデータが格納されるパス
const PLAYER_ROLE_P1 = 'p1';                // プレイヤー1のロール識別子
const PLAYER_ROLE_P2 = 'p2';                // プレイヤー2のロール識別子
const FIREBASE_KEY_ENERGY = 'en';           // Firebaseデータキー: エネルギー
const FIREBASE_KEY_SHIELD = 'sh';           // Firebaseデータキー: シールド
const FIREBASE_KEY_MOVE = 'move';           // Firebaseデータキー: 行動
const FIREBASE_KEY_NAME = 'name';           // Firebaseデータキー: プレイヤー名 (New)

// UIメッセージ定数
const UI_MSG_CHOOSE_ACTION = '行動を選択してください';         // 行動選択を促すメッセージ
const UI_MSG_WAITING_OPPONENT = 'あなたの手を選択済。相手の選択を待っています…'; // 対戦相手の行動待ちメッセージ
const UI_MSG_MATCH_READY_CHOOSE_ACTION = 'マッチング成立！行動を選択してください。'; // PvPマッチ成立時のメッセージ (New)
const UI_MSG_SHARE_ROOM_ID_P1 = '相手にルームIDを伝えてください。相手の参加を待っています…'; // P1がルーム作成後、P2参加待ち (New)
const UI_MSG_ROOM_ID_NOT_FOUND = 'ID 不存在';             // ルームIDが見つからない場合のメッセージ
const UI_MSG_INSUFFICIENT_ENERGY = 'EN不足';              // エネルギー不足時のメッセージ
const UI_MSG_INSUFFICIENT_SHIELD = 'SH不足';              // シールド不足時のメッセージ
const UI_MSG_AI_OPPONENT_NAME = 'AI';                     // AI対戦相手の表示名
const UI_MSG_PLAYER_OPPONENT_NAME = '相手';                 // PvP対戦相手の表示名
const UI_MSG_EVE_OPPONENT_NAME = 'AI 1 vs AI 2';      // EvEモード時の対戦相手表示名 (New)
const UI_MSG_EVE_MODE_ACTIVE = 'AI 対戦中...';        // EvEモード実行中のメッセージ (New)

// AI ε-greedy (イプシロン・グリーディ) 法のパラメータ
const EPSILON_VISIT_THRESHOLD_1 = 5;    // ε値を変更する状態訪問回数の閾値1
const EPSILON_VISIT_THRESHOLD_2 = 20;   // ε値を変更する状態訪問回数の閾値2
const EPSILON_INITIAL = 0.4;            // 初期ε値 (探索の割合が高い)
const EPSILON_INTERMEDIATE = 0.2;       // 中間ε値
const EPSILON_LOW = 0.05;               // 低ε値 (活用が多くなる)
const EPSILON_ON_LOSE_STREAK = 0.8;     // AI連敗時のε値 (探索を増やして打開を図る)
const EPSILON_INCREASE_ON_NEGATIVE_VALUE = 0.3; // Q値が負の場合にε値に加算する値 (より探索的に)
const AI_RANDOM_CHOICE_PROBABILITY = 0.5; // ε-greedyで最善手がない場合や、特定条件下でランダム行動を選択する確率
const EXPLORE_EVEN_WITH_Q_PROBABILITY = 0.1; // Q学習で最善手があっても、この確率でランダム行動する (学習停滞防止用)

// EvE モード関連の定数 (New)
const EVE_TURN_DELAY_MS = 1000; // EvEモードのターン間遅延 (ミリ秒) - 500から変更

/*===== 3. ゲーム共通状態 =====*/
// ゲーム中に変動するプレイヤーと相手の状態
let playerEnergy = 0, opponentEnergy = 0; // プレイヤーと相手の現在のエネルギー
let playerShield = PLAYER_INITIAL_SHIELD, opponentShield = PLAYER_INITIAL_SHIELD; // プレイヤーと相手の現在のシールド
let isInputLocked = false; // プレイヤーの入力がロックされているか (true:ロック中, false:入力可能)
let currentGameMode = GAME_MODE_PVE; // 現在のゲームモード (初期値はPvE)
let pveLoseStreak = 0; // PvEモードでのAIの連敗数 (AIの戦略調整用)
let currentTurnNumber = 0; // 現在のターン数を記録
const qLearningTrajectory = []; // 1ゲーム内のAIの行動と状態の履歴 (Q学習用)
let player1Wins = 0; // プレイヤー1 (あなた or AI1) の勝利数
let player2Wins = 0; // プレイヤー2 (AI or AI2) の勝利数
let myPlayerName = "Player"; // 自分のプレイヤー名 (PvP用) (New)
let opponentPlayerName = "Opponent"; // 相手のプレイヤー名 (PvP用) (New)
// const qLearningTable = JSON.parse(localStorage.getItem(Q_TABLE_LOCAL_STORAGE_KEY) || "{}"); // Q学習テーブル (TensorFlow.jsモデルに置き換え)
let isEveGameRunning = false; // EvEモードのゲームが実行中かどうかのフラグ (New)

/*===== 3a. TensorFlow.js 関連のグローバル変数 =====*/
let qNetwork; // TensorFlow.js Qネットワークモデル
const TF_LEARNING_RATE = 0.001; // 学習率
const TF_DISCOUNT_FACTOR = 0.95; // 割引ガンマ因子
const TF_STATE_SIZE = 4; // 状態ベクトルのサイズ [selfEn, selfSh, oppEn, oppSh]
const TF_NUM_ACTIONS = AI_ACTIONS_FOR_Q_LEARNING.length; // ネットワークが出力する行動の数
let modelLoaded = false; // モデルがロードされたかどうかのフラグ

/*===== 4. DOM要素 =====*/
// HTML要素への参照をキャッシュ
const $=id=>document.getElementById(id); // document.getElementByIdのショートハンド
const playerEnergyElement = $("pEn"), opponentEnergyElement = $("aEn"); // エネルギー表示要素
const playerShieldElement = $("pSh"), opponentShieldElement = $("aSh"); // シールド表示要素
const chargeButtonElement = $("btnC"), blockButtonElement = $("btnB");        // 行動ボタン要素 (溜め、防御)
const attackButtonElement = $("btnA"), specialActionButtonElement = $("btnS"); // 行動ボタン要素 (攻撃、Special Action)
const cutinElement = $("cutin"), resultMessageElement = $("result");     // カットイン表示要素、結果メッセージ表示要素
const allActionButtons = [chargeButtonElement, blockButtonElement, attackButtonElement, specialActionButtonElement]; // プレイヤーの行動ボタンの配列
const pveModeButtonElement = $("btnPvE"), pvpModeButtonElement = $("btnPvP"), eveModeButtonElement = $("btnEvE"); // モード選択ボタン要素 (btnEvE を追加)
const onlinePanelElement = $("onlinePanel"); // PvP用オンラインパネル要素
const createRoomButtonElement = $("btnCreate"), joinRoomButtonElement = $("btnJoin"); // ルーム作成/参加ボタン要素
const roomIdDisplayElement = $("roomIdDisp"); // ルームID表示要素
const joinRoomIdInputElement = $("joinId"), onlineMessageElement = $("onlineMsg"); // ルームID入力要素、オンラインメッセージ表示要素
const player1NameDisplayElement = $("p1Name"); // プレイヤー1名表示要素 (旧opNameの役割も含む)
const player2NameDisplayElement = $("p2Name"); // プレイヤー2名表示要素
const turnHistoryLogElement = $("turnHistoryLog"); // 新しい行動履歴ログ要素
const player1WinsElement = $("p1Wins"); // プレイヤー1勝利数表示要素
const player2WinsElement = $("p2Wins"); // プレイヤー2勝利数表示要素
const aiReflectionLogElement = $("aiReflectionLog"); // AI考察ログ要素
const playerNameInputElement = $("playerName"); // プレイヤー名入力要素 (New)
const p1CharacterImageElement = $("p1CharacterImage"); // プレイヤー1キャラクター画像要素
const p2CharacterImageElement = $("p2CharacterImage"); // プレイヤー2キャラクター画像要素


/*===== 5. UIヘルパー関数 =====*/
// UI表示を更新する関数群

/**
 * プレイヤーと相手のエネルギー、シールドをUIに反映し、Special Actionボタンの表示/非表示を切り替える
 */
function showUI(){
  if (currentGameMode === GAME_MODE_EVE) {
    // EvEモード: playerEnergy/Shield は AI1, opponentEnergy/Shield は AI2
    playerEnergyElement.textContent = playerEnergy;   // AI1 Energy (表示はプレイヤー側を流用)
    playerShieldElement.textContent = playerShield;   // AI1 Shield
    opponentEnergyElement.textContent = opponentEnergy; // AI2 Energy (表示は相手側を流用)
    opponentShieldElement.textContent = opponentShield; // AI2 Shield
    player1NameDisplayElement.textContent = "AI 1";
    player1WinsElement.textContent = player1Wins;
    player2NameDisplayElement.textContent = "AI 2";
    player2WinsElement.textContent = player2Wins;
    allActionButtons.forEach(btn => btn.style.display = 'none'); // プレイヤー操作ボタンを非表示
    specialActionButtonElement.style.display = 'none'; // Special Actionボタンも非表示
  } else {
    if (currentGameMode === GAME_MODE_PVP) {
        player1NameDisplayElement.textContent = myPlayerName;
        player2NameDisplayElement.textContent = opponentPlayerName;
    } else { // PvE
        player1NameDisplayElement.textContent = "あなた";
        player2NameDisplayElement.textContent = UI_MSG_AI_OPPONENT_NAME;
    }
    player1WinsElement.textContent = player1Wins;
    player2WinsElement.textContent = player2Wins;
    playerEnergyElement.textContent = playerEnergy; opponentEnergyElement.textContent = opponentEnergy;
    playerShieldElement.textContent = playerShield; opponentShieldElement.textContent = opponentShield;
    allActionButtons.forEach(btn => btn.style.display = 'inline-block'); // プレイヤー操作ボタンを表示
    specialActionButtonElement.style.display = playerEnergy >= SPECIAL_ACTION_ENERGY_COST ? 'inline-block' : 'none';
  }
}
/**
 * プレイヤーの行動ボタンを無効化する
 */
function lockInput() {
  isInputLocked = true;
  allActionButtons.forEach(button => button.classList.add('disabled'));
}
/**
 * プレイヤーの行動ボタンを有効化する
 */
function unlockInput() {
  isInputLocked = false;
  allActionButtons.forEach(button => button.classList.remove('disabled'));
}
/**
 * 画面中央にメッセージを一時的に表示する (カットイン風)
 * @param {string} text 表示するメッセージ
 * @param {number} [duration] 表示時間 (ミリ秒)。指定しない場合はFLASH_DEFAULT_DURATION_MSを使用
 * @param {function} [callback] 表示終了後に実行するコールバック関数
 * @param {boolean} [isMatchEndMessage=false] マッチ終了メッセージかどうか (スタイル変更用)
 */
function flashMessage(text, duration, callback, isMatchEndMessage = false) {
  lockInput(); // メッセージ表示中は入力をロック
  cutinElement.innerHTML = text; // textContent から innerHTML に変更して <br> を有効にする
  cutinElement.style.display = 'block';
  const displayDuration = duration || FLASH_DEFAULT_DURATION_MS;

  if (isMatchEndMessage) {
    cutinElement.classList.add('match-winner-cutin');
    // マッチ終了メッセージ用のフォントサイズ調整はCSS側で行うか、ここで固定値を設定
  } else {
    cutinElement.classList.remove('match-winner-cutin');
    // 通常メッセージの長さに応じてフォントサイズを調整
    if (text.length > 30) cutinElement.style.fontSize = '2em';
    else if (text.length > 20) cutinElement.style.fontSize = '2.5em';
    else cutinElement.style.fontSize = '3.2em';
  }

  setTimeout(() => {
    cutinElement.style.display = 'none';
    cutinElement.classList.remove('match-winner-cutin'); // 念のため削除
    if (currentGameMode !== GAME_MODE_EVE) { // EvEモードでない場合のみ入力ロック解除
      // unlockInput(); // コールバック内で適切に制御するため、ここでは解除しない場合もある
    }
    if (callback) callback();
  }, displayDuration); // 正しい表示時間を使用
}
/**
 * Q学習用の現在の状態キーを生成する (プレイヤーEN_相手EN)
 * @returns {string} 現在の状態を表す文字列キー
 * @param {number} selfEn 自身のエネルギー
 * @param {number} oppEn 相手のエネルギー (TensorFlow.jsでは直接使用せず、stateVectorを使用)
 */
// function getCurrentStateKey(selfEn, oppEn) { return `${selfEn}_${oppEn}`; } // TensorFlow.jsでは使用しない

/**
 * プレイヤー名入力欄から名前を取得する。未入力の場合はデフォルト名を使用。
 * @returns {string} プレイヤー名
 */
function getPlayerNameInput() {
    return playerNameInputElement.value.trim() || "Player"; // 未入力なら"Player"をデフォルトに
}

/*===== 5a. TensorFlow.js ヘルパー関数 =====*/
/**
 * 指定されたエネルギーとシールドでAIが実行可能な行動のリストを返す
 * @param {number} currentEnergy AIの現在のエネルギー
 * @param {number} currentShield AIの現在のシールド
 * @returns {string[]} 有効な行動の定数の配列
 */
function getValidMovesForAI(currentEnergy, currentShield) {
    const validMoves = [MOVE_CHARGE]; // 溜めは常に可能
    if (currentEnergy > 0) {
        validMoves.push(MOVE_ATTACK);
    }
    if (currentShield > 0) {
        validMoves.push(MOVE_BLOCK);
    }
    if (currentEnergy >= SPECIAL_ACTION_ENERGY_COST) {
        validMoves.push(MOVE_SPECIAL_ACTION);
    }
    return validMoves;
}

/**
 * TensorFlow.js Qネットワークモデルを作成またはロードする
 */
async function initializeQNetwork() {
    try {
        qNetwork = await tf.loadLayersModel(Q_NETWORK_MODEL_PATH);
        console.log("Q-Network loaded from localStorage.");
        // ロードされたモデルもトレーニング前にコンパイルが必要
        qNetwork.compile({
            optimizer: tf.train.adam(TF_LEARNING_RATE),
            loss: 'meanSquaredError'
        });
        modelLoaded = true;
    } catch (e) {
        console.log("No saved Q-Network found or error loading. Creating a new one.");
        qNetwork = tf.sequential();
        qNetwork.add(tf.layers.dense({
            inputShape: [TF_STATE_SIZE],
            units: 32, // 中間層のユニット数 (調整可能)
            activation: 'relu'
        }));
        qNetwork.add(tf.layers.dense({
            units: 32, // 中間層のユニット数 (調整可能)
            activation: 'relu'
        }));
        qNetwork.add(tf.layers.dense({
            units: TF_NUM_ACTIONS, // 出力層のユニット数 (行動の数)
            activation: 'linear' // Q値なので線形活性化
        }));

        qNetwork.compile({
            optimizer: tf.train.adam(TF_LEARNING_RATE),
            loss: 'meanSquaredError' // 平均二乗誤差
        });
        console.log("New Q-Network created.");
        modelLoaded = true;
    }
}

/**
 * 現在の状態をTensorFlow.jsモデルの入力形式 (テンソル) に変換する
 * @param {number} selfEn AI自身のエネルギー
 * @param {number} selfSh AI自身のシールド
 * @param {number} oppEn AIの相手のエネルギー
 * @param {number} oppSh AIの相手のシールド
 * @returns {tf.Tensor} 状態を表すテンソル
 */
function getStateTensor(selfEn, selfSh, oppEn, oppSh) {
    // 正規化はパフォーマンスを向上させることがあるが、ここではシンプルに直接の値を使用
    return tf.tensor2d([[selfEn, selfSh, oppEn, oppSh]], [1, TF_STATE_SIZE]);
}

/*===== 6. AI (PvE) =====*/
// PvEモードにおけるAIの行動選択ロジック

/**
 * Qネットワークから現在の状態で最も価値の高い行動を選択する
 * @param {number} selfEn AI自身のエネルギー
 * @param {number} selfSh AI自身のシールド
 * @param {number} oppEn AIの相手のエネルギー
 * @param {number} oppSh AIの相手のシールド
 * @returns {string|null} 最善手のアクション。対応するアクションがない場合はnull
 */
async function getBestActionFromNetwork(selfEn, selfSh, oppEn, oppSh) {
    if (!modelLoaded || !qNetwork) return null; // モデルがロードされていなければ何もしない

    const validMovesForAI = getValidMovesForAI(selfEn, selfSh);

    return tf.tidy(() => {
        const stateTensor = getStateTensor(selfEn, selfSh, oppEn, oppSh);
        const qValuesTensor = qNetwork.predict(stateTensor);
        const qValues = qValuesTensor.dataSync(); // 同期的にデータを取得 (await qValuesTensor.data() も可)

        let bestAction = null;
        let maxValue = -Infinity;

        for (let i = 0; i < AI_ACTIONS_FOR_Q_LEARNING.length; i++) {
            const action = AI_ACTIONS_FOR_Q_LEARNING[i];
            // AIが実行可能で、かつQ値が現在の最大値より大きい行動を探す
            if (validMovesForAI.includes(action) && qValues[i] > maxValue) {
                maxValue = qValues[i];
                bestAction = action;
            }
        }
        // console.log(`State: [${selfEn},${selfSh},${oppEn},${oppSh}], Q-Values: ${qValues}, Best Action: ${bestAction}`);
        return bestAction;
    });
}

/**
 * @deprecated PvE/EvEのAI戦略では getValidMovesForAI を使用するため、この関数は直接使用されなくなります。
 * ただし、他の箇所で参照されている可能性を考慮し、コメントアウトせずに残します。
 * AIが取りうる有効な行動の中からランダムに1つ選択する (PvEのAI視点)
 * @returns {string} ランダムに選択された有効な行動
 */
// function randomValid(){
//   // この関数は PvE の AI (opponentEnergy, opponentShield を参照) を前提としていた。
//   // EvEモードのAI1 (playerEnergy, playerShield を参照) では正しく機能しない。
//   const possibleMoves = [];
//   if (opponentEnergy > 0) possibleMoves.push(MOVE_ATTACK);
//   if (opponentShield > 0) possibleMoves.push(MOVE_BLOCK);
//   possibleMoves.push(MOVE_CHARGE);
//   return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
// }

/**
 * AIの行動戦略を決定する (PvEモードのAI、またはEvEモードのAI1用)
 * @param {number} aiSelfEnergy AI自身の現在のエネルギー
 * @param {number} aiSelfShield AI自身の現在のシールド
 * @param {number} aiOpponentEnergy AIの相手の現在のエネルギー
 * @param {number} aiOpponentShield AIの相手の現在のシールド
 * 優先順位: 固定ルール -> ε-greedy法 -> 簡易ヒューリスティック
 * @returns {string} AIが選択した行動
 */
async function aiStrategy(aiSelfEnergy, aiSelfShield, aiOpponentEnergy, aiOpponentShield){
  const validMovesForAISelf = getValidMovesForAI(aiSelfEnergy, aiSelfShield);

  // 1. 固定ルール (特定の状況下で最善と思われる行動)
  // 自分AIがSpecial Actionを撃てる場合は必ず撃つ
  if (validMovesForAISelf.includes(MOVE_SPECIAL_ACTION)) {
    return MOVE_SPECIAL_ACTION;
  }
  // 相手と自分のエネルギーが0なら溜める
  if (aiSelfEnergy === 0 && aiOpponentEnergy === 0 && validMovesForAISelf.includes(MOVE_CHARGE)) {
    return MOVE_CHARGE;
  }
  // 自分のエネルギーが0、相手のエネルギーが2なら溜める
  if (aiSelfEnergy === 0 && aiOpponentEnergy === 2 && validMovesForAISelf.includes(MOVE_CHARGE)) {
    return MOVE_CHARGE;
  }
  // 相手のエネルギーが0、自分のエネルギーが2なら溜める
  if (aiOpponentEnergy === 0 && aiSelfEnergy === 2 && validMovesForAISelf.includes(MOVE_CHARGE)) {
    return MOVE_CHARGE;
  }

  // 2. ε-greedy法による行動選択
  // const stateKeyForQ = getCurrentStateKey(aiSelfEnergy, aiOpponentEnergy); // 旧Qテーブル用
  // const qStateTable = qLearningTable[stateKeyForQ]; // 旧Qテーブル用
  // 現在の状態の訪問回数を計算
  // TensorFlow.jsでは訪問回数を直接Qテーブルのように保持しないため、このロジックは簡略化または削除が必要
  // ここでは一旦、訪問回数に基づくε値の調整はコメントアウトし、固定的なε値または連敗に基づく調整のみ残す
  // const stateVisits = qStateTable ? Object.values(qStateTable).reduce((sum, entry) => sum + entry.c, 0) : 0;
  const bestQAction = await getBestActionFromNetwork(aiSelfEnergy, aiSelfShield, aiOpponentEnergy, aiOpponentShield); // ニューラルネットワークによる最善手
  // const bestQValue = bestQAction && qStateTable ? qStateTable[bestQAction].v : 0; // 旧Qテーブル用

  // ε (イプシロン) 値の動的調整
  // stateVisits は TensorFlow.js モデルでは直接使用しないため、εの初期値を設定
  let epsilon = EPSILON_INITIAL;

  if (pveLoseStreak >= 3) { // AIが3連敗以上している場合
    // pveLoseStreakはPvEモードのAIの連敗記録。EvEのAI2には直接適用されない。
    // EvEのAI1が学習主体なので、このロジックはAI1(またはPvEのAI)の学習時に影響。
    if (currentGameMode === GAME_MODE_PVE) epsilon = EPSILON_ON_LOSE_STREAK;
  } // else if (bestQValue < 0) { // 最善手のQ値が負の場合 (TensorFlow.jsでは直接Q値の正負で判断しにくい)
    // 上記の if (pveLoseStreak >= 3) ブロックは前の行末の括弧で閉じています。
    // 以下の epsilon 更新処理は、以前の else if の名残であり、現在は無条件に実行されます。
    epsilon = Math.min(1, epsilon + EPSILON_INCREASE_ON_NEGATIVE_VALUE); // ε値を増やして他の手を試す
  // } // ← この閉じ括弧が aiStrategy 関数を早期に終了させていたため削除しました。

  // εの確率でランダムな有効行動を選択 (探索)
  if (Math.random() < epsilon) {
    return validMovesForAISelf[Math.floor(Math.random() * validMovesForAISelf.length)];
  }

  // (1-ε)の確率でQ学習による最善手を選択 (活用)。AI自身が実行可能か確認。
  // さらに、Q学習による最善手を選択する場合でも、一定確率でランダム行動を混ぜる
  if (Math.random() < EXPLORE_EVEN_WITH_Q_PROBABILITY) {
    return validMovesForAISelf[Math.floor(Math.random() * validMovesForAISelf.length)];
  } else {
    if (bestQAction && validMovesForAISelf.includes(bestQAction)) {
      return bestQAction;
    }
  }

  // Q学習による最善手がない、またはAIが実行不可能な場合、一定確率でランダムな有効行動
  if (Math.random() < AI_RANDOM_CHOICE_PROBABILITY) {
    return validMovesForAISelf[Math.floor(Math.random() * validMovesForAISelf.length)];
  }

  // 3. 簡易ヒューリスティック (上記で決まらない場合のフォールバック)
  // AI自身のエネルギー (aiSelfEnergy) と AI自身のシールド (aiSelfShield) に基づく。
  // 相手のエネルギー (aiOpponentEnergy) と 相手のシールド (aiOpponentShield) も考慮。
  if (aiSelfEnergy === 1) { // AI自身のENが1
    // 自分SHあり且つ相手SHあれば防御、なければ攻撃
    if (aiSelfShield > 0 && aiOpponentShield > 0 && validMovesForAISelf.includes(MOVE_BLOCK)) return MOVE_BLOCK;
    if (validMovesForAISelf.includes(MOVE_ATTACK)) return MOVE_ATTACK; // 攻撃が有効なら攻撃
  }
  if (aiSelfEnergy === 2) { // AI自身のENが2
    if (aiOpponentEnergy > 0 && validMovesForAISelf.includes(MOVE_ATTACK)) return MOVE_ATTACK; // 相手にENがあれば攻撃
    // 相手にENがなく、自分にSHがあれば防御
    else if (aiSelfShield > 0 && validMovesForAISelf.includes(MOVE_BLOCK)) return MOVE_BLOCK;
  }
  if (aiSelfEnergy >= SPECIAL_ACTION_ENERGY_COST) { // AI自身がSpecial Actionを撃てるENを持っている
    // 自分SHあり且つ相手SHあれば防御
    if (aiSelfShield > 0 && aiOpponentShield > 0 && validMovesForAISelf.includes(MOVE_BLOCK)) return MOVE_BLOCK;
    // なければ相手EN見て攻撃か溜め
    else if (aiOpponentEnergy > 0 && validMovesForAISelf.includes(MOVE_ATTACK)) return MOVE_ATTACK;
    else if (validMovesForAISelf.includes(MOVE_CHARGE)) return MOVE_CHARGE; // 溜めも有効な選択肢
  }

  // デフォルトのフォールバック: 有効な手の中からランダムに選択 (溜めが最優先されることが多い)
  if (validMovesForAISelf.includes(MOVE_CHARGE)) return MOVE_CHARGE; // 溜めは常にリストに含まれるはず
  return validMovesForAISelf[Math.floor(Math.random() * validMovesForAISelf.length)]; // 万が一溜めがない場合の絶対的フォールバック
} // aiStrategy 関数の正しい閉じ括弧

/*===== 7. Q学習更新 =====*/
/**
 * Q学習テーブルを更新する
 * 1ゲームの終わりに呼び出され、そのゲームの軌跡に基づいてQ値を更新する
 * @param {number} reward ゲームの結果得られた報酬 (例: 勝利+1, 敗北-1, 引き分け0)
 */
async function updateQNetwork(reward) {
  if (!modelLoaded || !qNetwork || qLearningTrajectory.length === 0) {
    qLearningTrajectory.length = 0; // モデルがない場合は軌跡をクリアして終了
    return;
  }

  // qLearningTrajectory には { stateVector: [sE,sS,oE,oS], actionString: 'a' } が格納されている想定
  // reward は最終的なゲームの報酬 (+1, 0, -1)

  const statesToTrain = [];
  const targetsToTrain = [];

  // モンテカルロ的な更新: 軌跡内の各(状態,行動)ペアに対して、最終的な報酬をターゲットとする
  for (const record of qLearningTrajectory) {
    const { stateVector, actionString } = record;
    const actionIndex = AI_ACTIONS_FOR_Q_LEARNING.indexOf(actionString);

    if (actionIndex === -1) continue; // 軌跡に不正な行動があればスキップ

    // 現在の状態で取りうる全行動のQ値を予測
    const stateTensor = getStateTensor(stateVector[0], stateVector[1], stateVector[2], stateVector[3]);
    const currentQValuesTensor = qNetwork.predict(stateTensor);
    const currentQValues = await currentQValuesTensor.data(); // TypedArrayを取得

    // ターゲットQ値配列を作成 (予測されたQ値をコピー)
    const targetQValues = Array.from(currentQValues); // 通常の配列に変換してコピー

    // 実際に取った行動のQ値のターゲットを最終報酬で更新
    // より高度なDQNでは、targetQValues[actionIndex] = reward + TF_DISCOUNT_FACTOR * maxQ_next_state; となる
    // ここでは簡略化のため、最終報酬を直接ターゲットとする
    targetQValues[actionIndex] = reward;

    statesToTrain.push(stateVector); // [sE, sS, oE, oS]
    targetsToTrain.push(targetQValues); // 更新されたQ値の配列

    tf.dispose([stateTensor, currentQValuesTensor]); // メモリ解放
  }

  if (statesToTrain.length > 0) {
    const batchStatesTensor = tf.tensor2d(statesToTrain, [statesToTrain.length, TF_STATE_SIZE]);
    const batchTargetsTensor = tf.tensor2d(targetsToTrain, [targetsToTrain.length, TF_NUM_ACTIONS]);

    await qNetwork.fit(batchStatesTensor, batchTargetsTensor, {
      epochs: 1, // 1バッチあたり1エポック (調整可能)
      // batchSize: 32, // バッチサイズ (調整可能、全データ使うなら不要)
      verbose: 0 // 学習ログをコンソールに出力しない
    });

    tf.dispose([batchStatesTensor, batchTargetsTensor]); // メモリ解放
    console.log(`Q-Network trained with ${statesToTrain.length} samples. Final reward: ${reward}`);

    // モデルを保存 (任意)
    try {
        await qNetwork.save(Q_NETWORK_MODEL_PATH);
        // console.log("Q-Network saved to localStorage.");
    } catch (e) {
        console.error("Error saving Q-Network:", e);
    }
  }
  qLearningTrajectory.length = 0; // 次のゲームのために軌跡をクリア
}
/*===== 8. Firebase (PvP) =====*/
// PvPモードで使用するFirebase Realtime Database関連の処理
let currentRoomRef = null; // 現在参加しているFirebaseルームへの参照
let myPlayerRole = PLAYER_ROLE_P1; // 自分がプレイヤー1かプレイヤー2か

/**
 * 新しいPvPゲームルームを作成する
 */
function createRoom(){
  myPlayerName = getPlayerNameInput(); // プレイヤー名を取得
  const roomId = Math.random().toString(36).slice(2, 7); // ランダムなルームIDを生成
  currentRoomRef = db.ref(FIREBASE_ROOMS_PATH + roomId); // ルームへの参照を作成
  // ルームの初期データを設定
  const initialRoomData = {
    [PLAYER_ROLE_P1]: { [FIREBASE_KEY_ENERGY]: 0, [FIREBASE_KEY_SHIELD]: PLAYER_INITIAL_SHIELD, [FIREBASE_KEY_MOVE]: null, [FIREBASE_KEY_NAME]: myPlayerName }, // P1の初期データに名前を追加
    [PLAYER_ROLE_P2]: { [FIREBASE_KEY_ENERGY]: 0, [FIREBASE_KEY_SHIELD]: PLAYER_INITIAL_SHIELD, [FIREBASE_KEY_MOVE]: null, [FIREBASE_KEY_NAME]: "Opponent" } // P2の初期名
  };
  currentRoomRef.set(initialRoomData); // Firebaseに初期データを書き込み
  currentRoomRef.onDisconnect().remove(); // 接続が切れたらルームデータを削除 (ホストが落ちた場合など)
  myPlayerRole = PLAYER_ROLE_P1; // ルーム作成者はプレイヤー1
  roomIdDisplayElement.textContent = roomId; // UIにルームIDを表示
  if (currentGameMode === GAME_MODE_PVP) onlineMessageElement.textContent = `${myPlayerName}さん、${UI_MSG_SHARE_ROOM_ID_P1}`; // P1にルームID共有を促す (名入り)
  listenRoom(); // ルームデータの変更監視を開始
  showUI(); // UIを更新して自分の名前を表示

  // ルームIDをクリップボードにコピー
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(roomId).then(() => {
      console.log('Room ID copied to clipboard: ' + roomId);
      // オプション: ユーザーにコピー成功を通知するUIメッセージを表示
      //例: onlineMessageElement.textContent = `ルームID "${roomId}" をコピーしました！ ${UI_MSG_CHOOSE_ACTION}`;
    }).catch(err => {
      console.error('Failed to copy room ID: ', err);
    });
  } else {
    console.warn('Clipboard API not available.');
  }
}
/**
 * 既存のPvPゲームルームに参加する
 * @param {string} roomId 参加するルームのID
 */
function joinRoom(roomId){
  myPlayerName = getPlayerNameInput(); // プレイヤー名を取得
  currentRoomRef = db.ref(FIREBASE_ROOMS_PATH + roomId); // 指定されたIDのルームへの参照を作成
  currentRoomRef.get().then(snapshot => { // ルームデータの存在確認
    if (!snapshot.exists()) { // ルームが存在しない場合
      onlineMessageElement.textContent = UI_MSG_ROOM_ID_NOT_FOUND;
      return;
    }
    // ルームが存在する場合、P2として参加し、自分の名前をFirebaseに書き込む
    myPlayerRole = PLAYER_ROLE_P2; // ルーム参加者はプレイヤー2
    roomIdDisplayElement.textContent = roomId; // UIにルームIDを表示

    // P2の初期データに名前を追加してFirebaseを更新
    const updates = {};
    updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_NAME}`] = myPlayerName;
    currentRoomRef.update(updates);

    if (currentGameMode === GAME_MODE_PVP) onlineMessageElement.textContent = UI_MSG_CHOOSE_ACTION; // 行動選択を促す
    listenRoom(); // ルームデータの変更監視を開始
  });
}
/**
 * Firebaseルームのデータ変更を監視し、ゲーム状態を同期する
 */
function listenRoom(){
  currentRoomRef.on('value', snapshot => { // 'value'イベントでルームデータの変更を全て取得
    const roomData = snapshot.val();
    if (!roomData) {
        // ルームデータが存在しない場合はルームが削除されたとみなし、PvPモードを終了
        if (currentGameMode === GAME_MODE_PVP) {
            onlineMessageElement.textContent = "ルームが閉じられました。";
            resetGame(); // ゲーム状態をリセット (PvEモードに戻るなど)
        }
        return; // ルームデータが存在しない場合は何もしない (ルームが削除された場合など)
    }

    // 自分と相手のロールを決定
    const myRoomData = roomData[myPlayerRole];
    const opponentPlayerRole = myPlayerRole === PLAYER_ROLE_P1 ? PLAYER_ROLE_P2 : PLAYER_ROLE_P1;
    const opponentRoomData = roomData[opponentPlayerRole];

    // プレイヤー名の同期 (myPlayerNameは自分の名前、opponentPlayerNameは相手の名前を指すようにする)
    if (myRoomData && myRoomData[FIREBASE_KEY_NAME]) myPlayerName = myRoomData[FIREBASE_KEY_NAME];
    if (opponentRoomData && opponentRoomData[FIREBASE_KEY_NAME]) opponentPlayerName = opponentRoomData[FIREBASE_KEY_NAME];


    // 自分と相手のデータが存在すれば、ローカルのゲーム状態を更新
    if (myRoomData && opponentRoomData) {
      playerEnergy = myRoomData[FIREBASE_KEY_ENERGY];
      playerShield = myRoomData[FIREBASE_KEY_SHIELD];
      opponentEnergy = opponentRoomData[FIREBASE_KEY_ENERGY];
      opponentShield = opponentRoomData[FIREBASE_KEY_SHIELD];

      // デバッグログ: Firebaseから受信した現在のエネルギーとシールドを表示
      if (currentGameMode === GAME_MODE_PVP) {
          console.log(`[DEBUG] Firebase data received via listener:`);
          console.log(`  My Role (${myPlayerRole}): Energy=${myRoomData[FIREBASE_KEY_ENERGY]}, Shield=${myRoomData[FIREBASE_KEY_SHIELD]}`);
          console.log(`  Opponent Role (${opponentPlayerRole}): Energy=${opponentRoomData[FIREBASE_KEY_ENERGY]}, Shield=${opponentRoomData[FIREBASE_KEY_SHIELD]}`);
          // マッチ終了後のリセット値になっているか確認するログ
          if (player1Wins >= WINS_TO_VICTORY || player2Wins >= WINS_TO_VICTORY) {
              console.log(`[DEBUG] Match ended. Checking if Firebase data reflects reset values (Energy=0, Shield=${PLAYER_INITIAL_SHIELD}): My Data Reset = ${myRoomData[FIREBASE_KEY_ENERGY] === 0 && myRoomData[FIREBASE_KEY_SHIELD] === PLAYER_INITIAL_SHIELD}, Opponent Data Reset = ${opponentRoomData[FIREBASE_KEY_ENERGY] === 0 && opponentRoomData[FIREBASE_KEY_SHIELD] === PLAYER_INITIAL_SHIELD}`);
          }
      }
      showUI(); // UIを更新
    }

    // 両プレイヤーが行動を選択済みの場合
    if (myRoomData && opponentRoomData && myRoomData[FIREBASE_KEY_MOVE] && opponentRoomData[FIREBASE_KEY_MOVE]) {
      // Firebase上の両プレイヤーの行動データをクリア (次のターンに備える)
      // 注意: この処理は片方のクライアントのみで行うべき。両方で行うと競合の可能性。
      //       通常はホスト(P1)が行うか、トランザクションを使う。現状では両クライアントで実行される。
      //       ここではシンプルに両方からクリアを試みるが、より堅牢な実装が必要な場合がある。
      currentRoomRef.child(PLAYER_ROLE_P1 + '/' + FIREBASE_KEY_MOVE).set(null);
      currentRoomRef.child(PLAYER_ROLE_P2 + '/' + FIREBASE_KEY_MOVE).set(null);

      if (currentGameMode === GAME_MODE_PVP) onlineMessageElement.textContent = ''; // メッセージをクリア (flashMessageで行動が表示されるため)

      // 行動を処理し、結果を判定
      processMoves(myRoomData[FIREBASE_KEY_MOVE], opponentRoomData[FIREBASE_KEY_MOVE], true);

      // 結果 (エネルギー、シールド) をFirebaseに反映
      // 注意: この更新も両クライアントから行われる可能性がある。
      //       processMovesの結果をローカルで計算した後、片方のクライアント(例: P1)のみが更新するのが望ましい。
      const updates = {};
      if (myPlayerRole === PLAYER_ROLE_P1) { // P1が更新する場合 (実際には両方実行される)
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_ENERGY}`] = playerEnergy;
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_SHIELD}`] = playerShield;
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_NAME}`] = myPlayerName; // 名前も更新に含める (念のため)
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_ENERGY}`] = opponentEnergy;
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_SHIELD}`] = opponentShield;
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_NAME}`] = opponentPlayerName; // 名前も更新に含める (念のため)
      } else { // P2が更新する場合 (実際には両方実行される)
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_ENERGY}`] = playerEnergy; // P2視点での自分のデータ
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_SHIELD}`] = playerShield;
        updates[`${PLAYER_ROLE_P2}/${FIREBASE_KEY_NAME}`] = myPlayerName; // 名前も更新に含める (念のため)
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_ENERGY}`] = opponentEnergy;
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_SHIELD}`] = opponentShield;
        updates[`${PLAYER_ROLE_P1}/${FIREBASE_KEY_NAME}`] = opponentPlayerName; // 名前も更新に含める (念のため)
      }
      currentRoomRef.update(updates); // Firebaseデータを更新
    } else if (currentGameMode === GAME_MODE_PVP) { // Game continues, moves not yet resolved for both
      if (myRoomData) { // My data is available in the snapshot
        if (myRoomData[FIREBASE_KEY_MOVE]) {
          // I (current client) have already made a move.
          // handlePlayerTurn() sets UI_MSG_WAITING_OPPONENT.
          // No change needed here unless that message was somehow cleared.
          if (onlineMessageElement.textContent !== `${myPlayerName}さんの手を選択済。相手の選択を待っています…`) { // メッセージも名入りに合わせる
            // This might occur if P2 joins after P1 moved, and P1's listener re-evaluates.
            // Or if P1 moved, P2 not joined, P1 should still see "waiting opponent" or "share room ID".
            // UI_MSG_WAITING_OPPONENT is generally correct if I've moved.
          }
        } else { // I (current client) have NOT made a move yet.
          if (!opponentRoomData) {
            // Opponent is not present in the room data yet.
            if (myPlayerRole === PLAYER_ROLE_P1) {
              onlineMessageElement.textContent = `${myPlayerName}さん、${UI_MSG_SHARE_ROOM_ID_P1}`; // 名入り
            } else { // I am P2, opponent (P1) data not yet seen.
              // joinRoom() set UI_MSG_CHOOSE_ACTION or UI_MSG_ROOM_ID_NOT_FOUND. This is fine.
              // No specific change here, initial message from joinRoom() persists.
            }
          } else { // Opponent IS present in the room data.
            if (!opponentRoomData[FIREBASE_KEY_MOVE] && opponentRoomData[FIREBASE_KEY_NAME]) { // 相手の名前も確認
              // Opponent is present AND has NOT made a move. (I also haven't moved)
              onlineMessageElement.textContent = UI_MSG_MATCH_READY_CHOOSE_ACTION;
            } else { // Opponent is present AND HAS made a move. (I haven't moved)
              onlineMessageElement.textContent = UI_MSG_MATCH_READY_CHOOSE_ACTION; // It's my turn.
            }
          }
        }
      } // else: myRoomData is not yet available. Initial messages from createRoom/joinRoom should persist.
    }
  });
}
/**
 * プレイヤーの行動をFirebaseに送信する
 * @param {string} move プレイヤーが選択した行動
 */
function sendMoveFirebase(move) {
  // 送信するデータには、行動だけでなく現在のエネルギーとシールドも含む
  // これは、相手が自分の行動選択時の状態を参照できるようにするためかもしれないが、
  // listenRoomで状態は同期されるため、moveだけでも良い場合もある。
  const moveData = {
    [FIREBASE_KEY_MOVE]: move,
    [FIREBASE_KEY_ENERGY]: playerEnergy, // 行動選択時のエネルギー
    [FIREBASE_KEY_SHIELD]: playerShield  // 行動選択時のシールド
    // 名前はcreateRoom/joinRoomで設定済みなので、ここでは含めない
  };
  currentRoomRef.child(myPlayerRole).update(moveData); // 自分のロールのデータを更新
}

/*===== 9. 勝敗判定ロジック =====*/
/**
 * プレイヤーと相手の行動に基づいて、ゲームの勝敗を判定し、結果メッセージを表示する
 * @param {string} playerMove プレイヤーの行動
 * @param {string} opponentMove 相手の行動
 * @returns {boolean} ゲームが終了した場合はtrue、それ以外はfalse
 */
function resolveMoves(playerMove, opponentMove) { // この関数はラウンドの勝敗を判定し、状態を更新する
  let gameEnded = false; // ゲームが終了したかどうかのフラグ
  let playerWon = null;  // プレイヤーの勝利状態 (true: 勝利, false: 敗北, null: 引き分け・未決着)
  let roundWinnerMessage = "";
  let p1DisplayName, p2DisplayName;

  if (currentGameMode === GAME_MODE_EVE) {
    p1DisplayName = "AI 1"; // EvEモードでのプレイヤー1側表示名
    p2DisplayName = "AI 2"; // EvEモードでのプレイヤー2側表示名
  } else if (currentGameMode === GAME_MODE_PVP) {
    p1DisplayName = myPlayerName;
    p2DisplayName = opponentPlayerName;
  } else { // PvE
    p1DisplayName = "あなた";
    p2DisplayName = UI_MSG_AI_OPPONENT_NAME;
  }

  const specialActionDisplayName = 'Special Action'; // 表示用の技名

  // Special Actionの判定 (最優先)
  if (playerMove === MOVE_SPECIAL_ACTION && opponentMove === MOVE_SPECIAL_ACTION) {
    playSound('soundKamehameha'); // 両者Special Actionの音
    roundWinnerMessage = `${specialActionDisplayName} vs ${specialActionDisplayName}! Draw!`;
    gameEnded = true;
    playerWon = null; // Special Action同士の引き分け
  } else if (playerMove === MOVE_SPECIAL_ACTION && opponentMove !== MOVE_SPECIAL_ACTION) {
    playSound('soundKamehameha'); // Special Actionの音
    if (currentGameMode !== GAME_MODE_EVE) playSound('soundGameend'); // EvEでは鳴らさない
    roundWinnerMessage = `${p1DisplayName} wins with ${specialActionDisplayName}!`;
    gameEnded = true;
    playerWon = true;
  } else if (opponentMove === MOVE_SPECIAL_ACTION && playerMove !== MOVE_SPECIAL_ACTION) {
    playSound('soundKamehameha'); // Special Actionの音 (相手)
    playSound('soundGameend');
    roundWinnerMessage = `${p2DisplayName} wins with ${specialActionDisplayName}!`;
    gameEnded = true;
    playerWon = false;
  // 通常行動の判定 (Special Action以外)
  } else if (playerMove === MOVE_ATTACK && opponentMove === MOVE_CHARGE) {
    playSound('soundAttack');
    playSound('soundGameend');
    roundWinnerMessage = `${p1DisplayName} wins!`;
    gameEnded = true;
    playerWon = true;
  } else if (playerMove === MOVE_CHARGE && opponentMove === MOVE_ATTACK) {
    playSound('soundAttack');
    playSound('soundGameend');
    roundWinnerMessage = `${p2DisplayName} wins!`;
    gameEnded = true;
    playerWon = false;
  }
  // その他の組み合わせ (例: 攻撃vs防御、溜めvs溜めなど) はこの関数では勝敗を決定せず、ゲーム続行となる

  if (gameEnded) {
    if (playerWon === true) {
      player1Wins++;
    } else if (playerWon === false) {
      player2Wins++;
    }
    showUI(); // 勝利数を即時反映

    // マッチ勝利判定
    if (player1Wins >= WINS_TO_VICTORY) {
      let matchWinMsg = `${p1DisplayName} won the match ${player1Wins} - ${player2Wins}!`;
      // PvPマッチ終了時のFirebaseリセット処理をコールバックに含める
      // このコールバックが呼ばれるのは flashMessage の表示後。
      // その時点のグローバルな currentRoomRef や myPlayerRole は変わっている可能性があるため、
      // マッチ終了判定時点の値をキャプチャしておく。
      const pvpMatchEnded = (currentGameMode === GAME_MODE_PVP);
      const roomRefAtMatchEnd = pvpMatchEnded ? currentRoomRef : null;
      const playerRoleAtMatchEnd = pvpMatchEnded ? myPlayerRole : null;

      const callbackAfterMatchEnd = () => {
        // キャプチャした情報を使ってFirebaseを更新
        if (pvpMatchEnded && roomRefAtMatchEnd && playerRoleAtMatchEnd) {
          const resetData = {
            [`${PLAYER_ROLE_P1}/${FIREBASE_KEY_ENERGY}`]: 0,
            [`${PLAYER_ROLE_P1}/${FIREBASE_KEY_SHIELD}`]: PLAYER_INITIAL_SHIELD,
            [`${PLAYER_ROLE_P2}/${FIREBASE_KEY_ENERGY}`]: 0,
            [`${PLAYER_ROLE_P2}/${FIREBASE_KEY_SHIELD}`]: PLAYER_INITIAL_SHIELD
            // 名前はリセットしない
          };
          roomRefAtMatchEnd.update(resetData)
            .then(() => {
              console.log(`Both players' energy/shield reset on Firebase after PvP match.`);
            })
            .catch(error => {
              console.error(`Error resetting players' energy/shield on Firebase:`, error);
            });
        }
        resetMatch(); // ローカルのゲーム状態（勝利数、エネルギー、シールドなど）をリセット
      };
      flashMessage(matchWinMsg, FLASH_WIN_LOSE_DURATION_MS * 1.5, callbackAfterMatchEnd, true);
      // Q学習更新はラウンドごとに行うので、ここでは不要 (下記で処理)
    } else if (player2Wins >= WINS_TO_VICTORY) {
      let matchWinMsg = `${p2DisplayName} won the match ${player2Wins} - ${player1Wins}!`;
      const pvpMatchEnded = (currentGameMode === GAME_MODE_PVP);
      const roomRefAtMatchEnd = pvpMatchEnded ? currentRoomRef : null;
      const playerRoleAtMatchEnd = pvpMatchEnded ? myPlayerRole : null;

      const callbackAfterMatchEnd = () => {
        if (pvpMatchEnded && roomRefAtMatchEnd && playerRoleAtMatchEnd) {
          const resetData = {
            [`${PLAYER_ROLE_P1}/${FIREBASE_KEY_ENERGY}`]: 0,
            [`${PLAYER_ROLE_P1}/${FIREBASE_KEY_SHIELD}`]: PLAYER_INITIAL_SHIELD,
            [`${PLAYER_ROLE_P2}/${FIREBASE_KEY_ENERGY}`]: 0,
            [`${PLAYER_ROLE_P2}/${FIREBASE_KEY_SHIELD}`]: PLAYER_INITIAL_SHIELD
            // 名前はリセットしない
          };
          roomRefAtMatchEnd.update(resetData)
            .then(() => {
              console.log(`Both players' energy/shield reset on Firebase after PvP match.`);
            })
            .catch(error => {
              console.error(`Error resetting players' energy/shield on Firebase:`, error);
            });
        }
        resetMatch();
      };
      flashMessage(matchWinMsg, FLASH_WIN_LOSE_DURATION_MS * 1.5, callbackAfterMatchEnd, true);
    } else {
      // マッチは継続、ラウンドの勝敗のみ表示
      flashMessage(roundWinnerMessage, FLASH_WIN_LOSE_DURATION_MS, () => {
        resetRound(); // ラウンドの状態をリセットして次のラウンドへ
      });
    }
  } else {
    // ゲーム続行 (勝敗未決着) の場合は、processMoves内のflashMessageのコールバックでshowUI()などが呼ばれる
    // ここでは特に何もしない
  }

  // Q学習のための報酬計算と更新は、ラウンドが終了した場合に行う
  // この resolveMoves 関数は、ラウンドの勝敗が決まったかどうかを返す
  // 実際のQ学習更新は、この関数の呼び出し元 (processMovesのコールバック内) で行う
  // ただし、報酬の決定はこの関数内で行うのが自然

  // PvEモードまたはEvEモード(AI1学習)でゲームが終了した場合、AIの連敗記録を更新し、Q学習テーブルを更新
  if (gameEnded && (currentGameMode === GAME_MODE_PVE || currentGameMode === GAME_MODE_EVE)) {
    // PvE: playerWonは人間プレイヤーの勝敗。AIの報酬は逆。
    // EvE: playerWonはAI1の勝敗。AI1の報酬はそのまま。
    let rewardForLearningAI = 0;
    if (playerWon === true) { // p1 (あなた or AI1) が勝利
      rewardForLearningAI = (currentGameMode === GAME_MODE_PVE) ? -1 : 1; // PvEならAIは負け(-1), EvEならAI1は勝ち(1)
    } else if (playerWon === false) { // p1 (あなた or AI1) が敗北
      rewardForLearningAI = (currentGameMode === GAME_MODE_PVE) ? 1 : -1; // PvEならAIは勝ち(1), EvEならAI1は負け(-1)
    } // playerWon === null (引き分け) の場合は rewardForLearningAI は 0 のまま

    updateQNetwork(rewardForLearningAI); // TensorFlow.jsモデルを学習

    if (currentGameMode === GAME_MODE_PVE) { // PvEモードのAIの連敗記録のみ更新
      if (playerWon === true) { // 人間プレイヤーが勝った (AIが負けた)
        pveLoseStreak++;
      } else { // 人間プレイヤーが負けたか引き分け
        pveLoseStreak = 0;
      }
    }
    generateAiReflectionMessage(playerMove, opponentMove, playerWon); // AIの考察を生成・表示
  } // gameEnded の if ブロック終了
  return gameEnded; // 勝敗が決まったか否かを返す
}

/**
 * キャラクターの画像を行動に応じて更新する
 * @param {string} player - 'p1' または 'p2'
 * @param {string} move - 'a', 'b', 'c', 's' などの行動
 */
function updateCharacterImage(player, move) {
    const imageElement = (player === 'p1') ? p1CharacterImageElement : p2CharacterImageElement;
    let imagePath = IMAGE_PATH_NORMAL;

    switch (move) {
        case MOVE_ATTACK:
            imagePath = IMAGE_PATH_ATTACK;
            break;
        case MOVE_BLOCK:
            imagePath = IMAGE_PATH_GUARD;
            break;
        case MOVE_CHARGE:
            imagePath = IMAGE_PATH_CHARGE;
            break;
        case MOVE_SPECIAL_ACTION:
            imagePath = IMAGE_PATH_SPECIAL;
            break;
    }
    imageElement.src = imagePath;
}
/*===== 10. ターン処理 =====*/
/**
 * プレイヤーと相手の行動を処理し、リソースを更新し、結果を表示/判定する
 * @param {string} playerMove プレイヤーの行動
 * @param {string} opponentMove 相手の行動
 * @param {boolean} isOnlineGame PvPゲームかどうか (UIメッセージ制御用)
 */
function processMoves(playerMove, opponentMove, isOnlineGame) {
  // 行動に応じてキャラクター画像を更新
  updateCharacterImage('p1', playerMove);
  updateCharacterImage('p2', opponentMove);

  /* 1. リソース更新 */
  let playerActionSoundPlayed = false;
  let opponentActionSoundPlayed = false;

  // エネルギー変動
  if (playerMove === MOVE_CHARGE) { playerEnergy++; playSound('soundTameru'); playerActionSoundPlayed = true; }
  if (opponentMove === MOVE_CHARGE) { opponentEnergy++; playSound('soundTameru'); opponentActionSoundPlayed = true; }
  if (playerMove === MOVE_ATTACK) playerEnergy--;
  if (opponentMove === MOVE_ATTACK) opponentEnergy--;
  if (playerMove === MOVE_SPECIAL_ACTION) playerEnergy -= SPECIAL_ACTION_ENERGY_COST;
  if (opponentMove === MOVE_SPECIAL_ACTION) opponentEnergy -= SPECIAL_ACTION_ENERGY_COST;
  // シールド変動
  if (playerMove === MOVE_BLOCK) playerShield--;
  if (opponentMove === MOVE_BLOCK) opponentShield--;

  // 防御成功時のエネルギー獲得
  if (playerMove === MOVE_BLOCK && opponentMove === MOVE_ATTACK) {
    playerEnergy++;
    playSound('soundGuard');
    playerActionSoundPlayed = true;
  }
  if (opponentMove === MOVE_BLOCK && playerMove === MOVE_ATTACK) {
    opponentEnergy++;
    playSound('soundGuard');
    opponentActionSoundPlayed = true;
  }

  // 攻撃がヒットした場合の音 (防御されず、かつSpecial Actionや攻撃vs溜めで勝敗が決まらない場合)
  if (playerMove === MOVE_ATTACK && opponentMove !== MOVE_BLOCK && opponentMove !== MOVE_SPECIAL_ACTION && opponentMove !== MOVE_CHARGE && !playerActionSoundPlayed) {
    playSound('soundAttack');
  }
  if (opponentMove === MOVE_ATTACK && playerMove !== MOVE_BLOCK && playerMove !== MOVE_SPECIAL_ACTION && playerMove !== MOVE_CHARGE && !opponentActionSoundPlayed) {
    playSound('soundAttack');
  }
  // 行動名の表示用マッピング
  const MOVE_DISPLAY_NAMES = {
    [MOVE_ATTACK]: '攻撃',
    [MOVE_BLOCK]: '防御',
    [MOVE_CHARGE]: '溜め',
    [MOVE_SPECIAL_ACTION]: 'Special Action'
  };
  let p1DisplayName, p2DisplayName;

  if (currentGameMode === GAME_MODE_EVE) {
    p1DisplayName = "AI 1"; // EvEモードのP1はAI1
    p2DisplayName = "AI 2";
  } else if (currentGameMode === GAME_MODE_PVP) {
    p1DisplayName = myPlayerName;
    p2DisplayName = opponentPlayerName;
  } else { // PvE
    p1DisplayName = "あなた";
    p2DisplayName = UI_MSG_AI_OPPONENT_NAME;
  }


  // 新しい行動履歴ログに記録
  currentTurnNumber++;
  const logMessage = `Turn ${currentTurnNumber}: ${p1DisplayName} - ${MOVE_DISPLAY_NAMES[playerMove]} | ${p2DisplayName} - ${MOVE_DISPLAY_NAMES[opponentMove]}`;
  if (turnHistoryLogElement) {
      turnHistoryLogElement.innerHTML += `<div>${logMessage}</div>`;
      turnHistoryLogElement.scrollTop = turnHistoryLogElement.scrollHeight; // 常に最新のログが見えるようにスクロール
  }
  // 2. 行動結果をflashメッセージで表示し、そのコールバックで勝敗判定とUI更新を行う
  const actionDisplayMessage = `${p1DisplayName}:${MOVE_DISPLAY_NAMES[playerMove]}<br>${p2DisplayName}:${MOVE_DISPLAY_NAMES[opponentMove]}`; // 明示的に<br>を使用

  let cutinDuration = FLASH_DEFAULT_DURATION_MS;
  if (currentGameMode === GAME_MODE_PVP) {
    cutinDuration = FLASH_PVP_ACTION_DURATION_MS;
  }

  flashMessage(actionDisplayMessage, cutinDuration, () => {
    const roundEnded = resolveMoves(playerMove, opponentMove); // ラウンドの勝敗判定と状態更新

    if (roundEnded) {
      // resolveMoves内で勝利数更新、UI更新、およびマッチ勝利判定と対応するflashMessageが呼ばれる。
      // マッチが終了していなければ、ラウンド終了のflashMessageもresolveMoves内で呼ばれる。
      // そのflashMessageのコールバックが resetRound または resetMatch になる。
      // ここでは、resolveMovesがflashMessageを呼び出すので、その完了を待つ。
      // flashMessageのコールバックで resetRound/resetMatch が呼ばれるので、
      // ここでさらに何かを呼び出す必要はない。
      // ただし、EvEモードの次のターンは resetRound/resetMatch の後でスケジュールされる必要がある。
      if (player1Wins < WINS_TO_VICTORY && player2Wins < WINS_TO_VICTORY) {
        // マッチが継続する場合のみ、ラウンドリセットの準備
        // (resolveMoves内のラウンド終了flashMessageのコールバックでresetRoundが呼ばれる想定)
        // もしEvEで、マッチが継続するなら、resetRoundの後に次のターンへ
        if (currentGameMode === GAME_MODE_EVE && isEveGameRunning) {
          // resetRoundが呼ばれた後に次のターンをスケジュールする必要がある
          // resetRoundの最後にEvEの次のターンを呼ぶように変更する
        } else if (currentGameMode !== GAME_MODE_EVE) {
           unlockInput(); // PvE, PvPでマッチ継続なら入力解除
        }
      }
    } else {
      // 勝敗が決まらなかった場合 (ゲーム続行):
      showUI();
      handleGameContinue(isOnlineGame);
    }
  });
}

/**
 * プレイヤーのターンを処理する (行動ボタンクリック時に呼び出される)
 * @param {string} playerMove プレイヤーが選択した行動
 */
async function handlePlayerTurn(playerMove) { // TensorFlow.jsのpredictが非同期なのでasyncに変更
  playSound('soundPushbutton'); // ボタンクリック音を最初に再生
  if (isInputLocked || currentGameMode === GAME_MODE_EVE) return; // 入力ロック中またはEvEモード中は何もしない

  // 行動の妥当性チェック (エネルギー、シールド残量)
  // プレイヤーの視点でのリソースチェック
  if (playerMove === MOVE_ATTACK && playerEnergy <= 0) { resultMessageElement.textContent = UI_MSG_INSUFFICIENT_ENERGY; return; }
  if (playerMove === MOVE_SPECIAL_ACTION && playerEnergy < SPECIAL_ACTION_ENERGY_COST) { resultMessageElement.textContent = UI_MSG_INSUFFICIENT_ENERGY; return; }
  if (playerMove === MOVE_BLOCK && playerShield <= 0) { resultMessageElement.textContent = UI_MSG_INSUFFICIENT_SHIELD; return; }
  resultMessageElement.textContent = ''; // エラーメッセージをクリア

  if (currentGameMode === GAME_MODE_PVE) { // PvEモードの場合
    lockInput(); // AIの思考中にプレイヤーの入力をロック
    const aiMove = await aiStrategy(opponentEnergy, opponentShield, playerEnergy, playerShield); // AIの行動を決定 (非同期)

    // AIの視点での状態ベクトル (学習AIが相手側なので、opponentのステータスが"自分")
    const aiStateVector = [opponentEnergy, opponentShield, playerEnergy, playerShield];

    // AIの行動がQ学習対象 (TensorFlow.jsネットワークの学習対象) であれば、軌跡に追加
    if (AI_ACTIONS_FOR_Q_LEARNING.includes(aiMove)) {
      qLearningTrajectory.push({ stateVector: aiStateVector, actionString: aiMove });
    }
    // プレイヤーとAIの行動を処理
    processMoves(playerMove, aiMove, false);
  } else if (currentGameMode === GAME_MODE_PVP) { // PvPモード
    sendMoveFirebase(playerMove); // 選択した行動をFirebaseに送信
    lockInput(); // 相手の行動を待つ間、入力をロック
    onlineMessageElement.textContent = `${myPlayerName}さんの手を選択済。相手の選択を待っています…`; // 待機メッセージを表示 (名入り)
  }
}

/**
 * ゲームが続行する場合の処理 (processMovesのコールバックから呼ばれる)
 * @param {boolean} isOnlineGame
 */
function handleGameContinue(isOnlineGame) {
  if (currentGameMode === GAME_MODE_PVP && isOnlineGame) {
    onlineMessageElement.textContent = UI_MSG_MATCH_READY_CHOOSE_ACTION;
    unlockInput();
  } else if (currentGameMode === GAME_MODE_PVE) {
    unlockInput();
  } else if (currentGameMode === GAME_MODE_EVE && isEveGameRunning) {
    // PvE/EvEモードでゲームが続く場合 (勝敗未決着)、AIに報酬0でQ学習を更新
    // (Special Action同士以外の引き分けや、攻撃vs防御などの場合など)
    setTimeout(runEveGameTurn, EVE_TURN_DELAY_MS); // 次のターンへ
  }
}

/*===== 11. ゲームリセット処理 =====*/
/**
 * ラウンド状態を初期値にリセットする (勝利数はリセットしない)
 */
function resetRound() {
  currentTurnNumber = 0; // ターン数をリセット
  if (turnHistoryLogElement) {
    turnHistoryLogElement.innerHTML = ""; // 行動履歴ログをクリア
  }
  if (aiReflectionLogElement) {
    aiReflectionLogElement.innerHTML = ""; // AI考察ログをクリア
  }

  // キャラクター画像を通常状態に戻す
  p1CharacterImageElement.src = IMAGE_PATH_NORMAL;
  p2CharacterImageElement.src = IMAGE_PATH_NORMAL;

  playerEnergy = 0; opponentEnergy = 0;
  playerShield = PLAYER_INITIAL_SHIELD; opponentShield = PLAYER_INITIAL_SHIELD;

  // PvPモードで、かつマッチがまだ終了していないラウンドリセットの場合、Firebaseの値を更新
  if (currentGameMode === GAME_MODE_PVP && currentRoomRef &&
      player1Wins < WINS_TO_VICTORY && player2Wins < WINS_TO_VICTORY) {
    const resetDataForRound = {
      [`${PLAYER_ROLE_P1}/${FIREBASE_KEY_ENERGY}`]: 0,
      [`${PLAYER_ROLE_P1}/${FIREBASE_KEY_SHIELD}`]: PLAYER_INITIAL_SHIELD,
      [`${PLAYER_ROLE_P2}/${FIREBASE_KEY_ENERGY}`]: 0,
      [`${PLAYER_ROLE_P2}/${FIREBASE_KEY_SHIELD}`]: PLAYER_INITIAL_SHIELD
      // 名前はリセットしない
    };
    currentRoomRef.update(resetDataForRound)
      .then(() => {
        console.log(`Firebase energy/shield reset for new round (PvP match continuing).`);
      })
      .catch(error => {
        console.error(`Error resetting Firebase energy/shield for new round (PvP):`, error);
      });
  }

  showUI(); // UIを初期状態に更新
  resultMessageElement.textContent = ''; // 結果メッセージをクリア

  if (currentGameMode === GAME_MODE_EVE) {
    onlineMessageElement.textContent = UI_MSG_EVE_MODE_ACTIVE;
    lockInput(); // EvEモードでは常に入力をロック
    // showUI()が呼ばれることでボタンは非表示になる
    if (isEveGameRunning && player1Wins < WINS_TO_VICTORY && player2Wins < WINS_TO_VICTORY) { // マッチが継続中のみ
        setTimeout(runEveGameTurn, EVE_TURN_DELAY_MS);
    }
  } else if (currentGameMode === GAME_MODE_PVP) {
    onlineMessageElement.textContent = currentRoomRef ? UI_MSG_CHOOSE_ACTION : '';
    // マッチ継続中かつルーム接続中のみ入力解除
    if (player1Wins < WINS_TO_VICTORY && player2Wins < WINS_TO_VICTORY && currentRoomRef) unlockInput();
  } else { // PvE
    onlineMessageElement.textContent = '';
    if (player1Wins < WINS_TO_VICTORY && player2Wins < WINS_TO_VICTORY) unlockInput(); // マッチ継続中のみ入力解除
  }
  // PvEの場合、qLearningTrajectoryはupdateQ関数内でクリアされる
  // pveLoseStreakは勝敗決定時に更新されるので、ここではリセットしない
}

/**
 * マッチ全体をリセットする (勝利数もリセット)
 */
function resetMatch() {
  player1Wins = 0;
  player2Wins = 0;
  pveLoseStreak = 0; // マッチリセット時にAI連敗記録もリセット
  resetRound(); // ラウンドの状態もリセット
  // resetRound内でEvEの次のターンが呼ばれる場合があるので、showUIはresetRoundの後が良い
  showUI(); // UIを完全に初期状態に更新 (勝利数含む)
  // PvPモードでマッチが終了した場合のFirebaseリセット処理は、
  // resolveMoves内のflashMessageのコールバックに移動しました。
}

/**
 * ゲームモードをリセットし、PvEモードに戻る
 */
function resetGame() {
    if (currentRoomRef) { // もしPvPルームに参加中なら
        currentRoomRef.off(); // Firebaseのリスナーを解除
        currentRoomRef = null; // ルーム参照をクリア
    }
    isEveGameRunning = false; // EvEループを停止
    currentGameMode = GAME_MODE_PVE; // デフォルトはPvE
    onlinePanelElement.style.display = 'none'; // オンラインパネルを非表示
    onlineMessageElement.textContent = ''; // PvP関連のメッセージをクリア
    allActionButtons.forEach(btn => btn.style.display = 'inline-block'); // ボタン再表示
    resetMatch(); // マッチ状態をリセット
    showUI(); // UIを更新
}


/*===== 11a. EvEゲームループ (New) =====*/
/**
 * EvEモードのゲームループを開始する
 */
function startEveGameLoop() {
  if (currentGameMode !== GAME_MODE_EVE) return;
  isEveGameRunning = true;
  // opponentNameDisplayElement は resetGame -> showUI で設定される
  // onlineMessageElement も resetGame で設定される
  resetMatch(); // マッチ状態をリセットして開始 (resetMatch内でresetRoundが呼ばれ、EvEのターンも開始される)
}

/**
 * EvEモードの1ターンを実行する
 */
async function runEveGameTurn() { // aiStrategyが非同期なのでasyncに変更
  if (!isEveGameRunning || currentGameMode !== GAME_MODE_EVE) {
    // isEveGameRunning = false; // ここで止めるとループが意図せず終了する可能性
    return;
  }

  // AI1 (player側, 学習AI) の行動決定 - ゲームが終了していない場合のみ
  const ai1Move = await aiStrategy(playerEnergy, playerShield, opponentEnergy, opponentShield); // 非同期呼び出し

  // AI1の視点での状態ベクトル (学習AIがプレイヤー側なので、playerのステータスが"自分")
  const ai1StateVector = [playerEnergy, playerShield, opponentEnergy, opponentShield];

  // AI1の行動がQ学習対象であれば軌跡に追加
  if (AI_ACTIONS_FOR_Q_LEARNING.includes(ai1Move)) {
    qLearningTrajectory.push({ stateVector: ai1StateVector, actionString: ai1Move });
  }

  // AI2 (opponent側, AI1と同じ戦略ロジックを使用) の行動決定
  // AI2は学習対象外なので、その行動は軌跡に記録しない (もしAI2も学習させるなら別途軌跡が必要)
  // AI2も同じネットワークを使う場合（ミラーマッチ）
  const ai2Move = await aiStrategy(opponentEnergy, opponentShield, playerEnergy, playerShield); // 非同期呼び出し
  // もしAI2が別のロジック(例: 旧Qテーブルやランダム)なら、それを呼び出す

  processMoves(ai1Move, ai2Move, false); // isOnlineGame = false
}

/*===== 11b. AI考察生成 (New) =====*/
/**
 * ゲーム終了時にAIの考察メッセージを生成し表示する
 * @param {string} p1LastMove プレイヤー1 (あなた or AI1) の最終手
 * @param {string} p2LastMove プレイヤー2 (AI or AI2) の最終手
 * @param {boolean|null} p1Won プレイヤー1が勝利したか (true:勝利, false:敗北, null:引き分け)
 */
function generateAiReflectionMessage(p1LastMove, p2LastMove, p1Won) {
  if (!aiReflectionLogElement) return;
  let reflection = "";

  // 考察対象のAI (PvEなら相手AI、EvEならAI1とAI2両方)
  // 今回はシンプルに、PvEの相手AI、またはEvEのAI1の視点での考察を生成

  let aiPlayerName = "";
  let aiWon;
  let aiLastMove;
  let humanOrOpponentAiLastMove;
  let aiEnergyAtEnd;
  let opponentEnergyAtEnd;

  // 行動名の表示用マッピング (ローカル変数として定義)
  const MOVE_DISPLAY_NAMES = {
    [MOVE_ATTACK]: '攻撃',
    [MOVE_BLOCK]: '防御',
    [MOVE_CHARGE]: '溜め',
    [MOVE_SPECIAL_ACTION]: 'Special Action'
  };


  if (currentGameMode === GAME_MODE_PVE) {
    aiPlayerName = UI_MSG_AI_OPPONENT_NAME;
    aiWon = p1Won === false; // AIが勝ったか
    aiLastMove = p2LastMove;
    humanOrOpponentAiLastMove = p1LastMove;
    aiEnergyAtEnd = opponentEnergy; // 決着時のAIのエネルギー
    opponentEnergyAtEnd = playerEnergy; // 決着時の相手(人間)のエネルギー
  } else if (currentGameMode === GAME_MODE_EVE) {
    // EvEの場合、AI1の視点で考察 (AI2の考察も追加可能)
    aiPlayerName = "AI 1";
    aiWon = p1Won;
    aiLastMove = p1LastMove;
    humanOrOpponentAiLastMove = p2LastMove;
    aiEnergyAtEnd = playerEnergy; // 決着時のAI1のエネルギー
    opponentEnergyAtEnd = opponentEnergy; // 決着時のAI2のエネルギー
  } else {
    aiReflectionLogElement.innerHTML = ""; // PvPでは考察なし
    return;
  }

  if (aiWon === true) {
    reflection += `<b>${aiPlayerName}の勝利考察:</b> `;
    if (aiLastMove === MOVE_SPECIAL_ACTION) {
      reflection += "Special Actionでの勝利は効果的だった。";
    } else if (aiLastMove === MOVE_ATTACK && humanOrOpponentAiLastMove === MOVE_CHARGE) {
      reflection += "相手が溜めている隙に攻撃できたのが勝因だ。";
    } else {
      reflection += `最終的にエネルギー(${aiEnergyAtEnd})と行動(${MOVE_DISPLAY_NAMES[aiLastMove]})のバランスが良かった。`;
    }
  } else if (aiWon === false) {
    reflection += `<b>${aiPlayerName}の反省点:</b> `;
    if (humanOrOpponentAiLastMove === MOVE_SPECIAL_ACTION) {
      reflection += "相手のSpecial Actionを警戒すべきだった。";
    } else if (humanOrOpponentAiLastMove === MOVE_ATTACK && aiLastMove === MOVE_CHARGE) {
      reflection += "溜めている最中に攻撃されてしまった。リスク管理が甘かったかもしれない。";
    } else {
      reflection += `相手の最終行動(${MOVE_DISPLAY_NAMES[humanOrOpponentAiLastMove]})に対し、こちらの行動(${MOVE_DISPLAY_NAMES[aiLastMove]})は最適ではなかったかもしれない。エネルギー管理(${aiEnergyAtEnd})も見直す必要がある。`;
    }
  } else { // 引き分け
    reflection += `<b>${aiPlayerName}の考察:</b> 引き分け。お互いのSpecial Actionがぶつかったか、あるいは他の要因か。次の戦略を練ろう。`;
  }

  aiReflectionLogElement.innerHTML = reflection;
}

/*===== 12. UIボタンイベントリスナー =====*/
chargeButtonElement.onclick = () => handlePlayerTurn(MOVE_CHARGE);
blockButtonElement.onclick = () => handlePlayerTurn(MOVE_BLOCK);
attackButtonElement.onclick = () => handlePlayerTurn(MOVE_ATTACK);
specialActionButtonElement.onclick = () => handlePlayerTurn(MOVE_SPECIAL_ACTION);

// PvEモード選択ボタン
pveModeButtonElement.onclick = () => {
  playSound('soundPushbutton');
  resetGame(); // ゲーム全体をリセットしてPvEモードへ
};
// EvEモード選択ボタン (New)
eveModeButtonElement.onclick = () => {
  playSound('soundPushbutton');
  if (currentRoomRef) { // もしPvPルームに参加中なら
    currentRoomRef.off(); // Firebaseのリスナーを解除
    currentRoomRef = null; // ルーム参照をクリア
  }
  isEveGameRunning = false; // 念のため一度停止
  currentGameMode = GAME_MODE_EVE;
  onlinePanelElement.style.display = 'none';
  onlineMessageElement.textContent = UI_MSG_EVE_MODE_ACTIVE; // EvEモード中のメッセージ
  // ボタン表示/ロックは resetGame と showUI で処理される
  startEveGameLoop(); // EvEゲームループを開始 (内部でresetMatchが呼ばれる)
};
// PvPモード選択ボタン
pvpModeButtonElement.onclick = () => {
  playSound('soundPushbutton');
  if (currentRoomRef) { // もしPvPルームに参加中なら
    currentRoomRef.off(); // Firebaseのリスナーを解除
    currentRoomRef = null; // ルーム参照をクリア
  }
  isEveGameRunning = false; // EvEループを停止
  currentGameMode = GAME_MODE_PVP;
  onlinePanelElement.style.display = 'block';
  // ボタン表示はresetGame -> showUI で処理される
  allActionButtons.forEach(btn => btn.style.display = 'inline-block'); // ボタン再表示
  resetMatch(); // マッチ状態をリセット (ルームIDなどはリセットされない)
  showUI(); // UIを更新してデフォルト名を表示
};
// ルーム作成ボタン
createRoomButtonElement.onclick = createRoom;
// ルーム参加ボタン
joinRoomButtonElement.onclick = () => joinRoom(joinRoomIdInputElement.value.trim()); // 入力されたIDでルームに参加

/*===== 13. 初期化 =====*/
// ゲーム開始時に一度だけ実行
initializeQNetwork().then(() => { // TensorFlow.jsモデルを初期化/ロードしてからゲーム開始
    resetMatch(); // ゲームを初期状態にリセットして開始
});