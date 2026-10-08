/* ============================================================
 *  合成大奶娃 · 破解版 —— 本地排行榜
 *
 *  完全替代原版的 leaderboard.min.js（那个走 TinyWebDB 联网、且带着
 *  原作者账号）。本模块的特点：
 *    · 零网络请求，纯 localStorage，离线/飞行模式一样能用
 *    · 只保存本机成绩，不涉及任何第三方账号
 *    · 保留原版那一套 DOM 契约（boardList / submitMsg / myNameLabel ...），
 *      所以 game.js 里的 settle() 不用改
 * ============================================================ */
(function () {
  'use strict';

  var BOARD_KEY = 'danaiwa.localboard.v1';   // [{n:昵称, s:分数, t:时间戳}]
  var NAME_KEY  = 'danaiwa.name.v1';         // 与 key 名保持独立，免得和原版混用
  var MAX_ROWS  = 30;                        // 本机榜最多记多少条
  var DEFAULT_NAME = '默认用户';
  var MAX_SCORE = 99999999;

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- 存储 ---------------- */

  function readBoard() {
    var raw;
    try { raw = localStorage.getItem(BOARD_KEY); } catch (e) { return []; }
    if (!raw) return [];
    var arr;
    try { arr = JSON.parse(raw); } catch (e) { return []; }
    if (!Array.isArray(arr)) return [];
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var r = arr[i];
      if (!r || typeof r !== 'object') continue;
      var s = Number(r.s);
      if (!isFinite(s) || s <= 0 || s > MAX_SCORE) continue;
      var t = Number(r.t);
      out.push({
        n: String(r.n || DEFAULT_NAME).slice(0, 12),
        s: s,
        t: isFinite(t) && t > 0 ? t : 0
      });
    }
    /* 分数降序；同分时新的排前面 */
    out.sort(function (a, b) { return (b.s - a.s) || (b.t - a.t); });
    return out.slice(0, MAX_ROWS);
  }

  function writeBoard(rows) {
    try { localStorage.setItem(BOARD_KEY, JSON.stringify(rows)); } catch (e) { /* 私隐模式等，忽略 */ }
  }

  /* 返回这条成绩在本机榜里的排名（1 起），没进榜返回 0 */
  function insertScore(name, score) {
    var s = Number(score) || 0;
    if (!(s > 0) || s > MAX_SCORE) return 0;
    var rows = readBoard();
    /* 用 id 标记自己这一条：分数和时间戳都可能撞车，光比数值会认错行 */
    var id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    rows.push({ n: cleanName(name) || DEFAULT_NAME, s: s, t: Date.now(), id: id });
    rows.sort(function (a, b) { return (b.s - a.s) || (b.t - a.t); });
    var rank = 0;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) { rank = i + 1; break; }
    }
    writeBoard(rows.slice(0, MAX_ROWS));
    return rank <= MAX_ROWS ? rank : 0;
  }

  /* 这份分数能不能进榜（用于游戏结束时给一句合适的提示） */
  function isTopScore(score) {
    var s = Number(score) || 0;
    if (!(s > 0)) return false;
    var rows = readBoard();
    if (rows.length < MAX_ROWS) return true;
    return s > rows[rows.length - 1].s;
  }

  /* ---------------- 昵称 ---------------- */

  function cleanName(raw) {
    var n = String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
    if (n.length > 12) n = n.slice(0, 12);
    return n;
  }

  function loadName() {
    try { return cleanName(localStorage.getItem(NAME_KEY) || ''); } catch (e) { return ''; }
  }

  function saveName(n) {
    try { localStorage.setItem(NAME_KEY, cleanName(n)); } catch (e) { /* 忽略 */ }
  }

  function myName() { return loadName() || DEFAULT_NAME; }

  /* ---------------- 渲染 ---------------- */

  var listEl   = $('boardList');
  var modal    = $('boardModal');
  var msgEl    = $('submitMsg');
  var nickInput = $('nickInput');
  var nameLabel = $('myNameLabel');
  var submitBox = $('submitBox');
  var pendingScore = 0;
  var justRank = 0;

  function setMsg(text, kind) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.className = 'submit-msg' + (kind ? ' is-' + kind : '');
  }

  function paintName() {
    var n = myName();
    if (nameLabel) nameLabel.textContent = n;
    if (nickInput && document.activeElement !== nickInput) nickInput.value = loadName();
  }

  function boardMessage(text) {
    if (!listEl) return;
    listEl.textContent = '';
    var p = document.createElement('p');
    p.className = 'board-empty';
    p.textContent = text;
    listEl.appendChild(p);
  }

  function rankClass(i) {
    return i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '';
  }

  function renderBoard(rows, markedScore) {
    if (!listEl) return;
    listEl.textContent = '';
    if (!rows.length) {
      boardMessage('这台设备上还没有成绩，先去玩一局吧！');
      return;
    }
    var marked = false;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var line = document.createElement('div');
      line.className = 'board-row ' + rankClass(i);

      var rank = document.createElement('span');
      rank.className = 'board-rank';
      rank.textContent = i < 3 ? ['🥇', '🥈', '🥉'][i] : String(i + 1);

      var name = document.createElement('span');
      name.className = 'board-name';
      name.textContent = row.n;

      var score = document.createElement('span');
      score.className = 'board-score';
      score.textContent = row.s;

      line.appendChild(rank);
      line.appendChild(name);
      line.appendChild(score);

      if (!marked && markedScore != null && row.s === markedScore) {
        line.classList.add('is-mine');
        marked = true;
      }
      listEl.appendChild(line);
    }
  }

  function refreshBoard(markedScore) {
    var rows = readBoard();
    renderBoard(rows, markedScore == null ? null : Number(markedScore));
    return rows;
  }

  /* ---------------- 弹窗 ---------------- */

  function openBoard(markedScore) {
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    refreshBoard(markedScore);
  }

  function closeBoard() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  function clearBoard() {
    if (!window.confirm('清空本机榜上的所有成绩？（这个操作不能撤销）')) return;
    writeBoard([]);
    refreshBoard(null);
  }

  /* ---------------- 游戏结束结算 ---------------- */

  function onGameOver(score) {
    if (!submitBox) return;
    pendingScore = Number(score) || 0;
    paintName();
    if (!(pendingScore > 0)) {           // 0 分不记录，容器收起
      submitBox.style.display = 'none';
      return;
    }
    submitBox.style.display = '';
    var qualifies = isTopScore(pendingScore);
    justRank = insertScore(myName(), pendingScore);
    refreshBoard(pendingScore);
    if (qualifies && justRank > 0) {
      setMsg('已记入本机榜 ✓　第 ' + justRank + ' 名 · ' + pendingScore + ' 分', 'good');
    } else {
      setMsg('未进前 ' + MAX_ROWS + '，本机榜没动　·　' + pendingScore + ' 分', '');
    }
  }

  /* ---------------- 绑定 ---------------- */

  function bind() {
    var b1 = $('boardBtn');   if (b1) b1.addEventListener('click', function () { openBoard(null); });
    var b2 = $('boardBtn2');  if (b2) b2.addEventListener('click', function () { openBoard(pendingScore || null); });
    var c1 = $('boardClose'); if (c1) c1.addEventListener('click', closeBoard);
    var c2 = $('boardClose2'); if (c2) c2.addEventListener('click', closeBoard);
    var cl = $('boardClear'); if (cl) cl.addEventListener('click', clearBoard);

    if (modal) {
      modal.addEventListener('click', function (e) { if (e.target === modal) closeBoard(); });
    }

    if (nickInput) {
      nickInput.value = loadName();
      var commit = function () {
        saveName(nickInput.value);
        nickInput.value = loadName();
        paintName();
      };
      nickInput.addEventListener('change', commit);
      nickInput.addEventListener('blur', commit);
      nickInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); commit(); nickInput.blur(); }
      });
    }

    var editNameBtn = $('editNameBtn');
    if (editNameBtn) {
      editNameBtn.addEventListener('click', function () {
        openBoard(pendingScore || null);
        if (nickInput) setTimeout(function () { nickInput.focus(); nickInput.select(); }, 260);
      });
    }

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeBoard();
    });

    paintName();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

  /* 对外接口：game.js 的 settle() 会调用 onGameOver；其余给控制台/自测用 */
  window.DanaiwaBoard = {
    onGameOver: onGameOver,
    open: openBoard,
    close: closeBoard,
    refresh: refreshBoard,
    clear: clearBoard,
    top: readBoard,
    insertScore: insertScore,
    isTopScore: isTopScore,
    myName: myName,
    setName: function (n) { saveName(n); paintName(); },
    hasName: function () { return !!loadName(); },
    MAX_ROWS: MAX_ROWS,
    STORAGE_KEY: BOARD_KEY
  };
})();
