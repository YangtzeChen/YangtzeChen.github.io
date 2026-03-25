// ============================================================
// CMS Admin — Article Management
// ============================================================

(function() {
  'use strict';

  // ---- 状态 ----
  let articles = [];          // 从 index.json 加载的文章列表
  let currentEditSlug = null; // 当前编辑的文章 slug，null 表示新建
  let quillEditor = null;
  let selectedCoverColor = null;
  let selectedCoverImage = null;
  let autoSaveTimer = null;
  let galleryItems = [];      // 从 content/gallery/index.json 加载的数据

  // ---- DOM 元素 ----
  const $articlesPanel = document.getElementById('list-view');
  const $formPanel = document.getElementById('form-view');
  const $articleList = document.getElementById('article-list');
  const $formTitle = document.getElementById('form-title');
  const $slugInput = document.getElementById('post-slug');
  const $dateInput = document.getElementById('post-date');
  const $updatedInput = document.getElementById('post-updated');
  const $titleInput = document.getElementById('post-title');
  const $titleCount = document.getElementById('title-count');
  const $excerptInput = document.getElementById('post-excerpt');
  const $excerptCount = document.getElementById('excerpt-count');
  const $visibleSwitch = document.getElementById('post-visible');
  const $colorPresets = document.getElementById('color-presets');
  const $customColor = document.getElementById('custom-color');
  const $customColorText = document.getElementById('custom-color-text');
  const $coverGalleryGrid = document.getElementById('cover-gallery');
  const $coverUrlInput = document.getElementById('cover-url-input');
  const $coverUrlWrap = document.getElementById('cover-url-wrap');
  const $coverUploadInput = document.getElementById('cover-upload-input');
  const $coverUploadWrap = document.getElementById('cover-upload-wrap');
  const $coverUploadPreview = document.getElementById('cover-upload-preview');
  const $coverPreview = document.getElementById('cover-preview');
  const $coverZoomCtrl = document.getElementById('cover-zoom-ctrl');
  const $coverZoomRange = document.getElementById('cover-zoom-range');
  const $btnClearCover = document.getElementById('btn-clear-cover');
  const $btnAutofit = document.getElementById('btn-autofit');
  
  // ---- Gallery Manager 元素 ----
  const $galleryPanel = document.getElementById('gallery-manager-view');
  const $galleryList = document.getElementById('gallery-manager-list');
  const $btnShowUpload = document.getElementById('btn-upload-gallery');
  const $uploadModal = document.getElementById('gallery-upload-modal');
  const $uploadForm = document.getElementById('gallery-upload-form');
  const $btnCancelUpload = document.getElementById('btn-cancel-upload');
  const $galleryDropZone = document.getElementById('gallery-drop-zone');
  const $galleryFileInput = document.getElementById('gallery-file-input');
  const $galleryPreviewImg = document.getElementById('gallery-preview-img');
  const $galleryTitleInput = document.getElementById('gallery-title-input');
  const $galleryDescInput = document.getElementById('gallery-desc-input');
  
  // ---- Quill Picker 元素 ----
  const $pickerModal = document.getElementById('gallery-picker-modal');
  const $pickerGrid = document.getElementById('quill-gallery-grid');
  const $btnClosePicker = document.getElementById('btn-close-picker');

  // ---- Auth 元素 ----
  const $authModal = document.getElementById('cms-auth-modal');
  const $authSetupFields = document.getElementById('auth-setup-fields');
  const $authTokenInput = document.getElementById('auth-token-input');
  const $authPinInput = document.getElementById('auth-pin-input');
  const $btnAuthUnlock = document.getElementById('btn-auth-unlock');

  // ---- 裁剪与拖拽状态 ----
  let cropScale = 1;
  let cropPanX = 0;
  let cropPanY = 0;
  let isDraggingCover = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let coverImgEl = null;

  // ---- 工具：获取北京时间（UTC+8） ----
  // ---- 工具：获取北京时间（UTC+8） ----
  function beijingNow() {
    // 使用 Intl.DateTimeFormat 确保时区准确
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false, timeZone: 'Asia/Shanghai'
    });
    const parts = formatter.formatToParts(new Date());
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  }

  function beijingNowFull() {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'Asia/Shanghai'
    });
    const parts = formatter.formatToParts(new Date());
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
  }

  // ---- Theme System ----
  const THEMES = ['light', 'dark', 'pale-red', 'water-blue', 'grass-green'];
  function setTheme(name) {
    if (!THEMES.includes(name)) name = 'light';
    document.documentElement.setAttribute('data-theme', name);
    localStorage.setItem('blog-theme', name);
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.classList.toggle('active', dot.dataset.theme === name);
    });
  }

  function initTheme() {
    const saved = localStorage.getItem('blog-theme') || 'light';
    setTheme(saved);
  }

  function setupThemePicker() {
    const btn = document.getElementById('theme-toggle-btn');
    const dropdown = document.getElementById('theme-dropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });

    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        setTheme(dot.dataset.theme);
        dropdown.classList.remove('open');
      });
    });

    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  // ---- 初始化 ----
  async function init() {
    initTheme();
    setupThemePicker();
    initQuill();
    loadGalleryForCoverPicker();
    setupEventListeners();
    setupAuthEventListeners();

    // 检查认证状态
    if (CMS_AUTH.hasStoredSession()) {
      // 存在会话，隐藏 Token 输入，仅要求 PIN 码解锁
      if($authSetupFields) $authSetupFields.style.display = 'none';
      if($authModal) {
        $authModal.style.display = 'flex';
        const card = $authModal.querySelector('.auth-card');
        if (card) setTimeout(() => card.classList.add('visible'), 50);
      }
    } else {
      // 全新会话，要求输入 Token + PIN
      if($authSetupFields) $authSetupFields.style.display = 'block';
      if($authModal) {
        $authModal.style.display = 'flex';
        const card = $authModal.querySelector('.auth-card');
        if (card) setTimeout(() => card.classList.add('visible'), 50);
      }
    }

    // 填充默认发布日期（北京时区）
    $dateInput.value = beijingNow();
  }

  function setupAuthEventListeners() {
    $btnAuthUnlock.addEventListener('click', async () => {
      const pin = $authPinInput.value;
      if (!pin) return showToast('请输入 PIN 码', 'error');

      const oldBtnText = $btnAuthUnlock.textContent;
      $btnAuthUnlock.disabled = true;
      $btnAuthUnlock.textContent = '验证中...';

      let success = false;
      if (CMS_AUTH.hasStoredSession()) {
        success = await CMS_AUTH.unlock(pin);
      } else {
        const token = $authTokenInput.value.trim();
        if (!token) {
          showToast('请输入 GitHub Token', 'error');
          reset(); return;
        }
        // 核心改进：预检 Token 是否真实有效
        const isValid = await CMS_AUTH.validateToken(token);
        if (!isValid) {
          showToast('Invalid GitHub Token: 无法连接或权限不足', 'error');
          reset(); return;
        }
        success = await CMS_AUTH.lock(token, pin);
      }

      if (success) {
        $authModal.style.display = 'none';
        showToast('认证成功，已进入加密会话', 'success');
        await loadArticles();
      } else {
        showToast('认证失败：PIN 码错误或记录冲突', 'error');
      }

      function reset() {
        $btnAuthUnlock.disabled = false;
        $btnAuthUnlock.textContent = oldBtnText;
      }
      reset();
    });
  }

  // ---- 加载文章列表 (优先从 GitHub 获取) ----
  async function loadArticles() {
    console.log('开始加载文章列表...');
    try {
      // 尝试从 GitHub API 获取最新的 index.json (增加时间戳防缓存)
      const content = await GITHUB_CMS.fetchFile('content/blog/index.json');
      console.log('GitHub API 响应内容长度:', content ? content.length : 0);
      
      if (content) {
        articles = JSON.parse(content);
        if (!Array.isArray(articles)) articles = [];
        console.log('解析成功，文章数量:', articles.length);
        localStorage.setItem('cms_index', JSON.stringify(articles));
      } else {
        throw new Error('GitHub 文件不存在或为空');
      }
    } catch (e) {
      console.error('GitHub 获取失败:', e);
      // 降级：尝试本地 fetch
      try {
        const res = await fetch(`/content/blog/index.json?t=${Date.now()}`);
        if (res.ok) {
          articles = await res.json();
          if (!Array.isArray(articles)) articles = [];
          console.log('本地 Fetch 成功，文章数量:', articles.length);
        } else {
          articles = JSON.parse(localStorage.getItem('cms_index') || '[]');
          console.log('尝试从 LocalStorage 恢复，数量:', articles.length);
        }
      } catch (err) {
        articles = [];
        console.error('所有加载方式均已失败');
      }
    }
    renderArticleList();
  }

  // ---- 渲染文章列表 ----
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function renderArticleList(filterQuery = '') {
    let filtered = articles;
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      filtered = articles.filter(post => (post.title || '').toLowerCase().includes(q));
    }

    // 按照 LT (updated) 进行排序，如果没有则按 CT (date)
    filtered.sort((a, b) => {
      const timeA = new Date(a.updated || a.date).getTime();
      const timeB = new Date(b.updated || b.date).getTime();
      return timeB - timeA;
    });

    if (filtered.length === 0) {
      $articleList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p>${filterQuery ? '未找到相关文章' : '暂无文章'}</p>
        </div>`;
      return;
    }
    
    $articleList.innerHTML = filtered.map(post => {
      const imgHTML = post.image ? `<img class="post-card-thumb" src="${escHtml(post.image)}" alt="${escHtml(post.title)}" loading="lazy">` : '';
      const timeHTML = post.updated
        ? `<span class="post-time-brief">LT: ${formatDate(post.updated)}</span><span class="post-time-brief">CT: ${formatDate(post.date)}</span>`
        : `<span class="post-time-brief">LT: ${formatDate(post.date)}</span><span class="post-time-brief">CT: ${formatDate(post.date)}</span>`;

      // 状态标签
      const isHidden = String(post.draft) === 'true' || String(post.hidden) === 'true';

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
        gradientStyle = 'background: ' + getGradientBySlug(post.slug) + ';';
      }

      return `
      <article class="post-card fade-in visible" data-slug="${post.slug}">
        <span class="article-badge ${isHidden ? 'badge-draft' : 'badge-published'}">
           ${isHidden ? '已隐藏' : '已显示'}
        </span>
        <div class="cms-card-overlay">
          <button class="btn-icon edit-btn" data-slug="${post.slug}">编辑</button>
          <button class="btn-icon danger delete-btn" data-slug="${post.slug}">删除</button>
        </div>
        <div class="post-card-img-wrap" style="${gradientStyle}">
          ${imgHTML}
          <div class="post-card-body" style="${textColorStyle}">
            <div class="post-card-header-row">
              <h3 class="post-card-title">${escHtml(post.title || '无标题')}</h3>
              <div class="post-card-dates">${timeHTML}</div>
            </div>
            <p class="post-card-excerpt">${escHtml(post.excerpt || '')}</p>
          </div>
        </div>
      </article>`;
    }).join('');

    // 绑定事件
    $articleList.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showForm(btn.dataset.slug);
      });
    });
    $articleList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (confirm('确定删除这篇文章？')) deleteArticle(btn.dataset.slug);
      });
    });
    $articleList.querySelectorAll('.post-card').forEach(card => {
      card.addEventListener('click', e => {
        if(e.target.closest('.cms-card-overlay')) return;
        showForm(card.dataset.slug);
      });
    });
  }

  // ---- 新建 / 编辑表单 ----
  function showForm(editSlug = null) {
    $articlesPanel.style.display = 'none';
    $formPanel.style.display = 'block';
    currentEditSlug = editSlug;
    $formTitle.textContent = editSlug ? '编辑文章' : '新建文章';

    if (editSlug) {
      loadArticleForEdit(editSlug);
    } else {
      resetForm();
    }
    startAutoSave();
  }

  function showList() {
    $articlesPanel.style.display = 'block';
    $formPanel.style.display = 'none';
    $galleryPanel.style.display = 'none';
    document.querySelectorAll('.cms-tabs button').forEach(b => b.classList.remove('active'));
    const tabArticles = document.getElementById('tab-articles');
    if (tabArticles) tabArticles.classList.add('active');
    stopAutoSave();
    currentEditSlug = null;
  }

  function showGallery() {
    $articlesPanel.style.display = 'none';
    $formPanel.style.display = 'none';
    $galleryPanel.style.display = 'block';
    document.querySelectorAll('.cms-tabs button').forEach(b => b.classList.remove('active'));
    const tabGallery = document.getElementById('tab-gallery');
    if (tabGallery) tabGallery.classList.add('active');
    stopAutoSave();
    loadGalleryManagement();
  }

  function resetForm() {
    $slugInput.value = '';
    $dateInput.value = beijingNow();
    $updatedInput.value = '';
    $titleInput.value = '';
    $titleCount.textContent = '0/50';
    $excerptInput.value = '';
    $excerptCount.textContent = '0/300';
    $visibleSwitch.checked = true;
    
    // reset sync overlay
    document.getElementById('sync-title').textContent = '无标题';
    document.getElementById('sync-excerpt').textContent = '';
    document.getElementById('sync-ct').textContent = 'CT: ' + $dateInput.value.replace('T', ' ');
    document.getElementById('sync-lt').style.display = 'none';
    quillEditor.setContents([]);
    // 默认选中第一个预设封面颜色
    selectCoverColor('#E98181');
    
    // 重置裁切状态
    cropScale = 1; cropPanX = 0; cropPanY = 0;
    if($coverZoomRange) $coverZoomRange.value = 1;
  }

  async function loadArticleForEdit(slug) {
    const post = articles.find(p => p.slug === slug);
    if (!post) return;
    try {
      let text = '';
      const saved = JSON.parse(localStorage.getItem('cms_saved') || '[]');
      const localDraft = saved.find(s => s.slug === slug);
      if (localDraft) {
        text = localDraft.frontmatter;
      } else {
        const res = await fetch(`/content/blog/${slug}.md`);
        if (!res.ok) throw new Error();
        text = await res.text();
      }
      
      const { meta, body } = parseFrontmatter(text);

      $slugInput.value = slug;
      $dateInput.value = (meta.date || '').slice(0, 16).replace(' ', 'T');
      $updatedInput.value = meta.updated ? meta.updated.slice(0, 16).replace(' ', 'T') : '';
      $titleInput.value = meta.title || '';
      $titleCount.textContent = `${(meta.title || '').length}/50`;
      $excerptInput.value = meta.excerpt || '';
      $excerptCount.textContent = `${(meta.excerpt || '').length}/300`;
      $visibleSwitch.checked = meta.draft !== 'true';

      // sync overlay
      document.getElementById('sync-title').textContent = meta.title || '无标题';
      document.getElementById('sync-excerpt').textContent = meta.excerpt || '';
      document.getElementById('sync-ct').textContent = 'CT: ' + (meta.date || '').slice(0, 19).replace('T', ' ');
      if (meta.updated) {
        document.getElementById('sync-lt').style.display = 'inline';
        document.getElementById('sync-lt').textContent = 'LT: ' + meta.updated.slice(0, 19).replace('T', ' ');
      } else {
        document.getElementById('sync-lt').style.display = 'none';
      }
      $customColor.value = meta.cardColor || '#FF6B6B';
      $customColorText.value = meta.cardColor || '#FF6B6B';

      // 封面
      if (meta.image) {
        selectCoverImage(meta.image);
      } else if (meta.cardColor) {
        selectCoverColor(meta.cardColor);
      }

      quillEditor.setContents([]);
      if (body.trim()) {
        if (quillEditor.clipboard && typeof quillEditor.clipboard.dangerouslyPasteHTML === 'function') {
          quillEditor.clipboard.dangerouslyPasteHTML(body);
        } else {
          // Fallback if older quill or slightly different build
          quillEditor.root.innerHTML = body;
        }
      }
    } catch (e) {
      console.error('加载文章抛错:', e);
      showToast('加载文章失败', 'error');
      showList();
    }
  }

  // ---- Gallery Management Functions ----
  async function loadGalleryManagement() {
    try {
      $galleryList.innerHTML = '<div class="spinner"></div>';
      // 虽然前台有 index.json，但后台为了确保实时性，建议尝试从 GitHub 获取
      let content = await GITHUB_CMS.fetchFile('content/gallery/index.json');
      if (!content) {
        // 降级 fetch
        const res = await fetch(`/content/gallery/index.json?t=${Date.now()}`);
        if(res.ok) content = await res.text();
      }
      
      galleryItems = JSON.parse(content || '[]');
      renderGalleryManagement();
    } catch (e) {
      console.error('Load gallery error:', e);
      $galleryList.innerHTML = '<p>加载失败</p>';
    }
  }

  function renderGalleryManagement() {
    if (galleryItems.length === 0) {
      $galleryList.innerHTML = '<div class="empty-state">暂无照片</div>';
      return;
    }

    // 将所有图片从 posts 中摊平，每个上传现在视作一个 post
    const allImages = [];
    galleryItems.forEach((post, postIdx) => {
      if (post.images) {
        post.images.forEach((img, imgIdx) => {
          allImages.push({ ...img, date: post.date, postIdx, imgIdx });
        });
      }
    });

    // 按日期倒序
    allImages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    $galleryList.innerHTML = allImages.map(img => `
      <div class="masonry-item fade-in visible">
        <div class="cms-card-overlay">
          <button class="btn-icon danger delete-gallery-btn" data-post-idx="${img.postIdx}" data-img-idx="${img.imgIdx}">删除</button>
        </div>
        <img src="${escAttr(img.image)}" alt="${escAttr(img.sub_title)}" loading="lazy">
        <div class="masonry-overlay">
          <span class="masonry-title">${escHtml(img.sub_title || '无题')}</span>
          <span class="masonry-desc">${escHtml(img.description || '') || '<i style="opacity:0.5">暂无描述</i>'}</span>
        </div>
      </div>
    `).join('');

    $galleryList.querySelectorAll('.delete-gallery-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if(confirm('确定删除这张照片？')) {
          deleteGalleryItem(parseInt(btn.dataset.postIdx), parseInt(btn.dataset.imgIdx));
        }
      });
    });
  }

  async function deleteGalleryItem(postIdx, imgIdx) {
    try {
      showToast('正在删除...', 'info');
      
      // 注意：这里的 postIdx 和 imgIdx 是渲染时的索引，直接操作 galleryItems
      // 实际上我们应该根据唯一标识删除，但在这里为了简单，我们重新处理
      // 这里的逻辑需要小心，因为 allImages 的排序和 galleryItems 本身的顺序不一致
      // 但是 delete-gallery-btn 携带的是原始 galleryItems 的索引。
      
      const post = galleryItems[postIdx];
      if (!post) return;
      
      // 移除图片
      post.images.splice(imgIdx, 1);
      
      // 如果 post 下没图片了，也移除 post
      if (post.images.length === 0) {
        galleryItems.splice(postIdx, 1);
      }

      await GITHUB_CMS.commitRaw(
        'content/gallery/index.json',
        JSON.stringify(galleryItems, null, 2),
        'Gallery: delete image'
      );

      // 同时删除对应的单个 JSON 文件 (如果存在)
      const fileName = post.title? `gal-${post.date.replace(/[:-\s]/g, '')}.json` : null; 
      // 注意：之前的上传 logic 没有保存文件名，我们通过日期匹配或者只是尝试删除
      // 为了鲁棒，我们在新上传逻辑里把这个 JSON 文件名定好
      const imagePath = post.images[0].image;
      const jsonName = imagePath.split('/').pop().replace(/\.(jpg|jpeg|png|webp)$/i, '.json');
      await GITHUB_CMS.deleteFile(`content/gallery/${jsonName}`, `Gallery: delete metadata for ${jsonName}`);

      showToast('删除成功', 'success');
      loadGalleryManagement();
    } catch (e) {
      showToast('删除失败: ' + e.message, 'error');
    }
  }

  async function handleGalleryUpload(e) {
    e.preventDefault();
    const file = $galleryFileInput.files[0];
    const title = $galleryTitleInput.value.trim();
    const desc = $galleryDescInput.value.trim();

    if (!file) return showToast('请选择照片', 'error');
    if (!title) return showToast('请输入标题', 'error');

    showToast('正在上传...', 'info');
    const $btn = document.getElementById('btn-confirm-upload');
    $btn.disabled = true;
    $btn.textContent = '上传中...';

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const buffer = reader.result;
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64Data = btoa(binary);

        const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
        const fileName = `gal-${hash}.${ext}`;
        const filePath = `content/gallery/images/${fileName}`;

        // 1. 上传图片文件
        await GITHUB_CMS.commitRaw(filePath, base64Data, `Gallery: upload ${fileName}`);

        // 2. 更新 index.json
        const newEntry = {
          title: title, // collection title or post title
          date: beijingNowFull(),
          images: [{
            image: `/${filePath}`,
            sub_title: title,
            description: desc
          }]
        };
        
        galleryItems.unshift(newEntry);
        await GITHUB_CMS.commitRaw(
          'content/gallery/index.json',
          JSON.stringify(galleryItems, null, 2),
          'Gallery: add new image'
        );

        // 3. 上传单个元数据文件供 build_index.py 使用
        const jsonPath = `content/gallery/gal-${hash}.json`;
        await GITHUB_CMS.commitRaw(jsonPath, JSON.stringify(newEntry, null, 2), `Gallery: upload metadata ${fileName}`);

        showToast('上传成功', 'success');
        hideUploadModal();
        loadGalleryManagement();
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      showToast('上传失败: ' + e.message, 'error');
    } finally {
      $btn.disabled = false;
      $btn.textContent = '开始上传';
    }
  }

  function showUploadModal() {
    $uploadModal.style.display = 'flex';
    $uploadForm.reset();
    $galleryPreviewImg.style.display = 'none';
    $galleryDropZone.querySelector('.upload-placeholder').style.display = 'block';
    setTimeout(() => $uploadModal.querySelector('.auth-card').classList.add('visible'), 50);
  }

  function hideUploadModal() {
    $uploadModal.style.display = 'none';
    $uploadModal.querySelector('.auth-card').classList.remove('visible');
  }

  // ---- Quill Gallery Picker ----
  async function showGalleryPicker() {
    try {
      $pickerModal.style.display = 'flex';
      $pickerGrid.innerHTML = '<div class="spinner"></div>';
      setTimeout(() => $pickerModal.querySelector('.auth-card').classList.add('visible'), 50);

      const res = await fetch(`/content/gallery/index.json?t=${Date.now()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      let images = [];
      data.forEach(post => {
        if (post.images) {
          post.images.forEach(img => {
            images.push({ url: img.image, title: img.sub_title || post.title || '' });
          });
        }
      });

      if (images.length === 0) {
        $pickerGrid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem;">暂无照片</p>';
        return;
      }

      $pickerGrid.innerHTML = images.map(img => `
        <div class="cover-gallery-item" data-url="${escAttr(img.url)}">
          <img src="${escAttr(img.url)}" alt="${escAttr(img.title)}" title="${escAttr(img.title)}" loading="lazy">
        </div>
      `).join('');

      $pickerGrid.querySelectorAll('.cover-gallery-item').forEach(item => {
        item.addEventListener('click', () => {
          const url = item.dataset.url;
          const range = quillEditor.getSelection();
          quillEditor.insertEmbed(range ? range.index : 0, 'image', url);
          hideGalleryPicker();
        });
      });
    } catch {
      $pickerGrid.innerHTML = '<p>加载失败</p>';
    }
  }

  function hideGalleryPicker() {
    $pickerModal.style.display = 'none';
    $pickerModal.querySelector('.auth-card').classList.remove('visible');
  }

  // ---- 解析 YAML frontmatter ----
  function parseFrontmatter(text) {
    const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: text };
    const meta = {};
    match[1].split('\n').forEach(line => {
      const idx = line.indexOf(':');
      if (idx < 0) return;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[k] = v;
    });
    return { meta, body: match[2] };
  }

  // ---- 生成 slug ----
  function generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60) + '-' + Date.now().toString(36);
  }

  // ---- 事件绑定 ----
  function setupEventListeners() {
    // 搜索过滤
    const $searchInput = document.getElementById('cms-search-input');
    if ($searchInput) {
      $searchInput.addEventListener('input', () => {
        renderArticleList($searchInput.value);
      });
    }

    // 新建
    document.getElementById('btn-new-article').addEventListener('click', () => showForm());

    // 图片回收
    const $btnRecycle = document.getElementById('btn-recycle-images');
    if ($btnRecycle) {
      $btnRecycle.addEventListener('click', () => {
        if (confirm('是否扫描并清理 blog_image 中未使用的图片？\n此过程会分析所有文章正文。')) {
          recycleBlogImages();
        }
      });
    }

    // 导航栏文章 Tab / 取消（返回列表）
    const goBack = e => {
      if (e) e.preventDefault();
      const hasContent = currentEditSlug || ( $titleInput && $titleInput.value ) || ( quillEditor && quillEditor.getText().trim().length > 0 );
      if (hasContent) {
        if (!confirm('确定取消？未保存的内容将丢失。')) return;
      }
      showList();
    };
    document.getElementById('back-to-list').addEventListener('click', goBack);
    const $tabArticles = document.getElementById('tab-articles');
    const $tabGallery = document.getElementById('tab-gallery');
    if ($tabArticles) $tabArticles.addEventListener('click', (e) => { e.preventDefault(); showList(); });
    if ($tabGallery) $tabGallery.addEventListener('click', (e) => { e.preventDefault(); showGallery(); });

    // 保存并同步 (顶部单一按键)
    const $btnPublish = document.getElementById('btn-publish');
    if ($btnPublish) {
      $btnPublish.addEventListener('click', (e) => {
        e.preventDefault();
        saveArticle();
      });
    }

    // 标题计数与实时预览同步
    $titleInput.addEventListener('input', () => {
      $titleCount.textContent = `${$titleInput.value.length}/50`;
      document.getElementById('sync-title').textContent = $titleInput.value || '无标题';
    });

    // 摘要计数与实时预览同步
    $excerptInput.addEventListener('input', () => {
      $excerptCount.textContent = `${$excerptInput.value.length}/300`;
      document.getElementById('sync-excerpt').textContent = $excerptInput.value || '';
    });
    
    // 日期实时同步
    $dateInput.addEventListener('input', () => {
      document.getElementById('sync-ct').textContent = 'CT: ' + $dateInput.value.replace('T', ' ');
    });
    $updatedInput.addEventListener('input', () => {
      const v = $updatedInput.value;
      const $lt = document.getElementById('sync-lt');
      if (v) {
        $lt.style.display = 'inline';
        $lt.textContent = 'LT: ' + v.replace('T', ' ');
      } else {
        $lt.style.display = 'none';
      }
    });

    // 封面色预设
    $colorPresets.querySelectorAll('.color-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        selectCoverColor(btn.dataset.color);
      });
    });

    // 自定义颜色
    $customColor.addEventListener('input', () => {
      $customColorText.value = $customColor.value;
      selectCoverColor($customColor.value);
    });
    $customColorText.addEventListener('input', () => {
      const v = $customColorText.value;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        $customColor.value = v;
        selectCoverColor(v);
      }
    });

    // 封面图模式切换
    document.querySelectorAll('.cover-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cover-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        $coverGalleryGrid.style.display = mode === 'gallery' ? '' : 'none';
        $coverUrlWrap.style.display = mode === 'url' ? '' : 'none';
        $coverUploadWrap.style.display = mode === 'upload' ? '' : 'none';
      });
    });

    // 封面 URL输入确定按钮
    const btnApplyUrl = document.getElementById('btn-apply-url');
    if (btnApplyUrl) {
      btnApplyUrl.addEventListener('click', () => {
        if ($coverUrlInput.value) selectCoverImage($coverUrlInput.value);
      });
    }

    // 封面上传
    $coverUploadInput.addEventListener('change', () => {
      const file = $coverUploadInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        selectCoverImage(e.target.result);
      };
      reader.readAsDataURL(file);
    });

    // 清除封面图
    $btnClearCover.addEventListener('click', () => {
      clearCoverPreview();
    });

    // 自适应最佳缩放
    if ($btnAutofit) {
      $btnAutofit.addEventListener('click', () => {
        if (!selectedCoverImage || !coverImgEl) return;
        const boxRect = $coverPreview.getBoundingClientRect();
        const boxW = boxRect.width || 420;
        const boxH = boxRect.height || 280;
        const scaleW = boxW / coverImgEl.naturalWidth;
        const scaleH = boxH / coverImgEl.naturalHeight;
        cropScale = Math.max(scaleW, scaleH);
        cropPanX = 0;
        cropPanY = 0;
        if ($coverZoomRange) $coverZoomRange.value = cropScale;
        updateCoverTransform();
      });
    }

    // 缩放滑块
    if ($coverZoomRange) {
      $coverZoomRange.addEventListener('input', () => {
        cropScale = parseFloat($coverZoomRange.value);
        updateCoverTransform();
      });
    }

    // 滚轮缩放
    $coverPreview.addEventListener('wheel', (e) => {
      if (!selectedCoverImage || !coverImgEl) return;
      e.preventDefault();
      const zoomStep = 0.05;
      cropScale += e.deltaY < 0 ? zoomStep : -zoomStep;
      cropScale = Math.min(Math.max(cropScale, 0.1), 5);
      if ($coverZoomRange) $coverZoomRange.value = cropScale;
      updateCoverTransform();
    }, { passive: false });

    // 鼠标/手指拖动
    function onDragStart(e) {
      if (!selectedCoverImage || !coverImgEl) return;
      isDraggingCover = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      dragStartX = clientX - cropPanX;
      dragStartY = clientY - cropPanY;
    }
    function onDragMove(e) {
      if (!isDraggingCover) return;
      e.preventDefault(); 
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      cropPanX = clientX - dragStartX;
      cropPanY = clientY - dragStartY;
      updateCoverTransform();
    }
    function onDragEnd() {
      isDraggingCover = false;
    }
    
    $coverPreview.addEventListener('mousedown', onDragStart);
    $coverPreview.addEventListener('touchstart', onDragStart, { passive: false });
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchend', onDragEnd);

    // ---- Gallery Manager Events ----
    if ($btnShowUpload) $btnShowUpload.addEventListener('click', showUploadModal);
    if ($btnCancelUpload) $btnCancelUpload.addEventListener('click', hideUploadModal);
    if ($uploadForm) $uploadForm.addEventListener('submit', handleGalleryUpload);

    if ($galleryDropZone) {
      $galleryDropZone.addEventListener('click', () => $galleryFileInput.click());
      
      $galleryDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        $galleryDropZone.classList.add('dragover');
      });
      ['dragleave', 'dragend'].forEach(type => {
        $galleryDropZone.addEventListener(type, () => $galleryDropZone.classList.remove('dragover'));
      });
      $galleryDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        $galleryDropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
          $galleryFileInput.files = e.dataTransfer.files;
          handleGalleryFilePreview($galleryFileInput.files[0]);
        }
      });
    }

    if ($galleryFileInput) {
      $galleryFileInput.addEventListener('change', () => {
        if ($galleryFileInput.files.length) {
          handleGalleryFilePreview($galleryFileInput.files[0]);
        }
      });
    }

    if ($btnClosePicker) $btnClosePicker.addEventListener('click', hideGalleryPicker);

    function handleGalleryFilePreview(file) {
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        $galleryPreviewImg.src = e.target.result;
        $galleryPreviewImg.style.display = 'block';
        $galleryDropZone.querySelector('.upload-placeholder').style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  }

  function updateCoverTransform() {
    if (coverImgEl) {
      coverImgEl.style.transform = `translate(calc(-50% + ${cropPanX}px), calc(-50% + ${cropPanY}px)) scale(${cropScale})`;
    }
  }

  // ---- 提取自前台的颜色渲染逻辑 ----
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

  function parseColor(colorStr) {
    if (!colorStr) return null;
    colorStr = colorStr.trim();
    let match = colorStr.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (match) return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
    match = colorStr.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
    if (match) return {
      r: parseInt(match[1] + match[1], 16),
      g: parseInt(match[2] + match[2], 16),
      b: parseInt(match[3] + match[3], 16)
    };
    match = colorStr.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (match) return { r: parseInt(match[1], 10), g: parseInt(match[2], 10), b: parseInt(match[3], 10) };
    return null;
  }

  function getLuminance(rgb) {
    const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
    const r = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
    const g = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
    const b = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function getContrastColor(colorStr, threshold = 0.5) {
    const rgb = parseColor(colorStr);
    if (!rgb) return null;
    const luminance = getLuminance(rgb);
    return luminance > threshold ? '#2C2C2C' : '#FFFFFF';
  }

  function getGradientFromColor(colorStr) {
    if (!colorStr) return '';
    const rgb = parseColor(colorStr);
    if (!rgb) return `linear-gradient(135deg, ${colorStr} 0%, ${colorStr} 100%)`;
    const r = Math.min(255, rgb.r + 60);
    const g = Math.min(255, rgb.g + 60);
    const b = Math.min(255, rgb.b + 60);
    return `linear-gradient(135deg, ${colorStr} 0%, rgb(${r},${g},${b}) 100%)`;
  }

  function selectCoverColor(color) {
    // 如果有图片选中，彻底清除图片相关选择状态
    if (selectedCoverImage) {
      selectedCoverImage = null;
      // 取消相册的选中状态
      const galleryItems = document.querySelectorAll('.cover-gallery-item');
      if (galleryItems) galleryItems.forEach(i => i.classList.remove('selected'));
    }
    // 始终清空 URL 输入和文件输入
    $coverUrlInput.value = '';
    $coverUploadInput.value = '';
    
    // 设置并激活颜色选择器
    selectedCoverColor = color;
    $colorPresets.querySelectorAll('.color-preset').forEach(p => {
      p.classList.toggle('selected', p.dataset.color === color);
    });
    $customColor.value = color;
    $customColorText.value = color;
    enableColorPicker();
    
    // 在预览框显示前台的 Aero 渐变
    const oldImg = $coverPreview.querySelector('img.cover-preview-img');
    if (oldImg) oldImg.remove();
    
    $coverPreview.style.background = getGradientFromColor(color);
    $coverPreview.classList.remove('has-image');
    $coverPreview.classList.add('has-color');
    $coverPreview.style.display = 'block';
    $btnClearCover.style.display = '';
    
    // 隐藏裁切控件
    if ($coverZoomCtrl) $coverZoomCtrl.style.display = 'none';
    coverImgEl = null;
  }

  function selectCoverImage(url) {
    // 如果有颜色选中，彻底清除颜色相关选择状态
    if (selectedCoverColor) {
      selectedCoverColor = null;
      $colorPresets.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
      disableColorPicker();
    }
    
    selectedCoverImage = url;
    $coverUrlInput.value = '';
    
    // 初始化裁切状态 (先不显示控制条)
    cropPanX = 0;
    cropPanY = 0;
    cropScale = 1;
    if ($coverZoomRange) $coverZoomRange.value = 1;
    
    const img = new Image();
    img.className = 'cover-preview-img';
    // 移除 img.crossOrigin = 'anonymous'; 避免不必要的 CORS 拦截
    
    img.onload = () => {
      const boxRect = $coverPreview.getBoundingClientRect();
      const boxW = boxRect.width || 420;
      const boxH = boxRect.height || 280;
      const scaleW = boxW / img.naturalWidth;
      const scaleH = boxH / img.naturalHeight;
      cropScale = Math.max(scaleW, scaleH);
      if ($coverZoomRange) $coverZoomRange.value = cropScale;
      updateCoverTransform();

      // 图片加载成功后再显示预览和控制条
      $coverPreview.style.display = 'block';
      $coverPreview.classList.add('has-image');
      $coverPreview.classList.remove('has-color');
      if ($coverZoomCtrl) $coverZoomCtrl.style.display = 'flex';
    };
    
    img.onerror = () => {
      showToast('图片加载失败，请检查 URL 是否有效或存在跨域限制', 'error');
      $coverPreview.classList.remove('has-image');
      $coverPreview.style.display = 'none';
      if ($coverZoomCtrl) $coverZoomCtrl.style.display = 'none';
      selectedCoverImage = null;
    };
    
    img.src = url;
    coverImgEl = img;
    
    const oldImg = $coverPreview.querySelector('img.cover-preview-img');
    if (oldImg) oldImg.remove();
    $coverPreview.insertBefore(img, $coverPreview.firstChild);
    
    $coverPreview.style.background = 'transparent';
    $coverPreview.style.backgroundColor = '';
    $btnClearCover.style.display = '';
  }

  function clearCoverPreview() {
    selectedCoverColor = null;
    selectedCoverImage = null;
    
    const oldImg = $coverPreview.querySelector('img.cover-preview-img');
    if (oldImg) oldImg.remove();
    
    $coverPreview.style.backgroundColor = '';
    $coverPreview.classList.remove('has-image');
    $coverPreview.classList.remove('has-color');
    $coverPreview.style.display = 'none';
    $colorPresets.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
    $coverUrlInput.value = '';
    $coverUploadInput.value = '';
    $btnClearCover.style.display = 'none';
    if ($coverZoomCtrl) $coverZoomCtrl.style.display = 'none';
    coverImgEl = null;
    enableColorPicker();
  }

  function disableColorPicker() {
    $colorPresets.querySelectorAll('.color-preset').forEach(p => p.style.opacity = '0.4');
    $customColor.disabled = true;
    $customColorText.disabled = true;
  }

  function enableColorPicker() {
    $colorPresets.querySelectorAll('.color-preset').forEach(p => p.style.opacity = '1');
    $customColor.disabled = false;
    $customColorText.disabled = false;
  }

  // ---- 加载 Gallery 供封面选择 ----
  async function loadGalleryForCoverPicker() {
    try {
      const res = await fetch('/content/gallery/index.json');
      if (!res.ok) return;
      const data = await res.json();
      let images = [];
      data.forEach(post => {
        if (post.images) {
          post.images.forEach(img => {
            images.push({ url: img.image, title: img.sub_title || post.title || '' });
          });
        }
      });
      if (images.length === 0) {
        $coverGalleryGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem">暂无图片</p>';
        return;
      }
      $coverGalleryGrid.innerHTML = images.map(img => `
        <div class="cover-gallery-item" data-url="${escAttr(img.url)}">
          <img src="${escAttr(img.url)}" alt="${escAttr(img.title)}" loading="lazy">
        </div>`).join('');
      $coverGalleryGrid.querySelectorAll('.cover-gallery-item').forEach(item => {
        item.addEventListener('click', () => {
          selectCoverImage(item.dataset.url);
          $coverGalleryGrid.querySelectorAll('.cover-gallery-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        });
      });
    } catch {
      $coverGalleryGrid.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem">加载失败</p>';
    }
  }

  // ---- Quill 初始化 ----
  function initQuill() {
    // 注册自定义图标
    const icons = Quill.import('ui/icons');
    icons['gallery'] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
    icons['image_local'] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>';
    icons['image_url'] = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';

    quillEditor = new Quill('#quill-editor', {
      theme: 'snow',
      placeholder: '开始写作...',
      modules: {
        toolbar: {
          container: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['blockquote', 'code-block'],
            ['link', 'image_local', 'image_url', 'gallery'], // Split into two buttons
            ['clean']
          ],
          handlers: {
            image_local: handleImageLocal,
            image_url: handleImageURL,
            gallery: showGalleryPicker
          }
        },
        clipboard: {
          matchers: [
            ['img', (node, delta) => {
              // 这里的 delta 包含图片地址，如果是 base64，我们后续在 save 时统一处理或重写此逻辑
              // 为了简单且不破坏用户体验，我们允许粘贴，但在 save 时强制转换并上传
              return delta;
            }]
          ]
        }
      }
    });

    // 监听粘贴事件，尝试立即处理图片
    quillEditor.root.addEventListener('paste', async (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          uploadImageFile(file);
        }
      }
    });

    // 监听拖拽事件
    quillEditor.root.addEventListener('drop', async (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          uploadImageFile(file);
        }
      }
    });
  }

  // 抽出通用的图片上传逻辑
  async function uploadImageFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        showToast('正在上传图片...', 'info');
        const buffer = reader.result;
        const bytes = new Uint8Array(buffer);
        
        // 转换为 Base64 供 GitHub API 使用
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        const extRaw = file.name ? file.name.split('.').pop().toLowerCase() : 'png';
        const ext = extRaw === 'jpeg' ? 'jpg' : extRaw;
        
        // 直接使用 ArrayBuffer 计算哈希，更可靠
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
        
        const fileName = `img-${hash}.${ext || 'png'}`;
        const path = `content/blog/blog_image/${fileName}`;

        await GITHUB_CMS.commitRaw(path, base64Data, `Upload blog image: ${fileName}`);
        
        const range = quillEditor.getSelection();
        const url = `/${path}`;
        quillEditor.insertEmbed(range ? range.index : 0, 'image', url);
        showToast('图片上传成功', 'success');
      } catch (e) {
        console.error('图片上传失败', e);
        showToast('图片上传失败: ' + e.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImageLocal() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files[0];
      uploadImageFile(file);
    };
  }

  function handleImageURL() {
    const url = prompt('请输入图片 URL:');
    if (url && url.trim()) {
      const range = quillEditor.getSelection();
      quillEditor.insertEmbed(range ? range.index : 0, 'image', url.trim());
    }
  }

  // ---- 自动保存草稿 ----
  function startAutoSave() {
    stopAutoSave();
    autoSaveTimer = setInterval(() => {
      if ($titleInput.value) {
        saveToLocalStorage();
      }
    }, 15000);
  }

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

  function saveToLocalStorage() {
    const draft = {
      slug: currentEditSlug,
      title: $titleInput.value,
      excerpt: $excerptInput.value,
      date: $dateInput.value,
      cardColor: selectedCoverColor,
      image: selectedCoverImage,
      draft: !$visibleSwitch.checked,
      body: quillEditor.root.innerHTML
    };
    localStorage.setItem('cms_draft', JSON.stringify(draft));
  }

  function loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('cms_draft');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function clearLocalStorage() {
    localStorage.removeItem('cms_draft');
  }

  // ---- 将拖拽后的图片裁切为 Base64 ----
  function getCroppedBase64() {
    if (!selectedCoverImage || !coverImgEl) return selectedCoverImage;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    // 输出分辨率：1200x800 (保持 3:2 完美比例)
    canvas.width = 1200;
    canvas.height = 800;
    
    const boxRect = $coverPreview.getBoundingClientRect();
    if (!boxRect.width || !boxRect.height) return selectedCoverImage;
    
    // 渲染比例计算 (Canvas 到 预览框 的映射)
    const renderRatio = canvas.width / boxRect.width; 
    
    ctx.fillStyle = '#f3f4f6'; // 默认底色
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 预览框的物理中心
    const cx = boxRect.width / 2;
    const cy = boxRect.height / 2;
    
    // 映射到 Canvas 中的坐标
    const drawX = (cx + cropPanX) * renderRatio;
    const drawY = (cy + cropPanY) * renderRatio;
    const drawW = coverImgEl.naturalWidth * cropScale * renderRatio;
    const drawH = coverImgEl.naturalHeight * cropScale * renderRatio;
    
    ctx.translate(drawX, drawY);
    ctx.drawImage(coverImgEl, -drawW/2, -drawH/2, drawW, drawH);
    
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  // ---- 保存文章到 GitHub ----
  async function saveArticle() {
    const title = $titleInput.value.trim();
    if (!title) return showToast('请输入标题', 'error');

    // 按钮进入加载状态 (统一使用 btn-publish)
    const $btn = document.getElementById('btn-publish');
    const oldText = $btn.textContent;
    $btn.disabled = true;
    $btn.textContent = '正在同步到 GitHub...';

    const isVisible = $visibleSwitch.checked;

    try {
      const slug = currentEditSlug || generateSlug(title);
      const date = $dateInput.value ? $dateInput.value.replace('T', ' ') + ':00' : beijingNowFull();
      const updated = beijingNowFull();
      const excerpt = $excerptInput.value.trim();
      const cardColor = selectedCoverColor || '';
      let image = selectedCoverImage || '';
      const draft = isVisible ? 'false' : 'true'; // 保持 draft 字段名以兼容旧代码，但语义改变
      let body = quillEditor.root.innerHTML;
 
      // --- 关键：扫描并自动转换正文中的 Base64 图片 ---
      // 更加鲁棒的正则：匹配包含其他属性的 img 标签
      const base64Regex = /<img[^>]+src="(data:image\/([^;]+);base64,[^"]+)"[^>]*>/g;
      let match;
      const base64Matches = [];
      while ((match = base64Regex.exec(body)) !== null) {
        base64Matches.push({
          fullTag: match[0],
          dataUrl: match[1],
          ext: match[2].replace('jpeg', 'jpg'), // 规范化扩展名
          data: match[1].split(',')[1]
        });
      }
 
      if (base64Matches.length > 0) {
        $btn.textContent = `同步图片中 (0/${base64Matches.length})...`;
        for (let i = 0; i < base64Matches.length; i++) {
          const m = base64Matches[i];
          
          // 重新计算哈希
          const binaryString = atob(m.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let k = 0; k < binaryString.length; k++) {
            bytes[k] = binaryString.charCodeAt(k);
          }
          const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
          
          const fileName = `img-${hash}.${m.ext}`;
          const path = `content/blog/blog_image/${fileName}`;
          
          try {
            await GITHUB_CMS.commitRaw(path, m.data, `Auto-upload blog image: ${fileName}`);
            // 安全替换：只替换 src 部分，保留其他属性 (width, alt 等)
            const updatedTag = m.fullTag.replace(m.dataUrl, `/${path}`);
            body = body.replace(m.fullTag, updatedTag);
            $btn.textContent = `同步图片中 (${i + 1}/${base64Matches.length})...`;
          } catch (err) {
            console.error('自动同步图片失败:', err);
            // 这里我们不中断，但保留 base64 还是报错？建议报错中断。
            throw new Error(`图片 ${i + 1} 同步至 GitHub 失败，请检查网络或重试`);
          }
        }
      }

      // 封面裁切处理
      if (image && coverImgEl) {
        try { image = getCroppedBase64(); } catch (e) { console.warn('裁切失败', e); }
      }

      const frontmatter = [
        '---',
        `title: "${title}"`,
        `date: "${date}"`,
        `updated: "${updated}"`,
        `draft: ${draft}`,
        excerpt ? `excerpt: "${excerpt}"` : '',
        cardColor ? `cardColor: "${cardColor}"` : '',
        image ? `image: "${image}"` : '',
        '---',
        '',
        body,
        ''
      ].filter(l => l !== '').join('\n');

      // 1. 保存 .md 文件到 GitHub
      await GITHUB_CMS.commitFile(`content/blog/${slug}.md`, frontmatter, `Update article: ${title}`);

      // 2. 更新文章列表索引
      const articleEntry = { slug, title, date, updated, draft, excerpt, cardColor, image };
      const existingIdx = articles.findIndex(p => p.slug === slug);
      if (existingIdx >= 0) articles[existingIdx] = articleEntry;
      else articles.unshift(articleEntry);

      // 3. 上传更新后的 index.json
      await GITHUB_CMS.commitFile('content/blog/index.json', JSON.stringify(articles, null, 2), 'Sync blog index');

      // 模拟更新本地状态
      localStorage.setItem('cms_index', JSON.stringify(articles));
      $updatedInput.value = updated.slice(0, 16).replace(' ', 'T');
      clearLocalStorage();
      renderArticleList();
      showToast('文章内容已同步到 GitHub', 'success');
      showList();
      renderArticleList();
    } catch (e) {
      console.error('发布失败:', e);
      showToast('发布失败: ' + e.message, 'error');
    } finally {
      $btn.disabled = false;
      $btn.textContent = oldText;
    }
  }

  /**
   * 图片回收逻辑
   * 扫描所有文章 body，与 blog_image 文件夹对比，删除无引用文件。
   */
  async function recycleBlogImages() {
    try {
      showToast('正在初始化扫描...', 'info');
      // 1. 获取所有文章 slug
      const slugs = articles.map(a => a.slug);
      const usedImages = new Set();
      
      // 2. 遍历拉取每个文章内容
      showToast(`正在扫描正文 (共 ${slugs.length} 篇)...`, 'info');
      
      for (const slug of slugs) {
        try {
          const res = await fetch(`/content/blog/${slug}.md?t=${Date.now()}`);
          if (!res.ok) continue;
          const text = await res.text();
          // 匹配 /content/blog/blog_image/ 路径
          const regex = /\/content\/blog\/blog_image\/img-[a-zA-Z0-9]+\.[a-zA-Z0-9]+/g;
          let m;
          while ((m = regex.exec(text)) !== null) {
            usedImages.add(m[0].split('/').pop()); // 只存文件名
          }
        } catch (e) {
          console.warn(`Scan failed for ${slug}`, e);
        }
      }

      // 3. 获取 blog_image 文件夹所有文件
      showToast('拉取仓库文件列表...', 'info');
      const files = await GITHUB_CMS.listDir('content/blog/blog_image');
      const repoFiles = files.filter(f => f.type === 'file' && f.name !== '.gitkeep');
      
      // 4. 计算孤儿文件
      const orphans = repoFiles.filter(f => !usedImages.has(f.name));
      
      if (orphans.length === 0) {
        showToast('未发现冗余图片，仓库很干净', 'success');
        return;
      }

      if (!confirm(`扫描完成：\n正引用图片：${usedImages.size} 张\n待清理冗余：${orphans.length} 张\n\n确定彻底从 GitHub 删除这些冗余文件吗？`)) {
        return;
      }

      // 5. 执行删除
      let successCount = 0;
      for (const file of orphans) {
        try {
          await GITHUB_CMS.deleteFile(file.path, `Recycle unused image: ${file.name}`);
          successCount++;
          showToast(`已清理 (${successCount}/${orphans.length})...`, 'info');
        } catch (e) {
          console.error(`Recycle failed for ${file.name}`, e);
        }
      }

      showToast(`清理完成！共删除 ${successCount} 张过期图片`, 'success');
    } catch (e) {
      console.error('图片回收失败', e);
      showToast('回收失败: ' + e.message, 'error');
    }
  }

  // ---- 删除文章 ----
  async function deleteArticle(slug) {
    if (!confirm(`确定要彻底删除文章 [${slug}] 吗？\n此操作将同步删除 GitHub 上的源文件，无法撤销。`)) return;

    try {
      showToast('正在从 GitHub 删除...', 'info');

      // 1. 从内存和本地存储中移除
      articles = articles.filter(p => p.slug !== slug);
      localStorage.setItem('cms_index', JSON.stringify(articles));
      
      const saved = JSON.parse(localStorage.getItem('cms_saved') || '[]');
      const newSaved = saved.filter(s => s.slug !== slug);
      localStorage.setItem('cms_saved', JSON.stringify(newSaved));

      // 1. 删除 GitHub 上的 .md 文件
      await GITHUB_CMS.deleteFile(`content/blog/${slug}.md`, `Delete article file: ${slug}`);

      // 2. 同步更新 GitHub 上的 index.json
      await GITHUB_CMS.commitFile('content/blog/index.json', JSON.stringify(articles, null, 2), `Delete article index: ${slug}`);

      renderArticleList();
      showToast('文章及源文件已从 GitHub 彻底删除', 'success');
    } catch (e) {
      console.error('删除失败:', e);
      showToast('同步删除失败: ' + e.message, 'error');
      // 失败时建议用户手动刷新以对齐状态
    }
  }

  // ---- 工具函数 ----
  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escAttr(str) {
    return str.replace(/"/g, '&quot;');
  }


  /**
   * 图片回收逻辑
   * 扫描所有文章 body，与 blog_image 文件夹对比，删除无引用文件。
   */
  async function recycleBlogImages() {
    try {
      showToast('正在初始化扫描...', 'info');
      // 1. 获取所有文章 slug
      const slugs = articles.map(a => a.slug);
      const usedImages = new Set();
      
      // 2. 遍历拉取每个文章内容
      showToast(`正在扫描正文 (共 ${slugs.length} 篇)...`, 'info');
      
      for (const slug of slugs) {
        try {
          const res = await fetch(`/content/blog/${slug}.md?t=${Date.now()}`);
          if (!res.ok) continue;
          const text = await res.text();
          // 匹配 /content/blog/blog_image/ 路径
          const regex = /\/content\/blog\/blog_image\/img-[a-zA-Z0-9]+\.[a-zA-Z0-9]+/g;
          let m;
          while ((m = regex.exec(text)) !== null) {
            usedImages.add(m[0].split('/').pop()); // 只存文件名
          }
        } catch (e) {
          console.warn(`Scan failed for ${slug}`, e);
        }
      }

      // 3. 获取 blog_image 文件夹所有文件
      showToast('拉取仓库文件列表...', 'info');
      const files = await GITHUB_CMS.listDir('content/blog/blog_image');
      const repoFiles = files.filter(f => f.type === 'file' && f.name !== '.gitkeep');
      
      // 4. 计算孤儿文件
      const orphans = repoFiles.filter(f => !usedImages.has(f.name));
      
      if (orphans.length === 0) {
        showToast('未发现冗余图片，仓库很干净', 'success');
        return;
      }

      if (!confirm(`扫描完成：\n正引用图片：${usedImages.size} 张\n待清理冗余：${orphans.length} 张\n\n确定彻底从 GitHub 删除这些冗余文件吗？`)) {
        return;
      }

      // 5. 执行删除
      let successCount = 0;
      for (const file of orphans) {
        try {
          await GITHUB_CMS.deleteFile(file.path, `Recycle unused image: ${file.name}`);
          successCount++;
          showToast(`已清理 (${successCount}/${orphans.length})...`, 'info');
        } catch (e) {
          console.error(`Recycle failed for ${file.name}`, e);
        }
      }

      showToast(`清理完成！共删除 ${successCount} 张过期图片`, 'success');
    } catch (e) {
      console.error('图片回收失败', e);
      showToast('回收失败: ' + e.message, 'error');
    }
  }

  function showToast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  // ---- 启动 ----
  init();

})();
