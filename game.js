/* =================================================================
   SNAKE — Jade Arcade · 游戏逻辑
   纯原生 JS + HTML5 Canvas,无任何依赖。
   ================================================================= */
(function () {
  'use strict';

  // ---------- 配置 ----------
  var CONFIG = {
    cols: 21,            // 棋盘列数(正方形)
    rows: 21,
    startTPS: 7,         // 起始速度:每秒移动步数 (ticks per second)
    maxTPS: 15,          // 速度上限
    tpsStep: 0.35,       // 每吃一个食物提速
    points: 10,          // 每个食物得分
    storageKey: 'snake.jade.best'
  };

  // ---------- DOM ----------
  var canvas   = document.getElementById('game');
  var ctx      = canvas.getContext('2d');
  var scoreEl  = document.getElementById('score');
  var bestEl   = document.getElementById('best');

  var ovStart  = document.getElementById('overlay-start');
  var ovPause  = document.getElementById('overlay-pause');
  var ovOver   = document.getElementById('overlay-over');
  var finalScoreEl = document.getElementById('final-score');
  var finalBestEl  = document.getElementById('final-best');
  var newBestEl    = document.getElementById('new-best');

  var pauseBtn   = document.getElementById('btn-pause');
  var pauseLabel = document.getElementById('pause-label');
  var soundBtn   = document.getElementById('btn-sound');
  var soundIco   = document.getElementById('sound-ico');
  var soundLabel = document.getElementById('sound-label');

  // ---------- 状态 ----------
  var STATE = { IDLE: 'idle', RUNNING: 'running', PAUSED: 'paused', OVER: 'over' };
  var state = STATE.IDLE;

  var snake, dir, inputQueue, food, score, best, tps;
  var acc = 0, lastTs = 0;        // tick 累加器
  var eatPulse = 0;               // 吃到食物的视觉脉冲 [0..1]
  var cell = 0, dpr = 1;          // 渲染:格子像素尺寸 / 设备像素比
  var soundOn = true;

  var DIRS = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y: 1 },
    left:  { x: -1, y: 0 },
    right: { x: 1,  y: 0 }
  };

  // localStorage 安全封装:storage 被禁用 / 隐私模式 / sandboxed iframe(缺
  // allow-same-origin)下,访问 localStorage 即抛 SecurityError。这里兜底为内存值,
  // 绝不阻断游戏初始化与判负流程 —— best 退化为本局有效(不持久)。
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  best = parseInt(safeGet(CONFIG.storageKey) || '0', 10) || 0;
  bestEl.textContent = best;

  // ===================================================================
  //  布局 / 高分屏适配
  // ===================================================================
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var sizeCss = canvas.clientWidth;            // CSS 像素(正方形)
    if (!sizeCss) return;
    canvas.width  = Math.round(sizeCss * dpr);
    canvas.height = Math.round(sizeCss * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);      // 以 CSS 像素绘制
    cell = sizeCss / CONFIG.cols;
    draw();
  }

  // ===================================================================
  //  游戏控制
  // ===================================================================
  function reset() {
    var cx = Math.floor(CONFIG.cols / 2);
    var cy = Math.floor(CONFIG.rows / 2);
    snake = [
      { x: cx,     y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy }
    ];
    dir = DIRS.right;
    inputQueue = [];
    score = 0;
    tps = CONFIG.startTPS;
    eatPulse = 0;
    acc = 0;
    scoreEl.textContent = '0';
    spawnFood();
  }

  function start() {
    reset();
    state = STATE.RUNNING;
    hideOverlay(ovStart);
    hideOverlay(ovOver);
    hideOverlay(ovPause);
    lastTs = 0;
    draw();                 // 立即呈现新棋盘,消除 retry 瞬间的旧定格残留
  }

  function togglePause() {
    if (state === STATE.RUNNING) {
      state = STATE.PAUSED;
      showOverlay(ovPause);
      setPauseLabel(true);
    } else if (state === STATE.PAUSED) {
      state = STATE.RUNNING;
      hideOverlay(ovPause);
      setPauseLabel(false);
      lastTs = 0;
    }
  }

  function gameOver() {
    state = STATE.OVER;
    var isNewBest = false;
    if (score > best) {
      best = score;
      safeSet(CONFIG.storageKey, String(best));   // 写失败也不阻断:best 退化为内存值
      bestEl.textContent = best;
      isNewBest = true;
    }
    finalScoreEl.textContent = score;
    finalBestEl.textContent = best;
    newBestEl.hidden = !isNewBest;
    showOverlay(ovOver);
    setPauseLabel(false);
    beep('over');
  }

  // ===================================================================
  //  输入
  // ===================================================================
  function queueDir(name) {
    var nd = DIRS[name];
    if (!nd) return;
    // 与队列末尾(或当前方向)对比:不允许反向、不允许重复
    var last = inputQueue.length ? inputQueue[inputQueue.length - 1] : dir;
    if (nd.x === -last.x && nd.y === -last.y) return;
    if (nd.x === last.x && nd.y === last.y) return;
    if (inputQueue.length < 2) inputQueue.push(nd);
  }

  // 方向输入的统一入口:游戏未开始时,按方向键也直接开局
  function handleDir(name) {
    if (state === STATE.IDLE || state === STATE.OVER) {
      start();
      queueDir(name);
      return;
    }
    if (state === STATE.RUNNING) queueDir(name);
  }

  // ===================================================================
  //  逻辑 tick
  // ===================================================================
  function tick() {
    if (!food) return;            // 防御:棋盘填满后 food 为 null(此刻理论上已非 RUNNING)
    if (inputQueue.length) dir = inputQueue.shift();

    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // 撞墙
    if (head.x < 0 || head.x >= CONFIG.cols || head.y < 0 || head.y >= CONFIG.rows) {
      return gameOver();
    }

    var willGrow = (head.x === food.x && head.y === food.y);
    // 撞自身:若本步不增长,尾巴会让出当前格,故末段可忽略
    var body = willGrow ? snake : snake.slice(0, snake.length - 1);
    for (var i = 0; i < body.length; i++) {
      if (body[i].x === head.x && body[i].y === head.y) return gameOver();
    }

    snake.unshift(head);

    if (willGrow) {
      score += CONFIG.points;
      scoreEl.textContent = score;
      bumpScore();
      tps = Math.min(CONFIG.maxTPS, tps + CONFIG.tpsStep);
      eatPulse = 1;
      beep('eat');
      if (!spawnFood()) return win();   // 棋盘填满 = 通关
    } else {
      snake.pop();
    }
  }

  function spawnFood() {
    var free = CONFIG.cols * CONFIG.rows - snake.length;
    if (free <= 0) { food = null; return false; }
    // 在空格中随机挑一个(对随机索引线性定位,均匀且无碰撞重试)
    var target = Math.floor(Math.random() * free);
    var occupied = {};
    for (var i = 0; i < snake.length; i++) occupied[snake[i].x + ',' + snake[i].y] = true;
    var idx = 0;
    for (var y = 0; y < CONFIG.rows; y++) {
      for (var x = 0; x < CONFIG.cols; x++) {
        if (occupied[x + ',' + y]) continue;
        if (idx === target) { food = { x: x, y: y }; return true; }
        idx++;
      }
    }
    return true;
  }

  function win() {
    // 极罕见:蛇填满棋盘。按胜利处理为一局结束。
    gameOver();
  }

  // ===================================================================
  //  渲染
  // ===================================================================
  function draw() {
    if (!cell) return;
    var size = CONFIG.cols * cell;
    ctx.clearRect(0, 0, size, size);

    drawGrid(size);
    if (food) drawFood();
    if (snake) drawSnake();
  }

  function drawGrid(size) {
    ctx.fillStyle = 'rgba(94,234,212,0.05)';
    var r = Math.max(1, cell * 0.045);
    for (var y = 0; y < CONFIG.rows; y++) {
      for (var x = 0; x < CONFIG.cols; x++) {
        var cxp = x * cell + cell / 2;
        var cyp = y * cell + cell / 2;
        ctx.beginPath();
        ctx.arc(cxp, cyp, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  function lerpColor(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function drawSnake() {
    var C_HEAD = [153, 246, 228];   // #99f6e4
    var C_TAIL = [13, 148, 136];    // #0d9488
    var n = snake.length;
    var pad = cell * 0.10;
    var seg = cell - pad * 2;
    var rad = seg * 0.32;

    for (var i = n - 1; i >= 0; i--) {
      var s = snake[i];
      var t = n === 1 ? 0 : i / (n - 1);     // 0=头, 1=尾
      var col = lerpColor(C_HEAD, C_TAIL, t);
      var px = s.x * cell + pad;
      var py = s.y * cell + pad;

      ctx.save();
      if (i === 0) {
        ctx.shadowColor = 'rgba(94,234,212,0.55)';
        ctx.shadowBlur = cell * 0.6;
      }
      ctx.fillStyle = 'rgb(' + col[0] + ',' + col[1] + ',' + col[2] + ')';
      roundRect(px, py, seg, seg, rad);
      ctx.fill();
      ctx.restore();
    }
    drawEyes();
  }

  function drawEyes() {
    var head = snake[0];
    var cx = head.x * cell + cell / 2;
    var cy = head.y * cell + cell / 2;
    var eye = cell * 0.11;
    var fwd = cell * 0.20;        // 沿朝向前移
    var side = cell * 0.22;       // 两眼分居中轴两侧
    var bx = cx + dir.x * fwd;
    var by = cy + dir.y * fwd;
    var perpX = dir.y;            // 方向向量旋转 90°
    var perpY = -dir.x;
    drawDot(bx + perpX * side, by + perpY * side, eye);
    drawDot(bx - perpX * side, by - perpY * side, eye);
  }

  function drawDot(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#06231f';
    ctx.fill();
  }

  function drawFood() {
    var fx = food.x * cell + cell / 2;
    var fy = food.y * cell + cell / 2;
    var base = cell * 0.32;
    // 持续脉动 + 新食物生成瞬间的回弹:eatPulse 在吃到那一刻置 1,逐帧衰减,
    // 让新食物从放大态回弹到常态(pop-in 反馈)。
    var pulse = 1 + Math.sin(performance.now() / 220) * 0.10;
    var pop = 1 + eatPulse * 0.45;
    var r = base * pulse * pop;

    ctx.save();
    ctx.shadowColor = 'rgba(251,113,133,0.65)';
    ctx.shadowBlur = cell * 0.9;
    var grd = ctx.createRadialGradient(fx - r * 0.3, fy - r * 0.3, r * 0.1, fx, fy, r);
    grd.addColorStop(0, '#fecdd3');
    grd.addColorStop(0.5, '#fb7185');
    grd.addColorStop(1, '#e11d48');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 高光点
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.arc(fx - r * 0.32, fy - r * 0.32, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===================================================================
  //  主循环
  // ===================================================================
  function loop(ts) {
    requestAnimationFrame(loop);

    if (state === STATE.RUNNING) {
      if (!lastTs) lastTs = ts;
      var dt = (ts - lastTs) / 1000;
      lastTs = ts;
      if (dt > 0.25) dt = 0.25;                  // 防止切回标签页后大跳
      acc += dt;
      var step = 1 / tps;
      while (acc >= step && state === STATE.RUNNING) {
        acc -= step;
        tick();
      }
    } else {
      lastTs = 0;
    }

    if (eatPulse > 0) eatPulse = Math.max(0, eatPulse - 0.06);
    // 仅运行态逐帧重绘(蛇移动 / 食物脉动需要);IDLE/PAUSED/OVER 为静止画面,
    // 由状态切换处(layout / 上一帧定格)各画一帧即可,避免空转 441 格网格
    // + shadowBlur(canvas 最贵操作之一)常驻 60fps,省低端移动端功耗。
    if (state === STATE.RUNNING) draw();
  }

  // ===================================================================
  //  UI 辅助
  // ===================================================================
  function showOverlay(el) { el.classList.add('show'); }
  function hideOverlay(el) { el.classList.remove('show'); }

  function setPauseLabel(paused) {
    pauseLabel.textContent = paused ? '继续' : '暂停';
  }

  var bumpTimer = null;
  function bumpScore() {
    scoreEl.classList.add('bump');
    clearTimeout(bumpTimer);
    bumpTimer = setTimeout(function () { scoreEl.classList.remove('bump'); }, 130);
  }

  // ===================================================================
  //  音效(WebAudio,极简方波 blip)
  // ===================================================================
  var audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }
  function beep(kind) {
    if (!soundOn || !audioCtx) return;
    try {
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      var now = audioCtx.currentTime;
      if (kind === 'eat') {
        o.type = 'square'; o.frequency.setValueAtTime(660, now);
        o.frequency.exponentialRampToValueAtTime(990, now + 0.08);
        g.gain.setValueAtTime(0.05, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
        o.start(now); o.stop(now + 0.13);
      } else { // over
        o.type = 'sawtooth'; o.frequency.setValueAtTime(440, now);
        o.frequency.exponentialRampToValueAtTime(110, now + 0.4);
        g.gain.setValueAtTime(0.06, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        o.start(now); o.stop(now + 0.46);
      }
    } catch (e) { /* 静默失败 */ }
  }

  function toggleSound() {
    soundOn = !soundOn;
    if (soundOn) ensureAudio();
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundIco.textContent = soundOn ? '🔊' : '🔇';
    soundLabel.textContent = soundOn ? '音效' : '静音';
  }

  // ===================================================================
  //  事件绑定
  // ===================================================================
  var KEY_MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right'
  };

  window.addEventListener('keydown', function (e) {
    ensureAudio();
    var k = e.key;
    if (KEY_MAP[k]) {
      e.preventDefault();
      handleDir(KEY_MAP[k]);
      return;
    }
    if (k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      if (state === STATE.IDLE || state === STATE.OVER) start();
      else togglePause();
    } else if (k === 'p' || k === 'P') {
      if (state === STATE.RUNNING || state === STATE.PAUSED) togglePause();
    } else if (k === 'r' || k === 'R') {
      start();
    }
  });

  // 屏幕方向键
  document.querySelectorAll('.dpad button[data-dir]').forEach(function (b) {
    b.addEventListener('click', function () {
      ensureAudio();
      handleDir(b.getAttribute('data-dir'));
    });
  });

  // 触屏滑动(在游戏屏上)
  var touchStart = null;
  var screenEl = document.querySelector('.screen');
  screenEl.addEventListener('touchstart', function (e) {
    ensureAudio();
    var t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  screenEl.addEventListener('touchmove', function (e) {
    if (!touchStart) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchStart.x;
    var dy = t.clientY - touchStart.y;
    var TH = 24;
    if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
    e.preventDefault();
    if (Math.abs(dx) > Math.abs(dy)) handleDir(dx > 0 ? 'right' : 'left');
    else handleDir(dy > 0 ? 'down' : 'up');
    touchStart = { x: t.clientX, y: t.clientY };   // 连续滑动可连续转向
  }, { passive: false });

  screenEl.addEventListener('touchend', function () { touchStart = null; }, { passive: true });

  // 按钮
  document.getElementById('btn-start').addEventListener('click', function () { ensureAudio(); start(); });
  document.getElementById('btn-resume').addEventListener('click', function () { togglePause(); });
  document.getElementById('btn-retry').addEventListener('click', function () { ensureAudio(); start(); });
  document.getElementById('btn-restart').addEventListener('click', function () { ensureAudio(); start(); });
  pauseBtn.addEventListener('click', function () {
    if (state === STATE.IDLE || state === STATE.OVER) start();
    else togglePause();
  });
  soundBtn.addEventListener('click', function () { ensureAudio(); toggleSound(); });

  // 尺寸自适应:优先 ResizeObserver(精准观察 canvas 盒尺寸),不支持时回退
  // window.resize —— 二选一,避免两者并存导致 layout() 双触发。
  if (window.ResizeObserver) {
    new ResizeObserver(layout).observe(canvas);
  } else {
    window.addEventListener('resize', layout);
  }
  // 切回前台时暂停态保护,避免误判超时跳步
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === STATE.RUNNING) togglePause();
  });

  // ===================================================================
  //  启动
  // ===================================================================
  reset();                 // 初始化棋盘以便预览
  state = STATE.IDLE;
  layout();
  requestAnimationFrame(loop);
})();
