/* ============================================================
   main.js — Site logic: navigation, blog rendering, gallery, themes
   ============================================================ */

(function () {
  'use strict';

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

  function createPostCard(post, slug) {
    const card = document.createElement('article');
    card.className = 'post-card fade-in';
    const imgHTML = post.image ? `<img class="post-card-thumb" src="${post.image}" alt="${post.title}" loading="lazy">` : '';
    const timeHTML = post.updated
      ? `<span class="post-time-brief">LT ${formatDate(post.updated)}</span><span class="post-time-brief">CT ${formatDate(post.date)}</span>`
      : `<span class="post-time-brief">CT ${formatDate(post.date)}</span>`;
    card.innerHTML = `
      <div class="post-card-img-wrap" style="${!post.image ? 'background: ' + getGradientBySlug(slug) : ''}">
        ${imgHTML}
        <div class="post-card-body">
          <p class="post-card-date">${timeHTML}</p>
          <h3 class="post-card-title">${post.title || '无标题'}</h3>
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
          if (wrap) wrap.style.background = getGradientBySlug(slug);
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
  async function loadPosts(containerId, limit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      const res = await fetch('/content/blog/index.json');
      if (!res.ok) throw new Error('not found');
      const posts = await res.json();

      container.innerHTML = '';
      const list = limit ? posts.slice(0, limit) : posts;

      if (list.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📝</div>
            <p>还没有文章，尝试通过 <a href="/admin/">后台管理</a> 发布第一篇吧！</p>
          </div>
        `;
        return;
      }

      list.forEach((p) => container.appendChild(createPostCard(p, p.slug)));
    } catch {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>还没有文章，尝试通过 <a href="/admin/">后台管理</a> 发布第一篇吧！</p>
        </div>
      `;
    }
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
      const res = await fetch('/content/gallery/index.json');
      if (!res.ok) throw new Error('not found');
      const posts = await res.json();

      grid.innerHTML = '';

      if (posts.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="width: 100%; min-height: 280px;">
            <div class="empty-state-icon">📷</div>
            <p>还没有照片，尝试通过 <a href="/admin/">后台管理</a> 上传吧！</p>
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
          
          item.innerHTML = `
            <img src="${imgObj.image}" alt="${imgObj.sub_title || post.title || ''}" loading="lazy">
            <div class="masonry-overlay">
              <span class="masonry-title">${imgObj.sub_title || post.title || '无题'}</span>
              <span class="masonry-date">${formatDate(post.date)}</span>
            </div>
          `;
          
          item.addEventListener('click', () => openDetailView(imgObj, post));
          grid.appendChild(item);
          requestAnimationFrame(() => item.classList.add('visible'));
        });
      });
    } catch {
      grid.innerHTML = `
        <div class="empty-state" style="width: 100%; min-height: 280px;">
          <div class="empty-state-icon">📷</div>
          <p>还没有照片，尝试通过 <a href="/admin/">后台管理</a> 上传吧！</p>
        </div>
      `;
    }
  }

  // ---- Homepage: Latest Photography ----
  async function loadLatestPhotography() {
    const container = document.getElementById('latest-photography');
    if (!container) return;

    try {
      const res = await fetch('/content/gallery/index.json');
      if (!res.ok) throw new Error('not found');
      const posts = await res.json();
      
      container.innerHTML = '';
      
      // Extract latest 6 images across all posts
      let latestImages = [];
      for (const p of posts) {
        if (p.images) {
          p.images.forEach(img => latestImages.push({ post: p, img: img }));
        }
      }
      latestImages = latestImages.slice(0, 8);

      if (latestImages.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="width: 100%; min-height: 280px;">
            <div class="empty-state-icon">📷</div>
            <p>还没有照片，尝试通过 <a href="/admin/">后台管理</a> 上传吧！</p>
          </div>
        `;
        return;
      }

      latestImages.forEach((data) => {
        const item = document.createElement('div');
        item.className = 'masonry-item fade-in';
        item.innerHTML = `
          <img src="${data.img.image}" alt="${data.img.sub_title || data.post.title || ''}" loading="lazy">
          <div class="masonry-overlay">
            <span class="masonry-title">${data.img.sub_title || data.post.title || '无题'}</span>
            <span class="masonry-date">${formatDate(data.post.date)}</span>
          </div>
        `;
        item.addEventListener('click', () => openDetailView(data.img, data.post));
        container.appendChild(item);
        requestAnimationFrame(() => item.classList.add('visible'));
      });
    } catch {
      container.innerHTML = `
        <div class="empty-state" style="width: 100%; min-height: 280px;">
          <div class="empty-state-icon">📷</div>
          <p>还没有照片，尝试通过 <a href="/admin/">后台管理</a> 上传吧！</p>
        </div>
      `;
    }
  }

  // ---- 500px Style Advanced Lightbox (Detail View) ----
  function openDetailView(imgObj, postObj) {
    let lb = document.getElementById('advanced-lightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'advanced-lightbox';
      lb.className = 'advanced-lightbox';
      lb.innerHTML = `
        <button class="adv-lb-close" id="adv-lb-close" aria-label="Close">✕</button>
        <div class="adv-lb-content">
          <div class="adv-lb-media">
            <img id="adv-lb-img" src="" alt="">
          </div>
          <div class="adv-lb-info">
            <h2 id="adv-lb-title"></h2>
            <div class="adv-lb-meta" id="adv-lb-date"></div>
            <div class="adv-lb-caption" id="adv-lb-caption"></div>
            
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

    document.getElementById('adv-lb-img').src = imgObj.image;
    document.getElementById('adv-lb-title').textContent = postObj.title || '相册分享';
    document.getElementById('adv-lb-date').textContent = formatDate(postObj.date);
    document.getElementById('adv-lb-caption').innerHTML = postObj.caption ? postObj.caption.replace(/\\n|\n/g, '<br>') : '';
    
    const subinfo = document.getElementById('adv-lb-subinfo');
    if (imgObj.sub_title || imgObj.sub_caption) {
      subinfo.style.display = 'block';
      subinfo.innerHTML = `
        ${imgObj.sub_title ? '<h4>' + imgObj.sub_title + '</h4>' : ''}
        ${imgObj.sub_caption ? '<p>' + imgObj.sub_caption.replace(/\\n|\n/g, '<br>') + '</p>' : ''}
      `;
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
