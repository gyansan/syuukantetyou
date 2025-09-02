//indexファイルのみに読み込ませる
//////////////////////////////////
// 見出しを作る
window.addEventListener("DOMContentLoaded",()=>{
  const todayTodo = document.getElementById("today-todo");
  const today = new Date();
  todayTodo.textContent = formatSlash(today) + "　本日のタスク";
});

function formatSlash(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}

//////////////////////////////////
// タスクリストを表示する

const taskRowTemplate = document.getElementById("task-row-template");
const taskTableBody = document.getElementById("task-tbody");

function createTaskRow(task) {
  const taskRow = taskRowTemplate.content.firstElementChild.cloneNode(true);
  taskRow.dataset.id = task.id;

  const taskCell = taskRow.querySelector(".cell-task");
  taskCell.textContent = task.title || "";
  if (task.notes) taskCell.setAttribute("data-note", task.notes);

  taskRow.querySelector(".cell-start").textContent = task.startTime || "";
  taskRow.querySelector(".cell-end").textContent = task.endTime || "";
  taskRow.querySelector(".cell-deadline").textContent = task.deadline || "";

  // ★ 先頭ボタンを編集ボタンとしてマーク（テンプレートが「編集→完了」の順のため）
  const firstBtn = taskRow.querySelector("button.btn.btn-sm");
  if (firstBtn && !firstBtn.dataset.action) {
    firstBtn.dataset.action = "edit";
  }
  return taskRow;
}

function renderTaskTable(tasks) {
  taskTableBody.innerHTML = "";
  const emptyMessage = document.getElementById("task-empty-message");
  if (!tasks.length) {
    emptyMessage.style.display = "block";
    return;
  }
  emptyMessage.style.display = "none";
  tasks.forEach(task => taskTableBody.appendChild(createTaskRow(task)));
}

// 初回描画
window.addEventListener("DOMContentLoaded", async ()=>{
  const tasks = await getAllTask();
  tasks.sort((a,b)=> a.deadline.localeCompare(b.deadline));
  tasks.sort((a,b)=> a.endTime.localeCompare(b.endTime));
  tasks.sort((a,b)=> a.startTime.localeCompare(b.startTime));
  renderTaskTable(tasks);
});

// 削除（既存のまま）
taskTableBody.addEventListener("click", async (e) => {
  const deleteButton = e.target.closest('button[data-action="delete"]');
  if (!deleteButton) return;

  const row = deleteButton.closest("tr");
  const id = Number(row.dataset.id);
  try {
    await deleteTask(id);
    row.remove();
    if (taskTableBody.rows.length === 0) {
      renderTaskTable([]);
    }
  } catch (err) {
    console.error("削除エラー:", err);
  }
});

// ★ 追加：編集ボタン（イベント委譲）
taskTableBody.addEventListener("click", (e)=>{
  const editButton = e.target.closest('button[data-action="edit"]') 
                  || (e.target.closest('button')?.textContent?.includes('編集') ? e.target.closest('button') : null);
  if (!editButton) return;
  const row = editButton.closest('tr');
  if (!row) return;
  const id = Number(row.dataset.id);
  if (Number.isFinite(id)) {
    // taskForm.js が公開した関数
    window.openEditModal?.(id);
  }
});

// 共通：再取得→並び替え→描画（グローバル公開）
async function refreshTasks() {
  const tasks = await getAllTask();
  tasks.sort((a,b)=> a.deadline.localeCompare(b.deadline));
  tasks.sort((a,b)=> a.endTime.localeCompare(b.endTime));
  tasks.sort((a,b)=> a.startTime.localeCompare(b.startTime));
  renderTaskTable(tasks);
}
window.refreshTasks = refreshTasks;
