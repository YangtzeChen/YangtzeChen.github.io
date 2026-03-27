/* ============================================================
   main.js — Site logic: navigation, blog rendering, gallery, themes
   ============================================================ */

(function () {
  'use strict';

  // Gallery global state for lightbox lookup
  let galleryData = [];

  // ---- Cache-Busting: Version Check ----
  async function checkUpdate() {
    try {
      // Use timestamp to bypass version.json cache
      const res = await fetch(`/content/version.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      const newVersion = String(data.version);
      const oldVersion = localStorage.getItem('site-version');

      if (oldVersion && oldVersion !== newVersion) {
        // Update local storage first to prevent infinite loop if reload fails to get new assets immediately
        localStorage.setItem('site-version', newVersion);
        console.log('New content available, reloading...');
        window.location.reload();
      } else if (!oldVersion) {
        localStorage.setItem('site-version', newVersion);
      }
    } catch (err) {
      console.warn('Check update failed:', err);
    }
  }

  // Initial check
  checkUpdate();
  // Check when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkUpdate();
    }
  });

  // ---- Theme System ----
  const THEMES = ['light', 'dark', 'pale-red', 'water-blue', 'grass-green'];
  const THEME_LABELS = {
    'light': '浅色',
    'dark': '深色',
    'pale-red': '浅红',
    'water-blue': '水蓝',
    'grass-green': '草绿'
  };
  const THEME_COLORS = {
    'light': '#FAF9F6',
    'dark': '#1a1a2e',
    'pale-red': '#FFF5F5',
    'water-blue': '#F0F8FF',
    'grass-green': '#F5FFF5'
  };

  function setTheme(name) {
    if (!THEMES.includes(name)) name = 'light';
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('blog-theme', name);
    // Update active state in theme picker
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.theme === name);
    });
  }

  function initTheme() {
    const saved = localStorage.getItem('blog-theme') || 'light';
    setTheme(saved);
  }

  // Build theme picker UI
  function buildThemePicker() {
    const picker = document.getElementById('theme-picker');
    if (!picker) return;

    const btn = picker.querySelector('.theme-toggle-btn');
    const dropdown = picker.querySelector('.theme-dropdown');

    if (btn && dropdown) {
      // Populate dropdown
      THEMES.forEach(t => {
        const dot = document.createElement('button');
        dot.className = 'theme-dot';
        dot.dataset.theme = t;
        dot.setAttribute('aria-label', THEME_LABELS[t]);
        dot.title = THEME_LABELS[t];
        dot.style.setProperty('--dot-color', THEME_COLORS[t]);
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          setTheme(t);
          dropdown.classList.remove('open');
        });
        dropdown.appendChild(dot);
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });

      document.addEventListener('click', () => {
        dropdown.classList.remove('open');
      });
    }
  }

  initTheme();

  // ---- Mobile Navigation ----
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
  }

  // ---- Scroll Fade-In ----
  const fadeEls = document.querySelectorAll('.fade-in');
  if (fadeEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    fadeEls.forEach((el) => observer.observe(el));
  }

  // ---- Helpers ----
  const BASE = getBasePath();

  function getBasePath() {
    // Detect if running on GitHub Pages or locally
    const path = window.location.pathname;
    // For GitHub Pages the site is at root
    return '/';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  // Helper to get thumbnail path
  function getThumbnailPath(imagePath) {
    if (!imagePath) return '';
    const parts = imagePath.split('/');
    const filename = parts.pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    return `/content/gallery/thumbnails/${nameWithoutExt}.webp`;
  }

  // ---- Parse YAML Front-matter from Markdown ----
  function parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw };
    const meta = {};
    match[1].split('\n').forEach((line) => {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        let val = line.slice(idx + 1).trim();
        // strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        meta[key] = val;
      }
    });
    return { meta, body: match[2] };
  }

  // ---- Global Image Error Handler (IMAGE LOST) ----
  document.addEventListener('error', function (e) {
    if (e.target.tagName.toLowerCase() === 'img') {
      const img = e.target;
      if (img.classList.contains('img-lost')) return; // Avoid infinite loop
      
      // If it's a post card thumb, we let the existing card error handler take care of it
      if (img.classList.contains('post-card-thumb')) return;

      img.classList.add('img-lost');
      // Set to transparent pixel to keep layout but show ::after content
      img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjwvc3ZnPg==';
    }
  }, true);

  // ---- Blog: Create a Post Card ----
  // Fixed gradient colors for posts without cover image (deterministic by slug)
  const FALLBACK_GRADIENTS = [
    'linear-gradient(135deg, #a8c5ae 0%, #f2f0eb 100%)',
    'linear-gradient(135deg, #d4a5a5 0%, #f2f0eb 100%)',
    'linear-gradient(135deg, #6ba3be 0%, #f2f0eb 100%)',
    'linear-gradient(135deg, #6b9e6b 0%, #f2f0eb 100%)',
    'linear-gradient(135deg, #c1a87d 0%, #f2f0eb 100%)',
    'linear-gradient(135deg, #9e8fc4 0%, #f2f0eb 100%)',
    'linear-gradient(135deg, #c49e6b 0%, #f2f0eb 100%)',
    'linear-gradient(135deg, #6bc4be 0%, #f2f0eb 100%)'
  ];
  function getGradientBySlug(slug) {
    let hash = 0;
    for (let i = 0; i < (slug || '').length; i++) {
      hash = ((hash << 5) - hash) + slug.charCodeAt(i);
      hash |= 0;
    }
    return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length];
  }

  // Parse color string to RGB object
  function parseColor(colorStr) {
    if (!colorStr) return null;
    colorStr = colorStr.trim();

    // Hex format: #RGB or #RRGGBB
    let match = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (match) {
      return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16)
      };
    }

    // Hex format: #RGB (shorthand)
    match = colorStr.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
    if (match) {
      return {
        r: parseInt(match[1] + match[1], 16),
        g: parseInt(match[2] + match[2], 16),
        b: parseInt(match[3] + match[3], 16)
      };
    }

    // RGB format: rgb(r, g, b)
    match = colorStr.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }

    return null;
  }

  // Calculate relative luminance for contrast ratio
  function getLuminance(rgb) {
    const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
    const r = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const g = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const b = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Get contrasting text color (black or white)
  function getContrastColor(colorStr, threshold = 0.5) {
    const rgb = parseColor(colorStr);
    if (!rgb) return null;

    const luminance = getLuminance(rgb);
    return luminance > threshold ? '#2C2C2C' : '#FFFFFF';
  }

  // Create gradient from cardColor
  function getGradientFromColor(colorStr) {
    if (!colorStr) return null;
    const rgb = parseColor(colorStr);
    if (!rgb) return null;

    // Lighten the color for gradient end
    const r = Math.min(255, rgb.r + 60);
    const g = Math.min(255, rgb.g + 60);
    const b = Math.min(255, rgb.b + 60);

    return `linear-gradient(135deg, ${colorStr} 0%, rgb(${r},${g},${b}) 100%)`;
  }

  function createPostCard(post, slug) {
    const card = document.createElement('article');
    card.className = 'post-card fade-in';

    const imgHTML = post.image ? `<img class="post-card-thumb" src="${post.image}" alt="${post.title}" loading="lazy">` : '';
    const timeHTML = post.updated
      ? `<span class="post-time-brief">LT: ${formatDate(post.updated)}</span><span class="post-time-brief">CT: ${formatDate(post.date)}</span>`
      : `<span class="post-time-brief">LT: ${formatDate(post.date)}</span><span class="post-time-brief">CT: ${formatDate(post.date)}</span>`;

    // Determine gradient and text color
    let gradientStyle = '';
    let textColorStyle = '';

    if (post.image) {
      gradientStyle = '';
    } else if (post.cardColor) {
      gradientStyle = 'background: ' + getGradientFromColor(post.cardColor) + ';';
      const contrastColor = getContrastColor(post.cardColor, 0.5);
      if (contrastColor) {
        textColorStyle = 'color: ' + contrastColor + ';';
      }
    } else {
      gradientStyle = 'background: ' + getGradientBySlug(slug) + ';';
    }

    card.innerHTML = `
      <div class="post-card-img-wrap" style="${gradientStyle}">
        ${imgHTML}
        <div class="post-card-body" style="${textColorStyle}">
          <div class="post-card-header-row">
            <h3 class="post-card-title">${post.title || '无标题'}</h3>
            <div class="post-card-dates">${timeHTML}</div>
          </div>
          <p class="post-card-excerpt">${post.excerpt || ''}</p>
        </div>
      </div>
    `;

    // Handle missing image (404 or broken) and set gradient
    if (post.image) {
      const img = card.querySelector('.post-card-thumb');
      if (img) {
        img.onerror = () => {
          img.remove();
          const wrap = card.querySelector('.post-card-img-wrap');
          if (wrap) {
            if (post.cardColor) {
              wrap.style.background = getGradientFromColor(post.cardColor);
            } else {
              wrap.style.background = getGradientBySlug(slug);
            }
          }
        };
      }
    }

    card.addEventListener('click', (e) => {
      if (window.location.pathname.startsWith('/blog')) {
        e.preventDefault();
        window.history.pushState(null, '', `/blog/?post=${slug}`);
        handleBlogRoute();
      } else {
        window.location.href = `/blog/?post=${slug}`;
      }
    });

    // Trigger fade-in after append
    requestAnimationFrame(() => card.classList.add('visible'));
    return card;
  }

  // ---- Blog: Load Posts from index.json ----
  let _allBlogItems = []; // 用于搜索和排序的缓存

  async function loadPosts(containerId, limit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await fetch(`/content/blog/index.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('not found');
      const posts = await res.json();

      // 1. 过滤掉隐藏/草稿文章 (支持 draft: true 或 hidden: true)
      const visiblePosts = posts.filter(p => String(p.draft) !== 'true' && String(p.hidden) !== 'true');
      
      // 2. 按照 LT (updated) 进行排序，如果没有则按 CT (date)
      visiblePosts.sort((a, b) => {
        const timeA = new Date(a.updated || a.date).getTime();
        const timeB = new Date(b.updated || b.date).getTime();
        return timeB - timeA;
      });

      // 3. 如果是博客全列表页，初始化搜索
      if (containerId === 'all-posts') {
        _allBlogItems = visiblePosts;
        setupBlogSearch(containerId, limit);
      }

      renderBlogList(containerId, visiblePosts, limit);
    } catch (err) {
      console.error('Load posts error:', err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>暂无文章</p>
        </div>
      `;
    }
  }

  function renderBlogList(containerId, list, limit, filterQuery = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let displayList = list;
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      displayList = list.filter(p => (p.title || '').toLowerCase().includes(q));
    }

    if (limit) displayList = displayList.slice(0, limit);

    if (displayList.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>${filterQuery ? '未找到相关文章' : '暂无文章'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    displayList.forEach((p) => container.appendChild(createPostCard(p, p.slug)));
  }

  function setupBlogSearch(containerId, limit) {
    const searchInput = document.getElementById('blog-search-input');
    if (!searchInput) return;

    // 避免重复绑定
    if (searchInput.dataset.bound) return;
    searchInput.dataset.bound = 'true';

    searchInput.addEventListener('input', () => {
      renderBlogList(containerId, _allBlogItems, limit, searchInput.value);
    });
  }

  // ---- Blog: Enhance Markdown Images (Skeleton + Lazy + Fade-in) ----
  function enhanceMarkdownImages(container) {
    if (!container) return;
    const imgs = container.querySelectorAll('img');
    imgs.forEach(img => {
      // 1. Add native lazy loading
      img.setAttribute('loading', 'lazy');
      
      // 2. Add fade-in class
      img.classList.add('img-fade-in');
      
      // 3. Create wrapper placeholder
      if (!img.parentElement.classList.contains('img-placeholder')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'img-placeholder';
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      }

      // 4. Handle Load event (caching aware)
      const markLoaded = () => {
        img.classList.add('img-loaded');
        const wrapper = img.parentElement;
        if (wrapper && wrapper.classList.contains('img-placeholder')) {
          wrapper.classList.add('is-loaded');
        }
      };

      if (img.complete) {
        markLoaded();
      } else {
        img.addEventListener('load', markLoaded);
      }
    });
  }

  // ---- Blog: Load Single Post ----
  async function loadSinglePost(slug) {
    const listView = document.getElementById('blog-list-view');
    const postView = document.getElementById('post-view');
    const postHeader = document.getElementById('post-header');
    const postBody = document.getElementById('post-body');
    const backBtn = document.getElementById('back-to-list');
    if (!listView || !postView) return;

    listView.style.display = 'none';
    postView.style.display = 'block';

    try {
      const res = await fetch(`/content/blog/${slug}.md`);
      if (!res.ok) throw new Error('not found');
      const raw = await res.text();
      const { meta, body } = parseFrontmatter(raw);

      postHeader.innerHTML = `
        <h1>${meta.title || slug}</h1>
        <div class="post-time-detail">
          <span class="post-time-label">创建时间</span>
          <span class="post-time-value">${formatDate(meta.date)}</span>
          ${meta.updated ? `
            <span class="post-time-sep">·</span>
            <span class="post-time-label">最后修改</span>
            <span class="post-time-value">${formatDate(meta.updated)}</span>
          ` : ''}
        </div>
      `;
      postBody.innerHTML = marked.parse(body);
      enhanceMarkdownImages(postBody);
      
      postHeader.classList.remove('fade-in', 'visible');
      postBody.classList.remove('fade-in', 'visible');
      void postHeader.offsetWidth; // flush CSS reflow
      postHeader.classList.add('fade-in');
      postBody.classList.add('fade-in');
      requestAnimationFrame(() => {
        postHeader.classList.add('visible');
        postBody.classList.add('visible');
      });
      document.title = `${meta.title || slug} — YangtzeChen`;
    } catch {
      postHeader.innerHTML = '<h1>文章未找到</h1>';
      postBody.innerHTML = '<p>抱歉，该文章不存在。</p>';
    }

    // Remove old listener by cloning
    const newBackBtn = backBtn.cloneNode(true);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);

    newBackBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState(null, '', '/blog/');
      handleBlogRoute();
    });
  }

  // ---- Blog: Route Handler ----
  function handleBlogRoute() {
    const listView = document.getElementById('blog-list-view');
    const postView = document.getElementById('post-view');
    if (!listView || !postView) return;

    const params = new URLSearchParams(window.location.search);
    const postSlug = params.get('post');

    if (postSlug) {
      loadSinglePost(postSlug);
    } else {
      // Show list, hide post
      listView.style.display = 'block';
      postView.style.display = 'none';
      document.title = '文章 — YangtzeChen';
      // Reload posts to ensure fresh render
      loadPosts('all-posts');
    }
  }

  // ---- Gallery: Unsplash-style Masonry Grid ----
  async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    
    grid.className = 'gallery-masonry';

    try {
      const res = await fetch(`/content/gallery/index.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('not found');
      const posts = await res.json();
      galleryData = posts; // Store globally

      grid.innerHTML = '';

      if (posts.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="width: 100%; min-height: 280px;">
            <div class="empty-state-icon">📷</div>
            <p>暂无照片</p>
          </div>
        `;
        return;
      }

      posts.forEach((post) => {
        if (!post.images || post.images.length === 0) return;
        
        post.images.forEach((imgObj) => {
          if (!imgObj.image) return;
          
          const item = document.createElement('div');
          item.className = 'masonry-item fade-in';
          item.setAttribute('data-image', imgObj.image);
          
          const thumbPath = getThumbnailPath(imgObj.image);
          
          item.innerHTML = `
            <div class="img-placeholder">
              <img class="img-fade-in" src="${thumbPath}" alt="${imgObj.sub_title || post.title || ''}" loading="lazy">
            </div>
            <div class="masonry-overlay">
              <span class="masonry-title">${imgObj.sub_title || post.title || '无题'}</span>
              <span class="masonry-date">${formatDate(post.date)}</span>
            </div>
          `;
          grid.appendChild(item);
          
          const img = item.querySelector('img');
          const placeholder = item.querySelector('.img-placeholder');
          const markLoaded = () => {
            img.classList.add('img-loaded');
            placeholder.classList.add('is-loaded');
          };
          if (img.complete) markLoaded();
          else img.addEventListener('load', markLoaded);

          // Background preload original for lightbox
          const preloadOrig = new Image();
          preloadOrig.src = imgObj.image;

          requestAnimationFrame(() => item.classList.add('visible'));
        });
      });

      // Use event delegation for Gallery page
      if (!grid.dataset.listener) {
        grid.addEventListener('click', (e) => {
          const item = e.target.closest('.masonry-item');
          if (item) {
            const imagePath = item.getAttribute('data-image');
            openDetailView(imagePath);
          }
        });
        grid.dataset.listener = 'true';
      }
    } catch {
      grid.innerHTML = `
        <div class="empty-state" style="width: 100%; min-height: 280px;">
          <div class="empty-state-icon">📷</div>
          <p>暂无照片</p>
        </div>
      `;
    }
  }

  // ---- Homepage: Latest Photography ----
  async function loadLatestPhotography() {
    const container = document.getElementById('latest-photography');
    if (!container) return;

    try {
      const res = await fetch(`/content/gallery/index.json?t=${Date.now()}`);
      if (!res.ok) throw new Error('not found');
      const posts = await res.json();
      galleryData = posts; // Sync global state
      
      container.innerHTML = '';
      
      // Extract latest 6 images across all posts
      let latestImages = [];
      for (const p of posts) {
        if (p.images) {
          p.images.forEach(img => latestImages.push({ post: p, img: img }));
        }
      }
      latestImages = latestImages.slice(0, 8); // 取最新8张 (保持与原逻辑一致)

      if (latestImages.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="width: 100%; min-height: 280px;">
            <div class="empty-state-icon">📷</div>
            <p>暂无照片</p>
          </div>
        `;
        return;
      }

      latestImages.forEach((data) => {
        const item = document.createElement('div');
        item.className = 'masonry-item fade-in';
        item.setAttribute('data-image', data.img.image);
        
        const thumbPath = getThumbnailPath(data.img.image);
        
        item.innerHTML = `
          <div class="img-placeholder">
            <img class="img-fade-in" src="${thumbPath}" alt="${data.img.sub_title || data.post.title || ''}" loading="lazy">
          </div>
          <div class="masonry-overlay">
            <span class="masonry-title">${data.img.sub_title || data.post.title || '无题'}</span>
            <span class="masonry-date">${formatDate(data.post.date)}</span>
          </div>
        `;
        container.appendChild(item);
        
        const img = item.querySelector('img');
        const placeholder = item.querySelector('.img-placeholder');
        const markLoaded = () => {
          img.classList.add('img-loaded');
          placeholder.classList.add('is-loaded');
        };
        if (img.complete) markLoaded();
        else img.addEventListener('load', markLoaded);

        // Background preload original for lightbox
        const preloadOrig = new Image();
        preloadOrig.src = data.img.image;

        requestAnimationFrame(() => item.classList.add('visible'));
      });

      // Use event delegation for Homepage
      if (!container.dataset.listener) {
        container.addEventListener('click', (e) => {
          const item = e.target.closest('.masonry-item');
          if (item) {
            const imagePath = item.getAttribute('data-image');
            openDetailView(imagePath);
          }
        });
        container.dataset.listener = 'true';
      }
    } catch {
      container.innerHTML = `
        <div class="empty-state" style="width: 100%; min-height: 280px;">
          <div class="empty-state-icon">📷</div>
          <p>暂无照片</p>
        </div>
      `;
    }
  }

  // ---- 500px Style Advanced Lightbox (Detail View) ----
  function openDetailView(imagePath) {
    // Robust lookup in global state
    let targetPost = null;
    let targetImg = null;

    galleryData.forEach(post => {
      if (post.images) {
        const found = post.images.find(img => img.image === imagePath);
        if (found) {
          targetPost = post;
          targetImg = found;
        }
      }
    });

    if (!targetPost || !targetImg) return;

    let lb = document.getElementById('advanced-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'advanced-lightbox';
      lb.className = 'advanced-lightbox';
      lb.innerHTML = `
        <button class="adv-lb-close" id="adv-lb-close" aria-label="Close">✕</button>
        <div class="adv-lb-content">
          <div class="adv-lb-media">
            <img id="adv-lb-img" src="" alt="" loading="eager">
          </div>
          <div class="adv-lb-info">
            <h2 id="adv-lb-title"></h2>
            <div class="adv-lb-meta" id="adv-lb-date"></div>
            <div class="adv-lb-subinfo" id="adv-lb-subinfo"></div>
          </div>
        </div>
      `;
      document.body.appendChild(lb);
      document.getElementById('adv-lb-close').addEventListener('click', closeDetailView);
      lb.addEventListener('click', (e) => {
        if (e.target.classList.contains('adv-lb-media') || e.target === lb) closeDetailView();
      });
    }

    // Reset image to avoid flicker
    const lbImg = document.getElementById('adv-lb-img');
    lbImg.src = ''; 
    lbImg.src = targetImg.image;

    // Title Logic: Top shows img title or post title
    document.getElementById('adv-lb-title').textContent = targetImg.sub_title || targetPost.title || '相册分享';
    document.getElementById('adv-lb-date').textContent = formatDate(targetPost.date);
    
    // Description Logic: Bottom shows description
    const subinfo = document.getElementById('adv-lb-subinfo');
    const desc = targetImg.description || targetImg.sub_caption || '';
    
    if (desc) {
      subinfo.style.display = 'block';
      subinfo.innerHTML = `<p>${desc.replace(/\\n|\n/g, '<br>')}</p>`;
    } else {
      subinfo.style.display = 'none';
    }

    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDetailView() {
    const lb = document.getElementById('advanced-lightbox');
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailView();
  });

  // ---- Router ----
  const page = window.location.pathname;

  // Homepage: load latest components
  if (page === '/' || page === '/index.html') {
    loadLatestPhotography();
    loadPosts('latest-posts', 3);
  }

  // Blog page
  if (page.startsWith('/blog')) {
    handleBlogRoute();

    // Listen for popstate (browser back/forward)
    window.addEventListener('popstate', () => {
      if (window.location.pathname.startsWith('/blog')) {
        handleBlogRoute();
      }
    });
  }

  // Gallery page
  if (page.startsWith('/gallery')) {
    loadGallery();
  }

  // ---- Init theme picker after DOM ready ----
  buildThemePicker();
})();
