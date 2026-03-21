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

  // ---- Gallery: Load Instagram-style Feed ----
  async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    
    // Change id/class for clarity if needed, but we'll just inject the feed
    grid.className = 'gallery-feed';

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

      posts.forEach((post, index) => {
        if (!post.images || post.images.length === 0) return;
        
        const article = document.createElement('article');
        article.className = 'gallery-post fade-in';
        
        // 1. Build Media (Carousel)
        const mediaDiv = document.createElement('div');
        mediaDiv.className = 'gallery-post-media';
        
        const carousel = document.createElement('div');
        carousel.className = 'gallery-carousel';
        
        post.images.forEach((imgObj) => {
          const item = document.createElement('div');
          item.className = 'gallery-carousel-item';
          item.innerHTML = `<img src="${imgObj.image}" alt="${imgObj.sub_title || post.title || ''}" loading="lazy">`;
          carousel.appendChild(item);
        });
        
        mediaDiv.appendChild(carousel);
        
        // Navigation and Dots if > 1 image
        let dotsContainer = null;
        let updateSubInfo = null; // function to update the info side

        if (post.images.length > 1) {
          const prevBtn = document.createElement('button');
          prevBtn.className = 'gallery-nav prev';
          prevBtn.innerHTML = '❮';
          prevBtn.disabled = true;
          
          const nextBtn = document.createElement('button');
          nextBtn.className = 'gallery-nav next';
          nextBtn.innerHTML = '❯';
          
          dotsContainer = document.createElement('div');
          dotsContainer.className = 'gallery-dots';
          post.images.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
            dotsContainer.appendChild(dot);
          });
          
          mediaDiv.appendChild(prevBtn);
          mediaDiv.appendChild(nextBtn);
          mediaDiv.appendChild(dotsContainer);
          
          const updateNav = () => {
             const idx = Math.round(carousel.scrollLeft / carousel.clientWidth);
             prevBtn.disabled = idx === 0;
             nextBtn.disabled = idx === post.images.length - 1;
             Array.from(dotsContainer.children).forEach((d, i) => d.classList.toggle('active', i === idx));
             if (updateSubInfo) updateSubInfo(idx);
          };
          
          carousel.addEventListener('scroll', () => {
             // Use requestAnimationFrame to throttle
             window.requestAnimationFrame(updateNav);
          });
          
          prevBtn.onclick = () => carousel.scrollBy({ left: -carousel.clientWidth, behavior: 'smooth' });
          nextBtn.onclick = () => carousel.scrollBy({ left: carousel.clientWidth, behavior: 'smooth' });
        }

        // 2. Build Info Area
        const infoDiv = document.createElement('div');
        infoDiv.className = 'gallery-post-info';
        
        const header = `
          <div class="gallery-post-header">
            <h2 class="gallery-post-title">${post.title || '相册分享'}</h2>
            <div class="gallery-post-date">${formatDate(post.date)}</div>
          </div>
          ${post.caption ? '<div class="gallery-post-caption">' + post.caption.replace(/\\n/g, '<br>') + '</div>' : ''}
        `;
        
        const subInfoDiv = document.createElement('div');
        subInfoDiv.className = 'gallery-sub-info';
        
        updateSubInfo = (idx) => {
          const currentImg = post.images[idx];
          if (currentImg.sub_title || currentImg.sub_caption) {
             subInfoDiv.style.display = 'block';
             subInfoDiv.innerHTML = `
               ${currentImg.sub_title ? '<div class="gallery-sub-title">' + currentImg.sub_title + '</div>' : ''}
               ${currentImg.sub_caption ? '<div class="gallery-sub-caption">' + currentImg.sub_caption.replace(/\\n/g, '<br>') + '</div>' : ''}
             `;
          } else {
             subInfoDiv.style.display = 'none';
          }
        };
        
        // Initialize sub-info for the first image
        updateSubInfo(0);
        
        infoDiv.innerHTML = header;
        infoDiv.appendChild(subInfoDiv);
        
        article.appendChild(mediaDiv);
        article.appendChild(infoDiv);
        
        grid.appendChild(article);
        requestAnimationFrame(() => article.classList.add('visible'));
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
