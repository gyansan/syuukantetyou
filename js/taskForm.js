// js/taskForm.js
// モジュール無し（import/exportしない）。index.js と同じページで読み込む想定。

// ---- 要素参照 ----
const modalEl   = document.getElementById('task-modal');
const formEl    = document.getElementById('task-form');
const titleEl   = document.getElementById('task-modal-title');
const errorBox  = document.getElementById('form-error');
const submitBtn = formEl?.querySelector('button[type="submit"]');

// ---- 共通UI ----
function showModal() {
  modalEl.classList.add('is-active');
  modalEl.setAttribute('aria-hidden', 'false');
  const firstInput = modalEl.querySelector('input');
  if (firstInput) firstInput.focus();
}
function hideModal() {
  modalEl.classList.remove('is-active');
  modalEl.setAttribute('aria-hidden', 'true');
  errorBox.textContent = '';
  formEl.reset();
  // 編集情報をクリア
  delete formEl.dataset.mode;
  delete formEl.dataset.taskId;
}

// 閉じる（× / キャンセル / オーバーレイ / ESC）
modalEl.querySelectorAll('[data-close-modal]').forEach(btn =>
  btn.addEventListener('click', hideModal)
);
modalEl.addEventListener('click', (e)=>{
  if (e.target.classList.contains('modal__overlay')) hideModal();
});
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape') hideModal();
});

// ---- 追加で開く ----
function openAddModal(){
  formEl.reset();
  formEl.dataset.mode = 'add';
  titleEl.textContent = 'タスクを追加';
  if (!formEl.elements.startTime.value) formEl.elements.startTime.value = '09:00';
  if (!formEl.elements.endTime.value)   formEl.elements.endTime.value   = '09:30';
  if (submitBtn) submitBtn.textContent = '追加';
  showModal();
}

// ---- 編集で開く ----
async function openEditModal(taskId){
  formEl.reset();
  formEl.dataset.mode = 'edit';
  formEl.dataset.taskId = String(taskId);
  titleEl.textContent = 'タスクを編集';
  if (submitBtn) submitBtn.textContent = '更新';

  try {
    // Repositoryから単体取得（今回追加するAPI）
    const t = await getTaskById(Number(taskId));
    if (t) {
      formEl.elements.title.value     = t.title     || '';
      formEl.elements.startTime.value = t.startTime || '';
      formEl.elements.endTime.value   = t.endTime   || '';
      formEl.elements.deadline.value  = t.deadline  || '';
      formEl.elements.notes.value     = t.notes     || '';
    }
  } catch (e) {
    errorBox.textContent = 'タスクの取得に失敗しました。';
  }
  showModal();
}

// ---- 送信（追加/更新を分岐）----
formEl.addEventListener('submit', async (e)=>{
  e.preventDefault();
  errorBox.textContent = '';

  const values = {
    title:     formEl.elements.title.value.trim(),
    startTime: formEl.elements.startTime.value,
    endTime:   formEl.elements.endTime.value,
    deadline:  formEl.elements.deadline.value,
    notes:     formEl.elements.notes.value.trim()
  };

  // ざっくりバリデーション
  if (!values.title || values.title.length < 2) {
    errorBox.textContent = 'タスク名は2文字以上で入力してください。';
    return;
  }
  if (values.startTime && values.endTime && values.startTime >= values.endTime) {
    errorBox.textContent = '終了時間は開始時間より後にしてください。';
    return;
  }
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  if (values.deadline && values.deadline < todayStr) {
    errorBox.textContent = '過去日を期限に設定できません。';
    return;
  }

  try {
    const mode = formEl.dataset.mode || 'add';
    if (mode === 'edit') {
      const id = Number(formEl.dataset.taskId);
      await editTask(id, values);    // 既存API名に合わせる
    } else {
      await addTask(values);         // 既存API名に合わせる
    }
  } catch (err) {
    alert('保存に失敗しました。もう一度お試しください。');
    return;
  }

  hideModal();
  // index.js 側の再描画（グローバル公開を想定）
  if (typeof window.refreshTasks === 'function') {
    window.refreshTasks();
  }
});

// 追加ボタン → 追加モーダル
document.getElementById('add-task')?.addEventListener('click', openAddModal);

// グローバルからも呼べるように（index.js のイベント委譲から使う）
window.openEditModal = openEditModal;
window.openAddModal  = openAddModal;
