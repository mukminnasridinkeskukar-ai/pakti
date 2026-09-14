/* ============================================
 * PAKTI - Document Editor (Word-like)
 * ============================================
 * Menggunakan TinyMCE sebagai rich text editor
 * - Mode Preview & Edit
 * - Toolbar lengkap (Font, Paragraph, Insert, Format)
 * - Halaman A4 dengan margin visual
 * - Autosave ke Supabase (tabel dokumen_pak)
 * - Version History dengan restore
 * - Export PDF (print) & DOCX
 * ============================================ */

let editorInstance = null;
let editorCurrentData = null;        // data pegawai yang sedang dibuka
let editorDokumenId = null;          // ID dokumen di database (null jika belum disimpan)
let editorPengaturanHalaman = {
  size: 'A4',
  orientation: 'portrait',
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 18,
  marginRight: 18,
  lineHeight: 1.5,
  paragraphSpacing: 8,
};
let editorAutoSaveTimer = null;
let editorIsSaving = false;
let editorLastSavedContent = '';

/* ============================================
 * BUKA EDITOR DARI PREVIEW
 * ============================================
 * Dipanggil dari tombol "Edit Dokumen" di preview PAK
 * @param {object} pakData - data PAK yang sudah di-generate
 * ============================================ */
async function openDocumentEditor(pakData) {
  if (!pakData) {
    toastError('Data PAK tidak tersedia. Generate dokumen terlebih dahulu.');
    return;
  }

  // Cek apakah user boleh edit (admin only)
  if (!isCurrentUserAdmin()) {
    toastError('Anda tidak memiliki hak akses untuk mengedit dokumen.');
    return;
  }

  editorCurrentData = pakData;

  // Buat modal editor fullscreen
  let modal = document.getElementById('editorModal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'editorModal';
  modal.className = 'editor-modal active';

  modal.innerHTML = `
    <!-- Header -->
    <div class="editor-header">
      <div class="editor-title">
        <i class="fas fa-file-edit"></i>
        <span class="editor-title-text">Editor Dokumen PAK</span>
        <span class="editor-title-meta" id="editorMeta">—</span>
      </div>
      <div class="editor-status">
        <span class="editor-save-status" id="editorSaveStatus">
          <i class="fas fa-circle-notch fa-spin"></i> Memuat...
        </span>
        <div class="editor-actions">
          <button class="editor-btn" onclick="openEditorSettings()" title="Pengaturan Halaman">
            <i class="fas fa-cog"></i> <span>Pengaturan</span>
          </button>
          <button class="editor-btn" onclick="openVersionHistory()" title="Riwayat Versi">
            <i class="fas fa-history"></i> <span>Versi</span>
          </button>
          <button class="editor-btn btn-success" onclick="exportDokumenPDF()" title="Export PDF">
            <i class="fas fa-file-pdf"></i> <span>PDF</span>
          </button>
          <button class="editor-btn btn-primary" onclick="exportDokumenDOCX()" title="Export DOCX">
            <i class="fas fa-file-word"></i> <span>DOCX</span>
          </button>
          <button class="editor-btn btn-danger" onclick="closeDocumentEditor()" title="Tutup">
            <i class="fas fa-times"></i> <span>Tutup</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Toolbar Container (TinyMCE akan render di sini) -->
    <div class="editor-toolbar-container" id="editorToolbarContainer"></div>

    <!-- Body - Halaman A4 -->
    <div class="editor-body" id="editorBody">
      <div class="editor-loading" id="editorLoading">
        <div class="spinner"></div>
        <p>Memuat editor dokumen...</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="editor-footer">
      <div class="editor-footer-info">
        <span><i class="fas fa-file"></i> <span id="editorPageCount">1 halaman</span></span>
        <span><i class="fas fa-user"></i> <span id="editorEditor">${escapeHtml(getCurrentUser()?.nama || 'Admin')}</span></span>
        <span><i class="fas fa-clock"></i> <span id="editorTime">—</span></span>
      </div>
      <div>
        <span id="editorDocVersion">Versi 1</span>
      </div>
    </div>

    <!-- Settings Panel (hidden by default) -->
    <div class="editor-settings-panel" id="editorSettingsPanel">
      <div class="editor-settings-header">
        <h3><i class="fas fa-cog"></i> Pengaturan Halaman</h3>
        <button class="editor-settings-close" onclick="closeEditorSettings()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="editor-settings-body" id="editorSettingsBody">
        <!-- Akan diisi oleh generateSettingsHTML() -->
      </div>
    </div>

    <!-- Version History Panel (hidden by default) -->
    <div class="editor-settings-panel" id="versionHistoryPanel">
      <div class="editor-settings-header">
        <h3><i class="fas fa-history"></i> Riwayat Versi Dokumen</h3>
        <button class="editor-settings-close" onclick="closeVersionHistory()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="editor-settings-body">
        <div id="versionHistoryList" class="editor-versions-list">
          <p style="text-align: center; color: var(--text-light); padding: 20px;">
            Memuat riwayat...
          </p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Update meta info
  const metaEl = document.getElementById('editorMeta');
  if (metaEl && pakData['Nama Lengkap dengan Gelar']) {
    metaEl.textContent = `${pakData['NIP'] || ''} - ${pakData['Nama Lengkap dengan Gelar']}`;
  }

  // Cek apakah dokumen sudah ada di database
  try {
    const existing = await fetchDokumenByDataMaster(pakData._id, pakData['NIP']);
    if (existing) {
      editorDokumenId = existing.id;
      editorLastSavedContent = existing.konten || '';
      if (existing.pengaturan_halaman) {
        editorPengaturanHalaman = {
          ...editorPengaturanHalaman,
          ...existing.pengaturan_halaman,
        };
      }
      updateEditorVersionDisplay(existing.versi || 1);
      console.log('[Editor] Dokumen ditemukan di DB, versi:', existing.versi);
    } else {
      editorDokumenId = null;
      editorLastSavedContent = '';
      updateEditorVersionDisplay(1);
      console.log('[Editor] Dokumen baru, akan di-insert saat save');
    }
  } catch (err) {
    console.warn('[Editor] Gagal cek dokumen existing:', err.message);
    editorDokumenId = null;
  }

  // Render settings panel
  renderEditorSettings();

  // Inisialisasi TinyMCE
  await initTinyMCEEditor();
}

/* ============================================
 * INIT TINYMCE EDITOR
 * ============================================
 */
async function initTinyMCEEditor() {
  const editorBody = document.getElementById('editorBody');

  // Hapus loading
  const loading = document.getElementById('editorLoading');
  if (loading) loading.remove();

  // Tentukan konten awal:
  // - Jika sudah ada di DB → pakai konten DB
  // - Jika belum → pakai konten dari preview PAK yang sudah di-generate
  let initialContent;
  if (editorLastSavedContent) {
    initialContent = editorLastSavedContent;
    console.log('[Editor] Memuat konten dari database');
  } else {
    // Ambil dari preview PAK yang sudah di-generate
    const printArea = document.getElementById('pakPrintArea');
    if (printArea) {
      // Ambil hanya inner content (tanpa .pak-page wrapper)
      const contents = printArea.querySelectorAll('.pak-content');
      if (contents.length > 0) {
        // Gabungkan 4 dokumen jadi 1, dipisah page break
        let html = '';
        contents.forEach((c, idx) => {
          html += c.innerHTML;
          if (idx < contents.length - 1) {
            html += '<div style="page-break-after: always; break-after: page;">&nbsp;</div>';
          }
        });
        initialContent = html;
      } else {
        initialContent = printArea.innerHTML;
      }
      console.log('[Editor] Memuat konten dari preview PAK');
    } else {
      initialContent = '<p>Dokumen kosong. Mulai mengetik...</p>';
    }
  }

  // Buat container untuk TinyMCE
  const pageClass = editorPengaturanHalaman.orientation === 'landscape'
    ? 'a4-landscape'
    : 'a4-portrait';

  editorBody.innerHTML = `
    <div class="editor-page-container ${pageClass} has-margins" id="editorPageContainer">
      <textarea id="tinyMCEEditor">${escapeHtml(initialContent)}</textarea>
    </div>
  `;

  // Cek apakah TinyMCE sudah dimuat
  if (typeof window.tinymce === 'undefined') {
    console.error('[Editor] TinyMCE belum dimuat. Pastikan CDN script ada di index.html');
    toastError('Library editor belum dimuat. Refresh halaman.');
    return;
  }

  // Inisialisasi TinyMCE
  tinymce.init({
    selector: '#tinyMCEEditor',
    language: 'id_ID',
    language_url: 'https://cdn.jsdelivr.net/npm/tinymce-i18n@24.1.5/langs/id_ID.js',
    height: '100%',
    width: '100%',
    autoresize: false,
    resize: false,
    branding: false,
    promotion: false,

    // Toolbar & menu - mirip Microsoft Word
    menubar: 'file edit view insert format table tools',
    menu: {
      file: { title: 'File', items: 'newdocument restoredraft | preview | print' },
      edit: { title: 'Edit', items: 'undo redo | cut copy paste pastetext | selectall searchreplace' },
      view: { title: 'View', items: 'code | visualaid visualchars visualblocks | preview' },
      insert: { title: 'Insert', items: 'image link media template codesample inserttable | charmap emoticons hr | pagebreak | anchor' },
      format: { title: 'Format', items: 'bold italic underline strikethrough superscript subscript codeformat | formats blockformats fontfamily fontsize align lineheight | forecolor backcolor | removeformat' },
      table: { title: 'Table', items: 'inserttable | cell row column | tableprops deletetable' },
      tools: { title: 'Tools', items: 'wordcount | code' },
    },

    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
      'pagebreak', 'hr', 'nonbreaking', 'emoticons', 'template', 'imagetools',
      'quickbars', 'autoresize',
    ].join(' '),

    toolbar:
      'undo redo | blocks | fontfamily fontsize | ' +
      'bold italic underline strikethrough superscript subscript | ' +
      'forecolor backcolor | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent lineheight | ' +
      'table image link media hr pagebreak | ' +
      'removeformat | fullscreen help',

    toolbar_mode: 'sliding',
    toolbar_sticky: true,
    toolbar_sticky_offset: 0,

    // Font options
    font_family_formats:
      'Times New Roman=Times New Roman,serif;' +
      'Arial=Arial,sans-serif;' +
      'Calibri=Calibri,sans-serif;' +
      'Courier New=Courier New,monospace;' +
      'Georgia=Georgia,serif;' +
      'Verdana=Verdana,sans-serif;' +
      'Tahoma=Tahoma,sans-serif;' +
      'Poppins=Poppins,sans-serif;',

    font_size_formats:
      '8pt 9pt 10pt 10.5pt 11pt 12pt 13pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt',

    line_height_formats: '1 1.1 1.2 1.3 1.4 1.5 1.6 1.7 1.8 1.9 2 2.5 3',

    block_formats:
      'Paragraph=p; ' +
      'Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; ' +
      'Preformatted=pre; ' +
      'Div=div',

    // Default styles - dokumen pemerintah
    content_style: `
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        background: #fff;
        margin: 0;
        padding: 0;
      }
      p {
        margin: 0 0 ${editorPengaturanHalaman.paragraphSpacing || 8}pt 0;
        line-height: ${editorPengaturanHalaman.lineHeight || 1.5};
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      td, th {
        border: 1px solid #000;
        padding: 4px 6px;
        vertical-align: top;
      }
      h1, h2, h3, h4 {
        margin: 8pt 0 4pt 0;
      }
      h2 { font-size: 14pt; }
      h3 { font-size: 12pt; }
      img {
        max-width: 100%;
        height: auto;
      }
      /* Page break visual */
      *[style*="page-break-after"], .mce-pagebreak {
        border-top: 2px dashed #999;
        margin: 20px 0;
        padding-top: 10px;
        text-align: center;
        color: #999;
      }
    `,

    // Page break
    pagebreak_separator: '<!-- pagebreak -->',
    pagebreak_split_block: true,

    // Save plugin - autosave ke Supabase
    save_onsavecallback: () => saveDokumenNow(),

    // Image upload - ke Supabase Storage
    images_upload_url: 'upload-handler',
    images_upload_handler: (blobInfo, progress) => uploadImageToStorage(blobInfo, progress),

    // Table default styles
    table_default_attributes: {
      border: '1',
      cellspacing: '0',
      cellpadding: '4',
    },
    table_default_styles: {
      'border-collapse': 'collapse',
      width: '100%',
    },

    // Setup callback
    setup: (editor) => {
      editorInstance = editor;

      editor.on('init', () => {
        console.log('[Editor] TinyMCE initialized');
        // Hide loading
        const loadingEl = document.getElementById('editorLoading');
        if (loadingEl) loadingEl.remove();

        // Update save status
        updateEditorSaveStatus('saved');

        // Update page count
        updateEditorPageCount();

        // Start autosave timer
        startAutoSave();
      });

      // Autosave on content change (debounced)
      editor.on('input change keyup', () => {
        updateEditorSaveStatus('unsaved');
        scheduleAutoSave();
        updateEditorPageCount();
      });

      // Update word count
      editor.on('keyup setcontent', () => {
        updateEditorPageCount();
      });
    },

    // Skin - modern look
    skin: 'oxide-dark',
    content_css: false,

    // Status bar
    statusbar: false,

    // Quickbars - context menu
    quickbars_selection_toolbar: 'bold italic underline | blocks | bullist numlist',
    quickbars_insert_toolbar: 'image table | hr pagebreak',
    contextmenu: 'link image table | cell row column | paste | undo redo',

    // Autoresize - fit content
    autoresize_bottom_margin: 20,
    autoresize_overflow_padding: 20,
  });
}

/* ============================================
 * AUTOSAVE - simpan otomatis ke Supabase
 * ============================================
 */
function scheduleAutoSave() {
  // Clear timer sebelumnya
  if (editorAutoSaveTimer) {
    clearTimeout(editorAutoSaveTimer);
  }

  // Schedule autosave dalam 3 detik setelah perubahan terakhir
  editorAutoSaveTimer = setTimeout(() => {
    saveDokumenNow(true); // true = autosave mode
  }, 3000);
}

function startAutoSave() {
  console.log('[Editor] Autosave dimulai (interval: 30 detik)');
  // Auto-save setiap 30 detik jika ada perubahan
  setInterval(() => {
    if (editorInstance && !editorIsSaving) {
      const currentContent = editorInstance.getContent();
      if (currentContent !== editorLastSavedContent) {
        saveDokumenNow(true);
      }
    }
  }, 30000);
}

async function saveDokumenNow(isAutosave = false) {
  if (!editorInstance || editorIsSaving) return;

  if (!isSupabaseReady()) {
    updateEditorSaveStatus('error', 'Supabase belum dikonfigurasi');
    if (isAutosave) return;
    toastError('Supabase belum dikonfigurasi');
    return;
  }

  editorIsSaving = true;
  updateEditorSaveStatus('saving');

  try {
    const content = editorInstance.getContent();
    const headerContent = document.getElementById('editorHeaderInput')?.value || '';
    const footerContent = document.getElementById('editorFooterInput')?.value || '';

    const dokumenData = {
      id: editorDokumenId,
      dataMasterId: editorCurrentData?._id,
      nip: editorCurrentData?.['NIP'],
      nama: editorCurrentData?.['Nama Lengkap dengan Gelar'],
      judul: 'Penetapan Angka Kredit Integrasi',
      konten: content,
      pengaturanHalaman: editorPengaturanHalaman,
      headerDokumen: headerContent,
      footerDokumen: footerContent,
      status: 'draft',
      catatanPerubahan: isAutosave ? 'Auto-save' : 'Manual save',
    };

    const result = await saveDokumenPAK(dokumenData);

    if (result) {
      editorDokumenId = result.id;
      editorLastSavedContent = content;
      updateEditorSaveStatus('saved');
      updateEditorVersionDisplay(result.versi || 1);

      if (!isAutosave) {
        toastSuccess('Dokumen berhasil disimpan!');
      }
    } else {
      throw new Error('Response kosong dari server');
    }
  } catch (error) {
    console.error('[Editor] Save error:', error);
    updateEditorSaveStatus('error', error.message || 'Gagal menyimpan');
    if (!isAutosave) {
      toastError('Gagal menyimpan: ' + (error.message || ''));
    }
  } finally {
    editorIsSaving = false;
  }
}

function updateEditorSaveStatus(status, message) {
  const statusEl = document.getElementById('editorSaveStatus');
  if (!statusEl) return;

  statusEl.className = 'editor-save-status';

  switch (status) {
    case 'saving':
      statusEl.classList.add('saving');
      statusEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyimpan...';
      break;
    case 'saved':
      statusEl.classList.add('saved');
      const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      statusEl.innerHTML = `<i class="fas fa-check-circle"></i> Tersimpan (${time})`;
      break;
    case 'unsaved':
      statusEl.classList.add('saving');
      statusEl.innerHTML = '<i class="fas fa-pencil-alt"></i> Perubahan belum disimpan';
      break;
    case 'error':
      statusEl.classList.add('error');
      statusEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Gagal menyimpan${message ? ': ' + message : ''}`;
      break;
  }

  // Update footer time
  const timeEl = document.getElementById('editorTime');
  if (timeEl) {
    timeEl.textContent = new Date().toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

function updateEditorVersionDisplay(version) {
  const el = document.getElementById('editorDocVersion');
  if (el) el.textContent = `Versi ${version}`;
}

function updateEditorPageCount() {
  if (!editorInstance) return;
  const content = editorInstance.getContent();
  // Estimasi halaman: setiap ~3000 karakter = 1 halaman A4
  const charCount = content.replace(/<[^>]+>/g, '').length;
  const estimatedPages = Math.max(1, Math.ceil(charCount / 3000));
  const el = document.getElementById('editorPageCount');
  if (el) el.textContent = `~${estimatedPages} halaman`;
}

/* ============================================
 * PENGATURAN HALAMAN PANEL
 * ============================================
 */
function renderEditorSettings() {
  const body = document.getElementById('editorSettingsBody');
  if (!body) return;

  const p = editorPengaturanHalaman;

  body.innerHTML = `
    <div class="editor-settings-section">
      <h4><i class="fas fa-file"></i> Ukuran & Orientasi</h4>
      <div class="form-group">
        <label>Ukuran Kertas</label>
        <select id="pageSize" onchange="updatePengaturanHalaman()">
          <option value="A4" ${p.size === 'A4' ? 'selected' : ''}>A4 (210 x 297 mm)</option>
          <option value="Letter" ${p.size === 'Letter' ? 'selected' : ''}>Letter (216 x 279 mm)</option>
          <option value="Legal" ${p.size === 'Legal' ? 'selected' : ''}>Legal (216 x 356 mm)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Orientasi</label>
        <select id="pageOrientation" onchange="updatePengaturanHalaman()">
          <option value="portrait" ${p.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
          <option value="landscape" ${p.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
        </select>
      </div>
    </div>

    <div class="editor-settings-section">
      <h4><i class="fas fa-arrows-alt"></i> Margin (mm)</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Atas</label>
          <input type="number" id="marginTop" value="${p.marginTop}" min="0" max="50" onchange="updatePengaturanHalaman()">
        </div>
        <div class="form-group">
          <label>Bawah</label>
          <input type="number" id="marginBottom" value="${p.marginBottom}" min="0" max="50" onchange="updatePengaturanHalaman()">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Kiri</label>
          <input type="number" id="marginLeft" value="${p.marginLeft}" min="0" max="50" onchange="updatePengaturanHalaman()">
        </div>
        <div class="form-group">
          <label>Kanan</label>
          <input type="number" id="marginRight" value="${p.marginRight}" min="0" max="50" onchange="updatePengaturanHalaman()">
        </div>
      </div>
    </div>

    <div class="editor-settings-section">
      <h4><i class="fas fa-paragraph"></i> Spasi & Paragraf</h4>
      <div class="form-group">
        <label>Line Height</label>
        <select id="lineHeight" onchange="updatePengaturanHalaman()">
          <option value="1" ${p.lineHeight == 1 ? 'selected' : ''}>1.0 (Single)</option>
          <option value="1.15" ${p.lineHeight == 1.15 ? 'selected' : ''}>1.15</option>
          <option value="1.5" ${p.lineHeight == 1.5 ? 'selected' : ''}>1.5</option>
          <option value="2" ${p.lineHeight == 2 ? 'selected' : ''}>2.0 (Double)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Spasi Antar Paragraf (pt)</label>
        <input type="number" id="paragraphSpacing" value="${p.paragraphSpacing}" min="0" max="36" onchange="updatePengaturanHalaman()">
      </div>
    </div>

    <div class="editor-settings-section">
      <h4><i class="fas fa-heading"></i> Header & Footer</h4>
      <div class="form-group">
        <label>Header Dokumen (HTML)</label>
        <textarea id="editorHeaderInput" rows="3" placeholder="Kop surat / header...">${escapeHtml(p.headerDokumen || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Footer Dokumen (HTML)</label>
        <textarea id="editorFooterInput" rows="3" placeholder="Footer...">${escapeHtml(p.footerDokumen || '')}</textarea>
      </div>
      <button class="btn btn-primary btn-sm" style="width: 100%; margin-top: 8px;" onclick="applyPengaturanHalaman()">
        <i class="fas fa-check"></i> Terapkan Pengaturan
      </button>
    </div>
  `;
}

function openEditorSettings() {
  const panel = document.getElementById('editorSettingsPanel');
  if (panel) panel.classList.add('active');
}

function closeEditorSettings() {
  const panel = document.getElementById('editorSettingsPanel');
  if (panel) panel.classList.remove('active');
}

function updatePengaturanHalaman() {
  // Hanya update state, apply dilakukan saat klik "Terapkan"
  editorPengaturanHalaman = {
    size: document.getElementById('pageSize')?.value || 'A4',
    orientation: document.getElementById('pageOrientation')?.value || 'portrait',
    marginTop: parseInt(document.getElementById('marginTop')?.value || 15),
    marginBottom: parseInt(document.getElementById('marginBottom')?.value || 15),
    marginLeft: parseInt(document.getElementById('marginLeft')?.value || 18),
    marginRight: parseInt(document.getElementById('marginRight')?.value || 18),
    lineHeight: parseFloat(document.getElementById('lineHeight')?.value || 1.5),
    paragraphSpacing: parseInt(document.getElementById('paragraphSpacing')?.value || 8),
  };
}

function applyPengaturanHalaman() {
  updatePengaturanHalaman();

  // Update page container class
  const pageContainer = document.getElementById('editorPageContainer');
  if (pageContainer) {
    pageContainer.className = 'editor-page-container';
    if (editorPengaturanHalaman.size === 'A4') {
      pageContainer.classList.add(editorPengaturanHalaman.orientation === 'landscape' ? 'a4-landscape' : 'a4-portrait');
    }
    pageContainer.classList.add('has-margins');
  }

  // Update content style di TinyMCE
  if (editorInstance) {
    const newStyle = `
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: ${editorPengaturanHalaman.lineHeight};
        margin: 0;
        padding: 0;
      }
      p {
        margin: 0 0 ${editorPengaturanHalaman.paragraphSpacing}pt 0;
        line-height: ${editorPengaturanHalaman.lineHeight};
      }
      table { border-collapse: collapse; width: 100%; }
      td, th { border: 1px solid #000; padding: 4px 6px; }
    `;
    editorInstance.dom.removeStyle(editorInstance.getBody());
    const styleEl = editorInstance.getDoc().createElement('style');
    styleEl.innerHTML = newStyle;
    editorInstance.getDoc().head.appendChild(styleEl);
  }

  toastSuccess('Pengaturan halaman diterapkan!');
  closeEditorSettings();

  // Trigger autosave
  scheduleAutoSave();
}

/* ============================================
 * VERSION HISTORY
 * ============================================
 */
async function openVersionHistory() {
  const panel = document.getElementById('versionHistoryPanel');
  if (!panel) return;

  panel.classList.add('active');

  const listEl = document.getElementById('versionHistoryList');
  if (!listEl) return;

  if (!editorDokumenId) {
    listEl.innerHTML = `
      <p style="text-align: center; color: var(--text-light); padding: 20px;">
        <i class="fas fa-info-circle" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>
        Dokumen belum disimpan. Riwayat versi akan tersedia setelah dokumen disimpan.
      </p>
    `;
    return;
  }

  listEl.innerHTML = '<p style="text-align: center; padding: 20px;"><span class="loading-spinner"></span><br><br>Memuat riwayat...</p>';

  try {
    const versions = await fetchDokumenVersions(editorDokumenId);

    if (versions.length === 0) {
      listEl.innerHTML = `
        <p style="text-align: center; color: var(--text-light); padding: 20px;">
          <i class="fas fa-history" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>
          Belum ada riwayat versi tersimpan.
        </p>
      `;
      return;
    }

    listEl.innerHTML = versions.map((v, idx) => `
      <div class="editor-version-item ${idx === 0 ? 'current' : ''}">
        <div class="editor-version-header">
          <span class="editor-version-num">Versi ${v.versi}</span>
          <span class="editor-version-date">${formatDateTime(v.edited_at)}</span>
        </div>
        <div class="editor-version-meta">
          <i class="fas fa-user"></i> ${escapeHtml(v.edited_by || 'Unknown')}<br>
          <i class="fas fa-info-circle"></i> ${escapeHtml(v.catatan_perubahan || '-')}
        </div>
        <div class="editor-version-actions">
          <button class="btn-restore" onclick="restoreVersion('${escapeHtml(String(v.id))}')">
            <i class="fas fa-undo"></i> Restore
          </button>
          <button onclick="previewVersion('${escapeHtml(String(v.id))}')">
            <i class="fas fa-eye"></i> Preview
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[Editor] Version history error:', err);
    listEl.innerHTML = `<p style="color: var(--danger); padding: 20px;">Gagal memuat riwayat: ${escapeHtml(err.message || '')}</p>`;
  }
}

function closeVersionHistory() {
  const panel = document.getElementById('versionHistoryPanel');
  if (panel) panel.classList.remove('active');
}

async function restoreVersion(versionId) {
  if (!editorDokumenId || !versionId) return;

  const confirmed = await confirmDialog(
    'Restore ke versi ini?\n\nPerubahan saat ini akan disimpan sebagai versi baru, dan dokumen akan kembali ke versi yang dipilih.'
  );
  if (!confirmed) return;

  try {
    toastInfo('Merestore versi...');
    const result = await restoreDokumenVersion(editorDokumenId, versionId);

    // Update editor dengan konten yang sudah di-restore
    if (editorInstance && result?.konten) {
      editorInstance.setContent(result.konten);
      editorLastSavedContent = result.konten;
    }

    updateEditorVersionDisplay(result.versi || 1);
    toastSuccess('Dokumen berhasil di-restore ke versi terpilih!');
    openVersionHistory(); // refresh list
  } catch (err) {
    console.error('[Editor] Restore error:', err);
    toastError('Gagal restore: ' + (err.message || ''));
  }
}

async function previewVersion(versionId) {
  if (!editorDokumenId) return;

  try {
    const versions = await fetchDokumenVersions(editorDokumenId);
    const version = versions.find((v) => v.id === versionId);
    if (!version) {
      toastError('Versi tidak ditemukan');
      return;
    }

    // Tampilkan di modal preview
    let modal = document.getElementById('versionPreviewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'versionPreviewModal';
    modal.className = 'modal-overlay active';
    modal.style.cssText = 'display: flex; padding: 20px;';

    modal.innerHTML = `
      <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3 class="modal-title">
            <i class="fas fa-eye"></i> Preview Versi ${version.versi}
          </h3>
          <button class="modal-close" onclick="document.getElementById('versionPreviewModal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.85rem;">
            <strong>Versi:</strong> ${version.versi}<br>
            <strong>Tanggal:</strong> ${formatDateTime(version.edited_at)}<br>
            <strong>Editor:</strong> ${escapeHtml(version.edited_by || 'Unknown')}<br>
            <strong>Catatan:</strong> ${escapeHtml(version.catatan_perubahan || '-')}
          </div>
          <div style="background: #fff; border: 1px solid var(--border-color); padding: 20px; min-height: 400px; font-family: 'Times New Roman', serif;">
            ${version.konten || '<p style="color: var(--text-light);">Konten kosong</p>'}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" onclick="document.getElementById('versionPreviewModal').remove()">
            <i class="fas fa-times"></i> Tutup
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (err) {
    toastError('Gagal memuat preview: ' + (err.message || ''));
  }
}

/* ============================================
 * UPLOAD IMAGE ke Supabase Storage
 * ============================================
 */
async function uploadImageToStorage(blobInfo, progress) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const file = blobInfo.blob();
  const ext = (file.name || 'image').split('.').pop().toLowerCase();
  const fileName = `editor-images/${Date.now()}_${Math.random().toString(36).substr(2, 8)}.${ext}`;

  try {
    const { error: uploadError } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('[Editor] Image upload error:', err);
    throw new Error('Gagal upload gambar: ' + (err.message || ''));
  }
}

/* ============================================
 * EXPORT - PDF & DOCX
 * ============================================
 */

/**
 * Export ke PDF - gunakan browser print
 */
function exportDokumenPDF() {
  if (!editorInstance) {
    toastWarning('Editor belum siap');
    return;
  }

  const content = editorInstance.getContent();

  // Buat wrapper print khusus
  const printWrapper = document.createElement('div');
  printWrapper.id = 'pakPrintWrapper';
  printWrapper.className = 'pak-print-wrapper';

  const orientation = editorPengaturanHalaman.orientation;
  const pageClass = orientation === 'landscape' ? 'a4-landscape' : 'a4-portrait';
  const pageWidth = orientation === 'landscape' ? '297mm' : '210mm';
  const pageHeight = orientation === 'landscape' ? '210mm' : '297mm';

  printWrapper.innerHTML = `
    <div class="pak-print-pages" style="background: #fff; padding: 0;">
      <div class="pak-page" data-orientation="${orientation}" style="width: ${pageWidth}; height: ${pageHeight}; padding: ${editorPengaturanHalaman.marginTop}mm ${editorPengaturanHalaman.marginRight}mm ${editorPengaturanHalaman.marginBottom}mm ${editorPengaturanHalaman.marginLeft}mm; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: ${editorPengaturanHalaman.lineHeight};">
        ${content}
      </div>
    </div>
  `;

  // Hapus wrapper lama
  const oldWrapper = document.getElementById('pakPrintWrapper');
  if (oldWrapper) oldWrapper.remove();

  document.body.appendChild(printWrapper);
  document.body.classList.add('printing-pak');

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-pak');
      const w = document.getElementById('pakPrintWrapper');
      if (w) w.remove();
    }, 500);
  }, 300);
}

/**
 * Export ke DOCX - konversi HTML ke DOCX
 * Pakai approach: download sebagai Word-compatible HTML (.doc)
 */
function exportDokumenDOCX() {
  if (!editorInstance) {
    toastWarning('Editor belum siap');
    return;
  }

  toastInfo('Mengekspor ke DOCX...');

  const content = editorInstance.getContent();
  const header = document.getElementById('editorHeaderInput')?.value || '';
  const footer = document.getElementById('editorFooterInput')?.value || '';

  // Word-compatible HTML
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8">
      <title>PAK Integrasi - ${escapeHtml(editorCurrentData?.['Nama Lengkap dengan Gelar'] || 'Dokumen')}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: ${editorPengaturanHalaman.size} ${editorPengaturanHalaman.orientation};
          margin: ${editorPengaturanHalaman.marginTop}mm ${editorPengaturanHalaman.marginRight}mm ${editorPengaturanHalaman.marginBottom}mm ${editorPengaturanHalaman.marginLeft}mm;
          mso-header: h;
          mso-footer: f;
        }
        div.header { mso-element: header; }
        div.footer { mso-element: footer; }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: ${editorPengaturanHalaman.lineHeight};
        }
        p { margin: 0 0 ${editorPengaturanHalaman.paragraphSpacing}pt 0; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #000; padding: 4px 6px; }
        h1, h2, h3 { margin: 8pt 0 4pt 0; }
      </style>
    </head>
    <body>
      <div class="header">${header}</div>
      ${content}
      <div class="footer">${footer}</div>
    </body>
    </html>
  `;

  // Convert to blob & download
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PAK_Integrasi_${editorCurrentData?.['NIP'] || 'dokumen'}_${new Date().toISOString().split('T')[0]}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toastSuccess('Dokumen berhasil diekspor ke DOCX!');
}

/* ============================================
 * CLOSE EDITOR
 * ============================================
 */
async function closeDocumentEditor() {
  // Cek apakah ada perubahan yang belum disimpan
  if (editorInstance) {
    const currentContent = editorInstance.getContent();
    if (currentContent !== editorLastSavedContent) {
      const confirmed = await confirmDialog(
        'Ada perubahan yang belum disimpan.\n\nSimpan sebelum tutup?'
      );
      if (confirmed) {
        await saveDokumenNow(false);
      }
    }

    // Destroy TinyMCE instance
    editorInstance.remove();
    editorInstance = null;
  }

  // Clear autosave timer
  if (editorAutoSaveTimer) {
    clearTimeout(editorAutoSaveTimer);
    editorAutoSaveTimer = null;
  }

  // Hapus modal
  const modal = document.getElementById('editorModal');
  if (modal) modal.remove();

  document.body.style.overflow = '';
  editorCurrentData = null;
  editorDokumenId = null;
  editorLastSavedContent = '';

  // Refresh preview PAK di halaman utama (jika ada)
  if (typeof generatePAKIntegrasi === 'function' && currentPAKData) {
    // Hanya refresh jika user ingin lihat perubahan
    console.log('[Editor] Editor ditutup. Refresh preview untuk melihat perubahan.');
  }
}
