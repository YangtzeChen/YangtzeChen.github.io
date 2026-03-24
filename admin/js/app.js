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
  const $btnClearCover = document.getElementById('btn-clear-cover');

  // ---- 工具：获取北京时间（UTC+8） ----
  function beijingNow() {
    const d = new Date();
    const offset = 8 * 60 - d.getTimezoneOffset();
    const local = new Date(d.getTime() + offset * 60000);
    return local.toISOString().slice(0, 16);
  }
  function beijingNowFull() {
    const d = new Date();
    const offset = 8 * 60 - d.getTimezoneOffset();
    const local = new Date(d.getTime() + offset * 60000);
    return local.toISOString().replace('T', ' ').slice(0, 19);
  }

  // ---- 初始化 ----
  async function init() {
    await loadArticles();
    setupEventListeners();
    initQuill();
    loadGalleryForCoverPicker();
    // 填充默认发布日期（北京时区）
    $dateInput.value = beijingNow();
  }

  // ---- 加载文章列表 ----
  async function loadArticles() {
    try {
      const res = await fetch('/content/blog/index.json');
      if (!res.ok) throw new Error('not found');
      articles = await res.json();
    } catch {
      articles = [];
    }
    
    // 优先读取本地保存的列表（针对纯前端无后端演示的情况）
    const localIndex = JSON.parse(localStorage.getItem('cms_index') || 'null');
    if (localIndex && Array.isArray(localIndex)) {
      articles = localIndex;
    } else {
      localStorage.setItem('cms_index', JSON.stringify(articles));
    }
    renderArticleList();
  }

  // ---- 渲染文章列表 ----
  function renderArticleList() {
    if (articles.length === 0) {
      $articleList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>暂无文章</p>
        </div>`;
      return;
    }
    $articleList.innerHTML = articles.map(post => `
      <div class="article-item" data-slug="${post.slug}">
        <div class="article-info">
          <div class="article-title">${escHtml(post.title || '无标题')}</div>
          <div class="article-meta">
            <span>${post.date ? post.date.slice(0, 10) : '未知日期'}</span>
            <span>${post.excerpt ? post.excerpt.slice(0, 30) + '...' : '无摘要'}</span>
          </div>
        </div>
        <span class="article-badge ${post.draft ? 'badge-draft' : 'badge-published'}">
          ${post.draft ? '草稿' : '已发布'}
        </span>
        <div class="article-actions">
          <button class="btn-icon edit-btn" data-slug="${post.slug}">编辑</button>
          <button class="btn-icon danger delete-btn" data-slug="${post.slug}">删除</button>
        </div>
      </div>`).join('');

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
    stopAutoSave();
    currentEditSlug = null;
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
    $customColor.value = '#E98181';
    $customColorText.value = '#E98181';
    selectedCoverColor = null;
    selectedCoverImage = null;
    clearCoverPreview();
    quillEditor.setContents([]);
    // 清除预设选中
    $colorPresets.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
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
      $dateInput.value = (meta.date || '').slice(0, 16);
      $updatedInput.value = meta.updated ? meta.updated.slice(0, 16) : '';
      $titleInput.value = meta.title || '';
      $titleCount.textContent = `${(meta.title || '').length}/50`;
      $excerptInput.value = meta.excerpt || '';
      $excerptCount.textContent = `${(meta.excerpt || '').length}/300`;
      $visibleSwitch.checked = meta.draft !== 'true';
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
        quillEditor.clipboardConverter.convert(body);
      }
    } catch {
      showToast('加载文章失败', 'error');
      showList();
    }
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
    // 新建
    document.getElementById('btn-new-article').addEventListener('click', () => showForm());

    // 取消（返回列表）
    document.getElementById('back-to-list').addEventListener('click', e => {
      e.preventDefault();
      if (currentEditSlug || $titleInput.value || quillEditor.getText().trim().length > 0) {
        if (!confirm('确定取消？未保存的内容将丢失。')) return;
      }
      showList();
    });

    // 保存草稿
    document.getElementById('btn-save-draft').addEventListener('click', () => saveArticle(true));

    // 发布
    document.getElementById('btn-publish').addEventListener('click', () => saveArticle(false));

    // 标题计数
    $titleInput.addEventListener('input', () => {
      $titleCount.textContent = `${$titleInput.value.length}/50`;
    });

    // 摘要计数
    $excerptInput.addEventListener('input', () => {
      $excerptCount.textContent = `${$excerptInput.value.length}/300`;
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
  }

  // ---- 提取自前台的颜色渲染逻辑 ----
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
    return null;
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
    $coverPreview.innerHTML = '';
    $coverPreview.style.background = getGradientFromColor(color);
    $coverPreview.classList.remove('has-image');
    $coverPreview.classList.add('has-color');
    $coverPreview.style.display = 'block';
    $btnClearCover.style.display = '';
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
    
    // 在预览框显示图片
    $coverPreview.innerHTML = `<img src="${url}" onerror="this.parentElement.classList.remove('has-image');this.parentElement.style.display='none'">`;
    $coverPreview.style.background = 'transparent'; // 去除可能的颜色背景
    $coverPreview.style.backgroundColor = '';
    $coverPreview.classList.add('has-image');
    $coverPreview.classList.remove('has-color');
    $coverPreview.style.display = 'block';
    $btnClearCover.style.display = '';
  }

  function clearCoverPreview() {
    selectedCoverColor = null;
    selectedCoverImage = null;
    $coverPreview.innerHTML = '';
    $coverPreview.style.backgroundColor = '';
    $coverPreview.classList.remove('has-image');
    $coverPreview.classList.remove('has-color');
    $coverPreview.style.display = 'none';
    $colorPresets.querySelectorAll('.color-preset').forEach(p => p.classList.remove('selected'));
    $coverUrlInput.value = '';
    $coverUploadInput.value = '';
    $btnClearCover.style.display = 'none';
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
    quillEditor = new Quill('#quill-editor', {
      theme: 'snow',
      placeholder: '开始写作...',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          ['blockquote', 'code-block'],
          ['link', 'image'],
          ['clean']
        ]
      }
    });
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

  // ---- 保存文章 ----
  async function saveArticle(asDraft) {
    const title = $titleInput.value.trim();
    if (!title) {
      showToast('请输入标题', 'error');
      return;
    }

    const slug = currentEditSlug || (asDraft ? generateSlug(title) : generateSlug(title));
    const date = $dateInput.value ? $dateInput.value.replace('T', ' ') + ':00' : beijingNowFull();
    const updated = beijingNowFull();
    const excerpt = $excerptInput.value.trim();
    const cardColor = selectedCoverColor || '';
    let image = selectedCoverImage || '';
    const draft = asDraft ? 'true' : 'false';
    const body = quillEditor.root.innerHTML;
    const bodyText = quillEditor.getText();

    // 如果是草稿且提供了外部图片链接，尝试将其转换为 Base64 保存
    if (asDraft && image && !image.startsWith('data:image')) {
      try {
        const res = await fetch(image, { mode: 'cors' });
        const blob = await res.blob();
        image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('转 Base64 失败(可能跨域限制)，由于没有后端辅助，将继续以 URL 形式保存', e);
      }
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
    ].filter(line => line !== '').join('\n');

    // 构造 FormData 提交（GitHub Pages 无后端，用 localStorage 模拟保存提示）
    // 实际使用时需要通过 GitHub API 或其他后端保存
    const saveInfo = {
      slug,
      frontmatter,
      savedAt: new Date().toISOString()
    };

    // 演示：保存到 localStorage
    const saved = JSON.parse(localStorage.getItem('cms_saved') || '[]');
    saved.unshift(saveInfo);
    localStorage.setItem('cms_saved', JSON.stringify(saved.slice(0, 50)));

    // 更新文章列表（模拟）
    const existingIdx = articles.findIndex(p => p.slug === slug);
    const articleEntry = {
      slug,
      title,
      date: date,
      updated,
      draft: asDraft,
      excerpt,
      cardColor,
      image
    };
    if (existingIdx >= 0) {
      articles[existingIdx] = articleEntry;
    } else {
      articles.unshift(articleEntry);
    }

    // 重建 index.json（模拟）
    localStorage.setItem('cms_index', JSON.stringify(articles));

    // 保存后更新表单里的"最后修改"字段
    $updatedInput.value = updated.slice(0, 16).replace(' ', 'T');

    clearLocalStorage();
    showToast(asDraft ? '草稿已保存' : '文章已发布', 'success');
    showList();
    renderArticleList();
  }

  // ---- 删除文章 ----
  async function deleteArticle(slug) {
    // 模拟删除
    articles = articles.filter(p => p.slug !== slug);
    localStorage.setItem('cms_index', JSON.stringify(articles));
    
    // 同时从本地草稿里删除
    const saved = JSON.parse(localStorage.getItem('cms_saved') || '[]');
    const newSaved = saved.filter(s => s.slug !== slug);
    localStorage.setItem('cms_saved', JSON.stringify(newSaved));
    
    renderArticleList();
    showToast('文章已删除', 'success');
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
