/* ============================================================
   熊镜上羽 · 博客
   1) 主题   2) 导航/抽屉   3) 进场动画
   4) GitHub 项目   5) 旅行相册（翻页）   6) 大图查看   7) 公众号弹窗
   ============================================================ */
(function () {
  'use strict';

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /** 转义，拼 HTML 时用（旅行文案来自 JSON，必须过一遍） */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------- 1. 主题 */
  var THEME_KEY = 'theme';
  var root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* 隐私模式下 localStorage 可能不可用，忽略 */
    }
    var label = document.getElementById('themeLabel');
    if (label) label.textContent = theme === 'dark' ? '浅色' : '深色';
  }

  function savedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  // 暗色优先：没有存过偏好就用 dark
  applyTheme(savedTheme() || 'dark');

  function toggleTheme() {
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  ['themeToggle', 'themeToggleMobile'].forEach(function (id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', toggleTheme);
  });

  /* ------------------------------------------------- 2. 抽屉 + 滚动高亮 */
  var menuBtn = $('#menuBtn');
  var drawer = $('#drawer');

  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
  }

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () {
      var open = drawer.hidden;
      drawer.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', closeDrawer);
    });
    document.addEventListener('click', function (e) {
      if (!drawer.hidden && !drawer.contains(e.target) && !menuBtn.contains(e.target)) {
        closeDrawer();
      }
    });
  }

  var navLinks = $$('.rail-link, .drawer-nav a');
  var railIndicator = $('.rail-indicator');
  var railProgress = $('#railProgress');

  /** 让左侧那条指示条滑到当前章节所在的条目上 */
  function moveIndicator(id) {
    if (!railIndicator) return;
    var link = null;
    $$('.rail-link').forEach(function (a) {
      if (a.getAttribute('data-nav') === id) link = a;
    });
    if (!link) return;
    railIndicator.style.transform =
      'translateY(' + Math.round(link.offsetTop + link.offsetHeight / 2 - 7.5) + 'px)';
    railIndicator.classList.add('is-ready');
  }

  function setActive(id) {
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-nav') === id);
    });
    moveIndicator(id);
  }

  /** 侧栏右侧那条细线：当前阅读进度 */
  function updateProgress() {
    if (!railProgress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    railProgress.style.height = (pct * 100).toFixed(2) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  var sections = $$('main section[id]');
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach(function (s) {
      spy.observe(s);
    });
  }

  /* ---------------------------------------------------------- 3. 进场 */
  var revealObserver = null;

  function observeReveals(scope) {
    var items = $$('.reveal:not(.is-visible)', scope || document);
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries, obs) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
      );
    }
    items.forEach(function (el, i) {
      // 同组元素依次错开一点，像苹果那样一片片浮上来
      if (!el.style.getPropertyValue('--delay')) {
        el.style.setProperty('--delay', Math.min(i, 5) * 80 + 'ms');
      }
      revealObserver.observe(el);
    });
  }

  /* ------------------------------------------------- 4. GitHub 项目 */
  var GH_USER = 'shangyu-xiong';
  // 本站自己的源码，不放进项目展示
  var GH_EXCLUDE = ['blog'];
  // 想置顶的项目（按这个顺序排在前面）
  var GH_FEATURED = ['mmc-helper'];
  // 给项目加一句人话，API 里没有这个字段
  var GH_NOTES = {
    'mmc-helper':
      '数学建模比赛全程陪跑：四阶段状态机 + 建模手／编程手／论文手／审核手四角色协作，不绑定平台和工具。'
  };
  var GH_MAX = 9;

  // 拉不到 GitHub API 时用这份兜底，保证页面不留白
  var GH_FALLBACK = [
    {
      name: 'mmc-helper',
      html_url: 'https://github.com/shangyu-xiong/mmc-helper',
      description:
        '数学建模竞赛全程辅助 Skill：四阶段状态机 + 建模手/编程手/论文手/审核手四角色协作 + 三查两证质检；不绑定平台、语言与排版工具。A full-workflow agent skill for mathematical modeling competitions (CUMCM / MCM-ICM).',
      language: 'TeX',
      stargazers_count: 1,
      pushed_at: '2026-09-20T02:08:11Z',
      topics: [
        'agent-skill',
        'agent-skills',
        'ai-agent',
        'competition',
        'cumcm',
        'llm-agents',
        'math-modeling',
        'mathematical-modeling',
        'mcm-icm',
        'workflow'
      ]
    }
  ];

  var LANG_COLORS = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572A5',
    HTML: '#e34c26',
    CSS: '#563d7c',
    TeX: '#3D6117',
    'C++': '#f34b7d',
    C: '#555555',
    Java: '#b07219',
    Rust: '#dea584',
    Go: '#00ADD8',
    Shell: '#89e051',
    'Jupyter Notebook': '#DA5B0B',
    Vue: '#41b883',
    Dart: '#00B4AB',
    Swift: '#F05138',
    Kotlin: '#A97BFF',
    MATLAB: '#e16737'
  };

  var GH_ICON =
    '<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">' +
    '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

  function relTime(iso) {
    if (!iso) return '';
    return '更新于 ' + String(iso).slice(0, 10);
  }

  function projectCard(repo, featured) {
    var topics = (repo.topics || []).slice(0, featured ? 10 : 4);
    var color = LANG_COLORS[repo.language] || 'var(--text-3)';
    var note = GH_NOTES[repo.name];

    return (
      '<a class="project-card' +
      (featured ? ' is-featured' : '') +
      '" href="' +
      esc(repo.html_url) +
      '" target="_blank" rel="noopener">' +
      '<span class="project-name">' +
      esc(repo.name) +
      GH_ICON +
      '</span>' +
      (repo.description ? '<p class="project-desc">' + esc(repo.description) + '</p>' : '') +
      (note && featured ? '<p class="project-tagline">' + esc(note) + '</p>' : '') +
      (topics.length
        ? '<div class="project-topics">' +
          topics
            .map(function (t) {
              return '<span>' + esc(t) + '</span>';
            })
            .join('') +
          '</div>'
        : '') +
      '<div class="project-meta">' +
      (repo.language
        ? '<span class="lang"><i class="lang-dot" style="background:' +
          esc(color) +
          '"></i>' +
          esc(repo.language) +
          '</span>'
        : '') +
      (repo.stargazers_count ? '<span>★ ' + repo.stargazers_count + '</span>' : '') +
      '<span>' +
      esc(relTime(repo.pushed_at)) +
      '</span>' +
      '</div>' +
      '</a>'
    );
  }

  function isFeatured(name) {
    return GH_FEATURED.indexOf(name) !== -1;
  }

  function sortRepos(repos) {
    var feat = GH_FEATURED.map(function (n) {
      return repos.filter(function (r) {
        return r.name === n;
      })[0];
    }).filter(Boolean);
    var rest = repos
      .filter(function (r) {
        return !isFeatured(r.name);
      })
      .sort(function (a, b) {
        return String(b.pushed_at || '').localeCompare(String(a.pushed_at || ''));
      });
    return feat.concat(rest).slice(0, GH_MAX);
  }

  function renderProjects(repos, offline) {
    var grid = $('#projectsGrid');
    if (!grid) return;

    if (!repos.length) {
      grid.innerHTML = '<p class="loading">暂时没有公开项目。</p>';
      return;
    }

    grid.innerHTML =
      sortRepos(repos)
        .map(function (r) {
          return projectCard(r, isFeatured(r.name));
        })
        .join('') +
      (offline
        ? '<p class="loading">（当前连不上 GitHub API，显示的是本地缓存的项目）</p>'
        : '');
  }

  function loadProjects() {
    var grid = $('#projectsGrid');
    if (!grid) return;

    if (!('fetch' in window)) {
      renderProjects(GH_FALLBACK, true);
      return;
    }

    fetch('https://api.github.com/users/' + GH_USER + '/repos?per_page=100&sort=updated', {
      headers: { Accept: 'application/vnd.github+json' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (list) {
        var repos = (list || []).filter(function (r) {
          return !r.fork && GH_EXCLUDE.indexOf(r.name) === -1;
        });
        renderProjects(repos.length ? repos : GH_FALLBACK, !repos.length);
      })
      .catch(function () {
        // 限流 / 离线 / 被墙都走这里
        renderProjects(GH_FALLBACK, true);
      });
  }

  /* ------------------------------------------------- 5. 旅行相册（翻页） */
  var albumViews = [];
  var preloaded = {};

  function dateLabel(album) {
    if (album.dateLabel) return album.dateLabel;
    var d = String(album.date || '');
    var m = d.match(/^(\d{4})-(\d{2})/);
    return m ? m[1] + ' 年 ' + Number(m[2]) + ' 月' : d;
  }

  function albumMarkup(album, ai) {
    var photos = album.photos || [];
    var first = photos[0] || {};
    var multi = photos.length > 1;
    var dots = multi
      ? photos
          .map(function (_, pi) {
            return (
              '<button class="album-dot' +
              (pi === 0 ? ' is-active' : '') +
              '" type="button" data-album="' +
              ai +
              '" data-photo="' +
              pi +
              '" aria-label="第 ' +
              (pi + 1) +
              ' 张"></button>'
            );
          })
          .join('')
      : '';

    return (
      '<article class="album reveal" data-album="' +
      ai +
      '">' +
      '<header class="album-head">' +
      '<p class="album-date">' +
      esc(dateLabel(album)) +
      '</p>' +
      '<h3 class="album-title">' +
      esc(album.title) +
      '</h3>' +
      (album.location ? '<p class="album-location">' + esc(album.location) + '</p>' : '') +
      (album.summary ? '<p class="album-summary">' + esc(album.summary) + '</p>' : '') +
      '</header>' +
      '<div class="album-viewer" tabindex="0" role="group" aria-label="' +
      esc(album.title) +
      ' 相册' +
      (multi ? '，可用左右方向键翻页' : '') +
      '">' +
      '<div class="album-frame">' +
      '<div class="album-stage">' +
      '<img class="album-img" src="' +
      esc(first.src || '') +
      '" alt="' +
      esc(first.caption || album.title) +
      '" decoding="async">' +
      (multi
        ? '<button class="album-nav album-prev" type="button" data-album="' +
          ai +
          '" data-dir="-1" aria-label="上一张">‹</button>' +
          '<button class="album-nav album-next" type="button" data-album="' +
          ai +
          '" data-dir="1" aria-label="下一张">›</button>'
        : '') +
      '</div>' +
      '</div>' +
      '<div class="album-caption">' +
      '<span class="album-caption-title"></span>' +
      '<span class="album-caption-note"></span>' +
      '</div>' +
      (multi
        ? '<div class="album-bar">' +
          '<span class="album-counter"></span>' +
          '<div class="album-dots">' +
          dots +
          '</div>' +
          '</div>'
        : '') +
      '</div>' +
      '</article>'
    );
  }

  // 舞台内边距（和 css 里 .album-stage 的 padding 保持一致）
  var STAGE_PAD = 12;

  /**
   * 按照片本身的比例给舞台定尺寸：
   * 横构图 → 宽扁的框；竖构图 → 高窄的框。这样两种构图都不会缩在角落。
   * 外层 .album-frame 高度固定，所以尺寸变化不会顶动下面的文字。
   */
  function fitStage(view) {
    if (!view || !view.frame || !view.stage) return;
    var photos = view.album.photos || [];
    var p = photos[view.i];
    if (!p) return;

    var ar = p.w && p.h ? p.w / p.h : 1.5;
    var maxW = view.frame.clientWidth - STAGE_PAD * 2;
    var maxH = view.frame.clientHeight - STAGE_PAD * 2;
    if (maxW <= 0 || maxH <= 0) return;

    var w = Math.min(maxW, maxH * ar);
    var h = w / ar;
    view.stage.style.width = Math.round(w + STAGE_PAD * 2) + 'px';
    view.stage.style.height = Math.round(h + STAGE_PAD * 2) + 'px';
  }

  function paintAlbum(view) {
    var photos = view.album.photos || [];
    var p = photos[view.i] || {};

    view.img.src = p.src || p.thumb || '';
    view.img.alt = p.caption || view.album.title;
    view.title.textContent = p.caption || '';
    view.note.textContent = p.note || '';
    if (view.counter) view.counter.textContent = view.i + 1 + ' / ' + photos.length;
    view.dots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === view.i);
    });
    fitStage(view);

    // 预取前后各一张，翻页才跟手
    var n = photos.length;
    if (n > 1) {
      [view.i + 1, view.i - 1].forEach(function (k) {
        var q = photos[(k + n) % n];
        if (q && q.src && !preloaded[q.src]) {
          preloaded[q.src] = true;
          var im = new Image();
          im.src = q.src;
        }
      });
    }
  }

  function goToAlbum(view, next, dir) {
    if (!view) return;
    var n = (view.album.photos || []).length;
    if (n <= 1) return;
    next = (next + n) % n;
    if (next === view.i) return;

    var img = view.img;
    if (reduceMotion || !img) {
      view.i = next;
      paintAlbum(view);
      return;
    }

    // 像翻相册：当前这张往一侧滑走淡出，下一张从另一侧进来
    img.style.opacity = '0';
    img.style.transform = 'translateX(' + -dir * 18 + 'px)';

    window.setTimeout(function () {
      view.i = next;
      paintAlbum(view);
      img.style.transition = 'none';
      img.style.transform = 'translateX(' + dir * 18 + 'px)';
      void img.offsetWidth; // 强制回流，让「瞬移」生效
      img.style.transition = '';
      img.style.opacity = '1';
      img.style.transform = '';
    }, 190);
  }

  function flipAlbum(ai, dir) {
    var view = albumViews[ai];
    if (view) goToAlbum(view, view.i + dir, dir);
  }

  function renderTravel() {
    var box = $('#timeline');
    if (!box) return;

    var albums = window.TRAVEL_DATA || [];
    if (!albums.length) {
      box.innerHTML =
        '<div class="empty-state">' +
        '<span class="empty-pulse" aria-hidden="true"></span>' +
        '<p class="empty-title">照片正在整理中</p>' +
        '<p class="empty-sub">把照片放进 <code>photos/</code> 再跑一次发布脚本就会出现。</p>' +
        '</div>';
      return;
    }

    box.innerHTML = albums.map(albumMarkup).join('');

    albumViews = [];
    $$('.album', box).forEach(function (el) {
      var ai = Number(el.getAttribute('data-album'));
      var view = {
        el: el,
        album: albums[ai],
        i: 0,
        frame: $('.album-frame', el),
        stage: $('.album-stage', el),
        img: $('.album-img', el),
        title: $('.album-caption-title', el),
        note: $('.album-caption-note', el),
        counter: $('.album-counter', el),
        dots: $$('.album-dot', el)
      };
      albumViews[ai] = view;
      paintAlbum(view);
    });
  }

  // 窗口尺寸变了要重新按照片比例定舞台大小
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      albumViews.forEach(function (v) {
        if (v) fitStage(v);
      });
    }, 150);
  });

  /* ------------------------------------------------- 6. 大图查看 */
  var lb = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbCaption = $('#lbCaption');
  var lbCounter = $('#lbCounter');
  var flat = []; // 所有相册的照片拉平，方便左右翻
  var cursor = 0;
  var lastFocus = null;

  function buildFlat() {
    flat = [];
    (window.TRAVEL_DATA || []).forEach(function (album) {
      (album.photos || []).forEach(function (p) {
        flat.push(p);
      });
    });
  }

  function showPhoto(i) {
    if (!flat.length) return;
    cursor = (i + flat.length) % flat.length;
    var p = flat[cursor];
    lbImg.src = p.src || p.thumb || '';
    lbImg.alt = p.caption || '';
    lbCaption.textContent = p.caption || '';
    lbCounter.textContent = cursor + 1 + ' / ' + flat.length;
  }

  /** 从某个相册的某张照片打开大图 */
  function openLightbox(albumIndex, photoIndex) {
    if (!lb) return;
    var offset = 0;
    var albums = window.TRAVEL_DATA || [];
    for (var i = 0; i < albumIndex && i < albums.length; i++) {
      offset += (albums[i].photos || []).length;
    }
    lastFocus = document.activeElement;
    lb.hidden = false;
    showPhoto(offset + photoIndex);
    document.body.style.overflow = 'hidden';
    var close = $('#lbClose');
    if (close) close.focus();
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.hidden = true;
    document.body.style.overflow = '';
    lbImg.src = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (lb) {
    $('#lbClose').addEventListener('click', closeLightbox);
    $('#lbPrev').addEventListener('click', function () {
      showPhoto(cursor - 1);
    });
    $('#lbNext').addEventListener('click', function () {
      showPhoto(cursor + 1);
    });
    lb.addEventListener('click', function (e) {
      if (e.target === lb) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showPhoto(cursor - 1);
      else if (e.key === 'ArrowRight') showPhoto(cursor + 1);
    });
  }

  /* ------------------------------------- 相册的点击 / 键盘事件 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    var nav = t.closest('.album-nav');
    if (nav) {
      flipAlbum(Number(nav.getAttribute('data-album')), Number(nav.getAttribute('data-dir')));
      return;
    }

    var dot = t.closest('.album-dot');
    if (dot) {
      var dai = Number(dot.getAttribute('data-album'));
      var view = albumViews[dai];
      if (view) {
        var target = Number(dot.getAttribute('data-photo'));
        goToAlbum(view, target, target > view.i ? 1 : -1);
      }
      return;
    }

    var img = t.closest('.album-img');
    if (img) {
      var art = img.closest('.album');
      if (!art) return;
      var ai = Number(art.getAttribute('data-album'));
      openLightbox(ai, albumViews[ai] ? albumViews[ai].i : 0);
    }
  });

  // 焦点在某个相册里时，方向键翻页
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var active = document.activeElement;
    if (!active || !active.closest) return;
    var viewer = active.closest('.album-viewer');
    if (!viewer) return;
    var art = viewer.closest('.album');
    if (!art) return;
    e.preventDefault();
    flipAlbum(Number(art.getAttribute('data-album')), e.key === 'ArrowRight' ? 1 : -1);
  });

  /* ------------------------------------------------- 7. 公众号弹窗 */
  var wechat = $('#wechatModal');
  if (wechat) {
    var openWechat = function (e) {
      e.preventDefault();
      wechat.hidden = false;
      document.body.style.overflow = 'hidden';
    };
    var closeWechat = function () {
      wechat.hidden = true;
      document.body.style.overflow = '';
    };
    $$('#wechatBtn, #wechatFooterBtn').forEach(function (b) {
      b.addEventListener('click', openWechat);
    });
    $('#wechatModalClose').addEventListener('click', closeWechat);
    wechat.addEventListener('click', function (e) {
      if (e.target === wechat) closeWechat();
    });
    document.addEventListener('keydown', function (e) {
      if (!wechat.hidden && e.key === 'Escape') closeWechat();
    });
  }

  /* ------------------------------------------------- 启动 */
  function init() {
    buildFlat();
    renderTravel();
    observeReveals();
    loadProjects();
    moveIndicator('home');
    updateProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
