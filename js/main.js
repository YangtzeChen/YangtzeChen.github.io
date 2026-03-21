/* ============================================================
   main.js — Site logic: navigation, blog rendering, gallery
   ============================================================ */

(function () {
  'use strict';

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
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
  function createPostCard(post, slug) {
    const card = document.createElement('article');
    card.className = 'post-card fade-in';
    card.innerHTML = `
      ${post.thumbnail ? `<img class="post-card-thumb" src="${post.thumbnail}" alt="${post.title}" loading="lazy">` : `<div class="post-card-thumb"></div>`}
      <div class="post-card-body">
        <p class="post-card-date">${formatDate(post.date)}</p>
        <h3 class="post-card-title">${post.title || '无标题'}</h3>
        <p class="post-card-excerpt">${post.excerpt || ''}</p>
      </div>
    `;
    card.addEventListener('click', () => {
      window.location.href = `/blog/?post=${slug}`;
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
        <div class="post-meta-row">
          <p class="post-card-date">${formatDate(meta.date)}</p>
        </div>
      `;
      postBody.innerHTML = marked.parse(body);
      document.title = `${meta.title || slug} — YangtzeChen`;
    } catch {
      postHeader.innerHTML = '<h1>文章未找到</h1>';
      postBody.innerHTML = '<p>抱歉，该文章不存在。</p>';
    }

    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      listView.style.display = 'block';
      postView.style.display = 'none';
      window.history.pushState(null, '', '/blog/');
      document.title = '文章 — YangtzeChen';
    });
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
          <div class="empty-state" style="grid-column: 1 / -1;">
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
            </div>
          `;
          
          item.addEventListener('click', () => openDetailView(imgObj, post));
          grid.appendChild(item);
          requestAnimationFrame(() => item.classList.add('visible'));
        });
      });
    } catch {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
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
        container.innerHTML = '<p class="text-center text-muted">暂无相片</p>';
        return;
      }

      latestImages.forEach((data) => {
        const item = document.createElement('div');
        item.className = 'mosaic-item fade-in';
        item.innerHTML = `<img src="${data.img.image}" alt="${data.img.sub_title || data.post.title || ''}" loading="lazy">`;
        item.addEventListener('click', () => openDetailView(data.img, data.post));
        container.appendChild(item);
        requestAnimationFrame(() => item.classList.add('visible'));
      });
    } catch {
      container.innerHTML = '<p class="text-center text-muted">暂无相片</p>';
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
    document.getElementById('adv-lb-caption').innerHTML = postObj.caption ? postObj.caption.replace(/\\n/g, '<br>') : '';
    
    const subinfo = document.getElementById('adv-lb-subinfo');
    if (imgObj.sub_title || imgObj.sub_caption) {
      subinfo.style.display = 'block';
      subinfo.innerHTML = `
        ${imgObj.sub_title ? '<h4>' + imgObj.sub_title + '</h4>' : ''}
        ${imgObj.sub_caption ? '<p>' + imgObj.sub_caption.replace(/\\n/g, '<br>') + '</p>' : ''}
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
    const params = new URLSearchParams(window.location.search);
    const postSlug = params.get('post');
    if (postSlug) {
      loadSinglePost(postSlug);
    } else {
      loadPosts('all-posts');
    }
  }

  // Gallery page
  if (page.startsWith('/gallery')) {
    loadGallery();
  }
})();
