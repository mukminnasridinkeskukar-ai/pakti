/* ============================================
 * PAKTI - Document Editor (Word-like)
 * ============================================
 * Menggunakan TinyMCE 7 dengan menubar & toolbar NATIVE
 * Semua tombol BERFUNGSI NYATA (bukan dummy)
 *
 * Fitur:
 * - Edit, View, Insert, Format, Table, Tools menu (native TinyMCE)
 * - Toolbar: Font, Size, Bold, Italic, Alignment, List, Table, Image, dll
 * - Keyboard shortcuts (Ctrl+B/I/U/S/Z/Y/F/H/A)
 * - Autosave ke Supabase (debounce 2 detik)
 * - Version history dengan restore
 * - Export PDF (browser print)
 * - Export DOCX (html-docx-js library)
 * - Close dengan prompt unsaved changes
 * ============================================ */

let editorInstance = null;
let editorCurrentData = null;
let editorDokumenId = null;
let editorPengaturanHalaman = {
  size: 'A4',
  orientation: 'portrait',
  marginTop: 25,
  marginBottom: 25,
  marginLeft: 30,
  marginRight: 25,
  lineHeight: 1.15,
  paragraphSpacing: 8,
};
let editorAutoSaveTimer = null;
let editorIsSaving = false;
let editorLastSavedContent = '';
let editorHasUnsavedChanges = false;

/* ============================================
 * BUKA EDITOR
 * ============================================ */
async function openDocumentEditor(pakData) {
  if (!pakData) {
    toastError('Data PAK tidak tersedia. Generate dokumen terlebih dahulu.');
    return;
  }

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
    <!-- Header dengan tombol aksi -->
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
          <button class="editor-btn" onclick="saveDokumenManual()" title="Simpan (Ctrl+S)" style="background: var(--success); color: white;">
            <i class="fas fa-save"></i> <span>Simpan</span>
          </button>
          <button class="editor-btn" onclick="exportDokumenPDF()" title="Export PDF" style="background: var(--danger); color: white;">
            <i class="fas fa-file-pdf"></i> <span>PDF</span>
          </button>
          <button class="editor-btn" onclick="exportDokumenDOCX()" title="Export DOCX" style="background: #2563eb; color: white;">
            <i class="fas fa-file-word"></i> <span>DOCX</span>
          </button>
          <button class="editor-btn" onclick="closeDocumentEditor()" title="Tutup" style="background: #64748b; color: white;">
            <i class="fas fa-times"></i> <span>Tutup</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Editor body - TinyMCE akan render di sini -->
    <div class="editor-body" id="editorBody">
      <div class="editor-loading" id="editorLoading">
        <div class="spinner"></div>
        <p>Memuat editor dokumen...</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="editor-footer">
      <div class="editor-footer-info">
        <span><i class="fas fa-file"></i> <span id="editorPageCount">—</span></span>
        <span><i class="fas fa-user"></i> <span id="editorEditor">${escapeHtml(getCurrentUser()?.nama || 'Admin')}</span></span>
        <span><i class="fas fa-clock"></i> <span id="editorTime">—</span></span>
      </div>
      <div>
        <span id="editorDocVersion">Versi 1</span>
      </div>
    </div>

    <!-- Settings Panel -->
    <div class="editor-settings-panel" id="editorSettingsPanel">
      <div class="editor-settings-header">
        <h3><i class="fas fa-cog"></i> Pengaturan Halaman</h3>
        <button class="editor-settings-close" onclick="closeEditorSettings()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="editor-settings-body" id="editorSettingsBody"></div>
    </div>

    <!-- Version History Panel -->
    <div class="editor-settings-panel" id="versionHistoryPanel">
      <div class="editor-settings-header">
        <h3><i class="fas fa-history"></i> Riwayat Versi Dokumen</h3>
        <button class="editor-settings-close" onclick="closeVersionHistory()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="editor-settings-body">
        <div id="versionHistoryList" class="editor-versions-list">
          <p style="text-align: center; color: var(--text-light); padding: 20px;">Memuat riwayat...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Update meta
  const metaEl = document.getElementById('editorMeta');
  if (metaEl && pakData['Nama Lengkap dengan Gelar']) {
    metaEl.textContent = `${pakData['NIP'] || ''} - ${pakData['Nama Lengkap dengan Gelar']}`;
  }

  // Cek dokumen existing di database
  try {
    const existing = await fetchDokumenByDataMaster(pakData._id, pakData['NIP']);
    if (existing) {
      editorDokumenId = existing.id;
      editorLastSavedContent = existing.konten || '';
      if (existing.pengaturan_halaman) {
        editorPengaturanHalaman = { ...editorPengaturanHalaman, ...existing.pengaturan_halaman };
      }
      updateEditorVersionDisplay(existing.versi || 1);
      console.log('[Editor] Dokumen ditemukan, versi:', existing.versi);
    } else {
      editorDokumenId = null;
      editorLastSavedContent = '';
      updateEditorVersionDisplay(1);
    }
  } catch (err) {
    console.warn('[Editor] Gagal cek dokumen:', err.message);
    editorDokumenId = null;
  }

  // Render settings panel
  renderEditorSettings();

  // Init TinyMCE
  await initTinyMCEEditor();
}

/* ============================================
 * INIT TINYMCE - dengan menubar & toolbar NATIVE
 * ============================================ */
async function initTinyMCEEditor() {
  const editorBody = document.getElementById('editorBody');
  const loading = document.getElementById('editorLoading');
  if (loading) loading.remove();

  // Tentukan konten awal
  let initialContent;
  if (editorLastSavedContent) {
    initialContent = editorLastSavedContent;
    console.log('[Editor] Memuat konten dari database');
  } else {
    // Ambil dari preview PAK
    const printArea = document.getElementById('pakPrintArea');
    if (printArea) {
      const contents = printArea.querySelectorAll('.pak-content');
      if (contents.length > 0) {
        let html = '';
        contents.forEach((c, idx) => {
          html += c.innerHTML;
          if (idx < contents.length - 1) {
            html += '<hr class="mce-pagebreak" />';
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

  // Halaman A4 container
  const pageClass = editorPengaturanHalaman.orientation === 'landscape' ? 'a4-landscape' : 'a4-portrait';

  editorBody.innerHTML = `
    <div class="editor-page-container ${pageClass}" id="editorPageContainer">
      <textarea id="tinyMCEEditor">${escapeHtml(initialContent)}</textarea>
    </div>
  `;

  if (typeof window.tinymce === 'undefined') {
    toastError('Library editor belum dimuat. Refresh halaman.');
    return;
  }

  // Hapus instance lama jika ada
  if (tinymce.get('tinyMCEEditor')) {
    tinymce.get('tinyMCEEditor').remove();
  }

  const p = editorPengaturanHalaman;

  // Inisialisasi TinyMCE dengan konfigurasi lengkap
  tinymce.init({
    selector: '#tinyMCEEditor',
    license_key: 'gpl',

    // Base URL untuk load plugins & skins dari CDN
    base_url: 'https://cdn.jsdelivr.net/npm/tinymce@6.8.4',
    suffix: '.min',

    height: '100%',
    width: '100%',
    min_height: 500,
    autoresize_bottom_margin: 20,
    resize: false,
    branding: false,
    promotion: false,
    elementpath: false,

    // Menubar NATIVE - semua menu berfungsi
    menubar: 'file edit view insert format table tools',

    // Menu items - semua TERHUBUNG ke fungsi TinyMCE
    menu: {
      file: {
        title: 'File',
        items: 'newdocument restoredraft | preview | exportpdf exportdocx | print',
      },
      edit: {
        title: 'Edit',
        items: 'undo redo | cut copy paste pastetext | selectall searchreplace',
      },
      view: {
        title: 'View',
        items: 'code visualblocks visualchars | fullscreen preview',
      },
      insert: {
        title: 'Insert',
        items: 'inserttable | image link media | charmap | insertdatetime | pagebreak hr | anchor',
      },
      format: {
        title: 'Format',
        items: 'bold italic underline strikethrough superscript subscript | formats blockformats fontfamily fontsize | align lineheight | forecolor backcolor | removeformat',
      },
      table: {
        title: 'Table',
        items: 'inserttable | cell row column | tableprops deletetable',
      },
      tools: {
        title: 'Tools',
        items: 'wordcount | code',
      },
    },

    // Plugin yang tersedia di community edition
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount',
      'pagebreak', 'quickbars', 'autoresize',
    ].join(' '),

    // Toolbar - semua tombol BERFUNGSI (native TinyMCE)
    toolbar:
      'undo redo | ' +
      'styles fontfamily fontsize | ' +
      'bold italic underline strikethrough | ' +
      'forecolor backcolor | ' +
      'alignleft aligncenter alignright alignjustify | ' +
      'bullist numlist outdent indent lineheight | ' +
      'table image link pagebreak charmap | ' +
      'removeformat fullscreen help',

    toolbar_mode: 'sliding',
    toolbar_sticky: true,

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

    font_size_formats: '8pt 9pt 10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt 36pt 48pt',

    line_height_formats: '1 1.1 1.15 1.2 1.3 1.4 1.5 1.6 1.7 1.8 1.9 2 2.5 3',

    block_formats:
      'Paragraph=p; ' +
      'Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; ' +
      'Preformatted=pre; Div=div',

    // Content style - dokumen pemerintah dengan margin A4
    content_style: `
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: ${p.lineHeight};
        color: #000;
        background: #fff;
        margin: 0;
        padding: ${p.marginTop}mm ${p.marginRight}mm ${p.marginBottom}mm ${p.marginLeft}mm;
        box-sizing: border-box;
      }
      p { margin: 0 0 ${p.paragraphSpacing}pt 0; line-height: ${p.lineHeight}; }
      h1 { font-size: 18pt; margin: 12pt 0 6pt 0; }
      h2 { font-size: 14pt; margin: 12pt 0 6pt 0; }
      h3 { font-size: 12pt; margin: 10pt 0 5pt 0; }
      table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
      td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
      ul, ol { margin: 6pt 0; padding-left: 24pt; }
      img { max-width: 100%; height: auto; }
      hr { border: none; border-top: 1px solid #999; margin: 12pt 0; }
      .mce-pagebreak { border: 2px dashed #999; background: #f8fafc; padding: 10px; text-align: center; }
    `,

    // Page break
    pagebreak_separator: '<!-- pagebreak -->',
    pagebreak_split_block: true,

    // Table defaults
    table_default_attributes: { border: '1', cellspacing: '0', cellpadding: '4' },
    table_default_styles: { 'border-collapse': 'collapse', width: '100%' },
    table_toolbar: 'tableprops cellprops | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | tablemergecells tablesplitcells',

    // Image upload
    images_upload_handler: (blobInfo, progress) => uploadImageToStorage(blobInfo, progress),

    // Quickbars - context menu (klik kanan)
    quickbars_selection_toolbar: 'bold italic underline | blocks | bullist numlist',
    quickbars_insert_toolbar: 'image table pagebreak hr',
    contextmenu: 'link image table | cell row column | paste | undo redo',

    // Skin
    skin: 'oxide',
    content_css: false,
    statusbar: false,

    // Setup - custom buttons & shortcuts
    setup: (editor) => {
      editorInstance = editor;

      // Custom menu items untuk File menu
      editor.ui.registry.addMenuItem('exportpdf', {
        text: 'Export PDF',
        icon: 'export',
        onAction: () => exportDokumenPDF(),
      });

      editor.ui.registry.addMenuItem('exportdocx', {
        text: 'Export DOCX',
        icon: 'export',
        onAction: () => exportDokumenDOCX(),
      });

      // Keyboard shortcuts
      editor.addShortcut('ctrl+s', 'Simpan dokumen', () => {
        saveDokumenManual();
      });

      editor.on('init', () => {
        console.log('[Editor] TinyMCE initialized');
        const loadingEl = document.getElementById('editorLoading');
        if (loadingEl) loadingEl.remove();

        updateEditorSaveStatus('saved');
        updateEditorPageCount();
        startAutoSave();

        // Focus editor
        setTimeout(() => editor.focus(), 100);
      });

      // Track changes untuk autosave
      editor.on('input change keyup setContent', () => {
        editorHasUnsavedChanges = true;
        updateEditorSaveStatus('unsaved');
        scheduleAutoSave();
        updateEditorPageCount();
      });
    },
  });
}

/* ============================================
 * AUTOSAVE - debounce 2 detik
 * ============================================ */
function scheduleAutoSave() {
  if (editorAutoSaveTimer) clearTimeout(editorAutoSaveTimer);
  editorAutoSaveTimer = setTimeout(() => saveDokumenNow(true), 2000);
}

function startAutoSave() {
  // Backup autosave setiap 30 detik
  setInterval(() => {
    if (editorInstance && !editorIsSaving && editorHasUnsavedChanges) {
      saveDokumenNow(true);
    }
  }, 30000);
}

function saveDokumenManual() {
  saveDokumenNow(false);
}

async function saveDokumenNow(isAutosave) {
  if (!editorInstance || editorIsSaving) return;

  if (!isSupabaseReady()) {
    updateEditorSaveStatus('error', 'Supabase belum dikonfigurasi');
    if (!isAutosave) toastError('Supabase belum dikonfigurasi');
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
      editorHasUnsavedChanges = false;
      updateEditorSaveStatus('saved');
      updateEditorVersionDisplay(result.versi || 1);

      if (!isAutosave) toastSuccess('Dokumen berhasil disimpan!');
    } else {
      throw new Error('Response kosong dari server');
    }
  } catch (error) {
    console.error('[Editor] Save error:', error);
    updateEditorSaveStatus('error', error.message || 'Gagal menyimpan');
    if (!isAutosave) toastError('Gagal menyimpan: ' + (error.message || ''));
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
      statusEl.innerHTML = '<i class="fas fa-check-circle"></i> Tersimpan (' + time + ')';
      break;
    case 'unsaved':
      statusEl.classList.add('saving');
      statusEl.innerHTML = '<i class="fas fa-pencil-alt"></i> Perubahan belum disimpan';
      break;
    case 'error':
      statusEl.classList.add('error');
      statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal menyimpan' + (message ? ': ' + message : '');
      break;
  }

  const timeEl = document.getElementById('editorTime');
  if (timeEl) {
    timeEl.textContent = new Date().toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
}

function updateEditorVersionDisplay(version) {
  const el = document.getElementById('editorDocVersion');
  if (el) el.textContent = 'Versi ' + version;
}

function updateEditorPageCount() {
  if (!editorInstance) return;
  const content = editorInstance.getContent();
  const text = content.replace(/<[^>]+>/g, '');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const el = document.getElementById('editorPageCount');
  if (el) el.textContent = wordCount + ' kata, ' + charCount + ' karakter';
}

/* ============================================
 * PENGATURAN HALAMAN
 * ============================================ */
function renderEditorSettings() {
  const body = document.getElementById('editorSettingsBody');
  if (!body) return;
  const p = editorPengaturanHalaman;

  body.innerHTML = `
    <div class="editor-settings-section">
      <h4><i class="fas fa-file"></i> Ukuran & Orientasi</h4>
      <div class="form-group">
        <label>Ukuran Kertas</label>
        <select id="pageSize">
          <option value="A4" ${p.size === 'A4' ? 'selected' : ''}>A4 (210 x 297 mm)</option>
          <option value="Letter" ${p.size === 'Letter' ? 'selected' : ''}>Letter</option>
          <option value="Legal" ${p.size === 'Legal' ? 'selected' : ''}>Legal</option>
        </select>
      </div>
      <div class="form-group">
        <label>Orientasi</label>
        <select id="pageOrientation">
          <option value="portrait" ${p.orientation === 'portrait' ? 'selected' : ''}>Portrait</option>
          <option value="landscape" ${p.orientation === 'landscape' ? 'selected' : ''}>Landscape</option>
        </select>
      </div>
    </div>

    <div class="editor-settings-section">
      <h4><i class="fas fa-arrows-alt"></i> Margin (mm)</h4>
      <div class="form-row">
        <div class="form-group"><label>Atas</label><input type="number" id="marginTop" value="${p.marginTop}" min="0" max="50"></div>
        <div class="form-group"><label>Bawah</label><input type="number" id="marginBottom" value="${p.marginBottom}" min="0" max="50"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Kiri</label><input type="number" id="marginLeft" value="${p.marginLeft}" min="0" max="50"></div>
        <div class="form-group"><label>Kanan</label><input type="number" id="marginRight" value="${p.marginRight}" min="0" max="50"></div>
      </div>
    </div>

    <div class="editor-settings-section">
      <h4><i class="fas fa-paragraph"></i> Spasi & Paragraf</h4>
      <div class="form-group">
        <label>Line Height</label>
        <select id="lineHeight">
          <option value="1" ${p.lineHeight == 1 ? 'selected' : ''}>1.0</option>
          <option value="1.15" ${p.lineHeight == 1.15 ? 'selected' : ''}>1.15</option>
          <option value="1.5" ${p.lineHeight == 1.5 ? 'selected' : ''}>1.5</option>
          <option value="2" ${p.lineHeight == 2 ? 'selected' : ''}>2.0</option>
        </select>
      </div>
      <div class="form-group">
        <label>Spasi Antar Paragraf (pt)</label>
        <input type="number" id="paragraphSpacing" value="${p.paragraphSpacing}" min="0" max="36">
      </div>
    </div>

    <div class="editor-settings-section">
      <h4><i class="fas fa-heading"></i> Header & Footer</h4>
      <div class="form-group">
        <label>Header (HTML)</label>
        <textarea id="editorHeaderInput" rows="3" placeholder="Kop surat / header...">${escapeHtml(p.headerDokumen || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Footer (HTML)</label>
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
  editorPengaturanHalaman = {
    size: document.getElementById('pageSize')?.value || 'A4',
    orientation: document.getElementById('pageOrientation')?.value || 'portrait',
    marginTop: parseInt(document.getElementById('marginTop')?.value || 25),
    marginBottom: parseInt(document.getElementById('marginBottom')?.value || 25),
    marginLeft: parseInt(document.getElementById('marginLeft')?.value || 30),
    marginRight: parseInt(document.getElementById('marginRight')?.value || 25),
    lineHeight: parseFloat(document.getElementById('lineHeight')?.value || 1.15),
    paragraphSpacing: parseInt(document.getElementById('paragraphSpacing')?.value || 8),
  };
}

function applyPengaturanHalaman() {
  updatePengaturanHalaman();

  // Update page container class
  const pageContainer = document.getElementById('editorPageContainer');
  if (pageContainer) {
    pageContainer.className = 'editor-page-container';
    pageContainer.classList.add(editorPengaturanHalaman.orientation === 'landscape' ? 'a4-landscape' : 'a4-portrait');
  }

  // Update TinyMCE body style langsung
  if (editorInstance && editorInstance.getBody) {
    try {
      const p = editorPengaturanHalaman;
      const body = editorInstance.getBody();
      if (body) {
        body.style.padding = p.marginTop + 'mm ' + p.marginRight + 'mm ' + p.marginBottom + 'mm ' + p.marginLeft + 'mm';
        body.style.lineHeight = String(p.lineHeight);
        body.style.boxSizing = 'border-box';
      }

      // Update paragraf
      const paras = editorInstance.dom.select('p');
      paras.forEach((el) => {
        editorInstance.dom.setStyle(el, 'margin-bottom', p.paragraphSpacing + 'pt');
        editorInstance.dom.setStyle(el, 'line-height', String(p.lineHeight));
      });

      console.log('[Editor] Pengaturan diterapkan:', p);
    } catch (err) {
      console.error('[Editor] Gagal apply:', err);
    }
  }

  toastSuccess('Pengaturan halaman diterapkan!');
  closeEditorSettings();
  editorHasUnsavedChanges = true;
  updateEditorSaveStatus('unsaved');
  scheduleAutoSave();
}

/* ============================================
 * VERSION HISTORY
 * ============================================ */
async function openVersionHistory() {
  const panel = document.getElementById('versionHistoryPanel');
  if (!panel) return;
  panel.classList.add('active');

  const listEl = document.getElementById('versionHistoryList');
  if (!listEl) return;

  if (!editorDokumenId) {
    listEl.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;"><i class="fas fa-info-circle" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>Dokumen belum disimpan. Riwayat tersedia setelah disimpan.</p>';
    return;
  }

  listEl.innerHTML = '<p style="text-align: center; padding: 20px;"><span class="loading-spinner"></span><br><br>Memuat riwayat...</p>';

  try {
    const versions = await fetchDokumenVersions(editorDokumenId);
    if (versions.length === 0) {
      listEl.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 20px;"><i class="fas fa-history" style="font-size: 32px; margin-bottom: 8px; display: block;"></i>Belum ada riwayat versi.</p>';
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
          <button class="btn-restore" onclick="restoreVersion('${escapeHtml(String(v.id))}')"><i class="fas fa-undo"></i> Pulihkan</button>
          <button onclick="previewVersion('${escapeHtml(String(v.id))}')"><i class="fas fa-eye"></i> Preview</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    listEl.innerHTML = '<p style="color: var(--danger); padding: 20px;">Gagal memuat: ' + escapeHtml(err.message || '') + '</p>';
  }
}

function closeVersionHistory() {
  const panel = document.getElementById('versionHistoryPanel');
  if (panel) panel.classList.remove('active');
}

async function restoreVersion(versionId) {
  if (!editorDokumenId || !versionId) return;

  const confirmed = await confirmDialog('Pulihkan versi ini?\n\nPerubahan saat ini akan disimpan sebagai versi baru, lalu dokumen kembali ke versi yang dipilih.');
  if (!confirmed) return;

  try {
    toastInfo('Memulihkan versi...');
    const result = await restoreDokumenVersion(editorDokumenId, versionId);

    if (editorInstance && result?.konten) {
      editorInstance.setContent(result.konten);
      editorLastSavedContent = result.konten;
      editorHasUnsavedChanges = false;
    }
    updateEditorVersionDisplay(result.versi || 1);
    toastSuccess('Dokumen dipulihkan ke versi terpilih!');
    openVersionHistory();
  } catch (err) {
    toastError('Gagal pulihkan: ' + (err.message || ''));
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

    let modal = document.getElementById('versionPreviewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'versionPreviewModal';
    modal.className = 'modal-overlay active';
    modal.style.cssText = 'display: flex; padding: 20px;';

    modal.innerHTML = `
      <div class="modal" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3 class="modal-title"><i class="fas fa-eye"></i> Preview Versi ${version.versi}</h3>
          <button class="modal-close" onclick="document.getElementById('versionPreviewModal').remove()"><i class="fas fa-times"></i></button>
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
          <button class="btn btn-primary" onclick="document.getElementById('versionPreviewModal').remove()"><i class="fas fa-times"></i> Tutup</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  } catch (err) {
    toastError('Gagal memuat preview: ' + (err.message || ''));
  }
}

/* ============================================
 * IMAGE UPLOAD ke Supabase Storage
 * ============================================ */
async function uploadImageToStorage(blobInfo, progress) {
  if (!isSupabaseReady()) {
    throw new Error('Supabase belum dikonfigurasi');
  }

  const file = blobInfo.blob();
  const ext = (file.name || 'image').split('.').pop().toLowerCase();
  const fileName = 'editor-images/' + Date.now() + '_' + Math.random().toString(36).substr(2, 8) + '.' + ext;

  try {
    const { error: uploadError } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('[Editor] Image upload error:', err);
    throw new Error('Gagal upload gambar: ' + (err.message || ''));
  }
}

/* ============================================
 * EXPORT PDF - browser print dengan CSS
 * ============================================ */
function exportDokumenPDF() {
  if (!editorInstance) {
    toastWarning('Editor belum siap');
    return;
  }

  const content = editorInstance.getContent();
  const p = editorPengaturanHalaman;
  const pageWidth = p.orientation === 'landscape' ? '297mm' : '210mm';
  const pageHeight = p.orientation === 'landscape' ? '210mm' : '297mm';

  const printWrapper = document.createElement('div');
  printWrapper.id = 'pakPrintWrapper';
  printWrapper.className = 'pak-print-wrapper';

  printWrapper.innerHTML = `
    <div class="pak-print-pages" style="background: #fff; padding: 0;">
      <div class="pak-page" data-orientation="${p.orientation}" style="width: ${pageWidth}; height: ${pageHeight}; padding: ${p.marginTop}mm ${p.marginRight}mm ${p.marginBottom}mm ${p.marginLeft}mm; font-family: 'Times New Roman', serif; font-size: 12pt; line-height: ${p.lineHeight}; box-sizing: border-box;">
        ${content}
      </div>
    </div>
  `;

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

/* ============================================
 * EXPORT DOCX - pakai html-docx-js library
 * ============================================ */
function exportDokumenDOCX() {
  if (!editorInstance) {
    toastWarning('Editor belum siap');
    return;
  }

  toastInfo('Mengekspor ke DOCX...');

  const content = editorInstance.getContent();
  const p = editorPengaturanHalaman;
  const header = document.getElementById('editorHeaderInput')?.value || '';
  const footer = document.getElementById('editorFooterInput')?.value || '';

  // Word-compatible HTML
  const html = `
    <!DOCTYPE html>
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
          size: ${p.size} ${p.orientation};
          margin: ${p.marginTop}mm ${p.marginRight}mm ${p.marginBottom}mm ${p.marginLeft}mm;
          mso-header: h;
          mso-footer: f;
        }
        div.header { mso-element: header; }
        div.footer { mso-element: footer; }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: ${p.lineHeight};
          color: #000;
        }
        p { margin: 0 0 ${p.paragraphSpacing}pt 0; line-height: ${p.lineHeight}; }
        h1 { font-size: 18pt; margin: 12pt 0 6pt 0; }
        h2 { font-size: 14pt; margin: 12pt 0 6pt 0; }
        h3 { font-size: 12pt; margin: 10pt 0 5pt 0; }
        table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
        td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
        ul, ol { margin: 6pt 0; padding-left: 24pt; }
        img { max-width: 100%; height: auto; }
        a { color: #1a73e8; text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="header">${header}</div>
      ${content}
      <div class="footer">${footer}</div>
    </body>
    </html>
  `;

  try {
    // Cek apakah html-docx-js tersedia
    if (typeof window.htmlDocx === 'undefined') {
      // Fallback: download sebagai .doc (Word-compatible HTML)
      console.warn('[Editor] html-docx-js tidak tersedia, fallback ke .doc');
      const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
      downloadBlob(blob, '.doc');
      toastSuccess('Dokumen diekspor ke DOC (Word-compatible)!');
      return;
    }

    // Pakai html-docx-js untuk konversi ke .docx yang real
    const docxBlob = window.htmlDocx.asBlob(html, {
      orientation: p.orientation,
      margins: {
        top: p.marginTop,
        right: p.marginRight,
        bottom: p.marginBottom,
        left: p.marginLeft,
      },
    });

    downloadBlob(docxBlob, '.docx');
    toastSuccess('Dokumen berhasil diekspor ke DOCX!');
  } catch (err) {
    console.error('[Editor] DOCX export error:', err);
    // Fallback ke .doc
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    downloadBlob(blob, '.doc');
    toastSuccess('Dokumen diekspor ke DOC (fallback)!');
  }
}

function downloadBlob(blob, ext) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'PAK_Integrasi_' + (editorCurrentData?.['NIP'] || 'dokumen') + '_' + new Date().toISOString().split('T')[0] + ext;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================
 * CLOSE - dengan prompt unsaved changes
 * ============================================ */
async function closeDocumentEditor() {
  // Cek apakah ada perubahan belum disimpan
  if (editorInstance && editorHasUnsavedChanges) {
    // Buat modal custom (bukan confirm browser)
    const choice = await showCloseConfirmDialog();
    if (choice === 'cancel') return;
    if (choice === 'save') {
      await saveDokumenNow(false);
    }
    // choice === 'discard' → lanjut tutup
  }

  // Destroy TinyMCE
  if (editorInstance) {
    try {
      editorInstance.remove();
    } catch (e) {
      console.warn('[Editor] Gagal destroy:', e.message);
    }
    editorInstance = null;
  }

  if (editorAutoSaveTimer) {
    clearTimeout(editorAutoSaveTimer);
    editorAutoSaveTimer = null;
  }

  const modal = document.getElementById('editorModal');
  if (modal) modal.remove();
  document.body.style.overflow = '';

  editorCurrentData = null;
  editorDokumenId = null;
  editorLastSavedContent = '';
  editorHasUnsavedChanges = false;
}

function showCloseConfirmDialog() {
  return new Promise((resolve) => {
    let modal = document.getElementById('closeConfirmModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'closeConfirmModal';
    modal.className = 'modal-overlay active';
    modal.style.cssText = 'display: flex;';

    modal.innerHTML = `
      <div class="modal" style="max-width: 450px;">
        <div class="modal-body">
          <div class="confirm-dialog">
            <div class="confirm-icon danger"><i class="fas fa-exclamation-triangle"></i></div>
            <h3 style="margin-bottom: 12px;">Perubahan belum disimpan</h3>
            <p class="confirm-text">Apakah Anda yakin ingin keluar?</p>
            <p class="confirm-subtext">Perubahan yang belum disimpan akan hilang jika Anda memilih "Tutup Tanpa Menyimpan".</p>
          </div>
        </div>
        <div class="modal-footer" style="justify-content: center; flex-wrap: wrap; gap: 8px;">
          <button class="btn btn-warning" id="closeBtnCancel"><i class="fas fa-times"></i> Batal</button>
          <button class="btn btn-success" id="closeBtnSave"><i class="fas fa-save"></i> Simpan & Tutup</button>
          <button class="btn btn-danger" id="closeBtnDiscard"><i class="fas fa-door-open"></i> Tutup Tanpa Menyimpan</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const cleanup = (choice) => {
      modal.remove();
      resolve(choice);
    };

    document.getElementById('closeBtnCancel').onclick = () => cleanup('cancel');
    document.getElementById('closeBtnSave').onclick = () => cleanup('save');
    document.getElementById('closeBtnDiscard').onclick = () => cleanup('discard');

    modal.addEventListener('click', (e) => {
      if (e.target === modal) cleanup('cancel');
    });
  });
}
