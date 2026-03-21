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
          <a class="post-edit-link" href="/admin/#/collections/blog/entries/${slug}" target="_blank" rel="noopener" title="在后台编辑此文章">✏️ 编辑</a>
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

  // ---- Gallery: Load from index.json ----
  async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    try {
      const res = await fetch('/content/gallery/index.json');
      if (!res.ok) throw new Error('not found');
      const images = await res.json();

      grid.innerHTML = '';

      if (images.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📷</div>
            <p>还没有照片，尝试通过 <a href="/admin/">后台管理</a> 上传吧！</p>
          </div>
        `;
        return;
      }

      images.forEach((post) => {
        if (!post.images || !Array.isArray(post.images)) return;
        post.images.forEach((imgObj) => {
          if (!imgObj.image) return;
          const item = document.createElement('div');
          item.className = 'gallery-item fade-in';
          const titleHtml = post.title ? `<strong>${post.title}</strong><br>` : '';
          const capText = post.caption || '';
          const fullText = (titleHtml || capText) ? `<div class="gallery-caption">${titleHtml}${capText}</div>` : '';
          
          item.innerHTML = `
            <img src="${imgObj.image}" alt="${post.title || ''}" loading="lazy">
            ${fullText}
          `;
          item.addEventListener('click', () => openLightbox(imgObj.image, (post.title ? post.title + ' - ' : '') + capText));
          grid.appendChild(item);
          requestAnimationFrame(() => item.classList.add('visible'));
        });
      });
    } catch {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📷</div>
          <p>还没有照片，尝试通过 <a href="/admin/">后台管理</a> 上传吧！</p>
        </div>
      `;
    }
  }

  // ---- Lightbox ----
  function openLightbox(src, caption) {
    const lb = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbCap = document.getElementById('lightbox-caption');
    if (!lb) return;
    lbImg.src = src;
    lbImg.alt = caption || '';
    lbCap.textContent = caption || '';
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  const lbClose = document.getElementById('lightbox-close');
  if (lbClose) lbClose.addEventListener('click', closeLightbox);

  const lb = document.getElementById('lightbox');
  if (lb) {
    lb.addEventListener('click', (e) => {
      if (e.target === lb) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // ---- Router ----
  const page = window.location.pathname;

  // Homepage: load latest 3 posts
  if (page === '/' || page === '/index.html') {
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
