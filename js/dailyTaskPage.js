
const taskRowTemplate = document.getElementById("task-row-template");
const taskTableBody = document.getElementById("task-tbody");

//テーブルを表示する
window.addEventListener("DOMContentLoaded", async ()=>{
  refreshTasks();
});

async function refreshTasks() {
  const tasks = await getAllItems("dailyTasks");
  tasks.sort((a,b)=> a.endTime.localeCompare(b.endTime));
  tasks.sort((a,b)=> a.startTime.localeCompare(b.startTime));
  renderDailyTaskTable(tasks);
}

function renderDailyTaskTable(tasks){
  taskTableBody.innerHTML = "";
  const emptyMessage = document.getElementById("task-empty-message");
  if (!tasks.length) {
    emptyMessage.style.display = "block";
    return;
  }
  emptyMessage.style.display = "none";
  tasks.forEach(task => taskTableBody.appendChild(createTaskRow(task)));
}

function createTaskRow(task) {
  const taskRow = taskRowTemplate.content.firstElementChild.cloneNode(true);
  taskRow.dataset.id = task.id;

  const taskCell = taskRow.querySelector(".cell-task");
  taskCell.textContent = task.title || "";
  if (task.notes) taskCell.setAttribute("data-note", task.notes);

  taskRow.querySelector(".cell-start").textContent = task.startTime || "";
  taskRow.querySelector(".cell-end").textContent = task.endTime || "";

  return taskRow;
}

//削除・編集ボタンにイベントをつける
// tbodyにイベントをまとめて仕込む
taskTableBody.addEventListener("click", (e) => {
  // 編集ボタンが押された場合
  if (e.target.matches('[data-action="edit"]')) {
    const row = e.target.closest("tr"); 
    console.log("編集ボタン:", row);
    //TODO taskForm側に実装した関数
    openUpdateModal(row.dataset.id, "daily")
  }
  // 削除ボタンが押された場合
  if (e.target.matches('[data-action="delete"]')) {
    const row = e.target.closest("tr");
    deleteItem(row.dataset.id, "dailyTasks");
    refreshTasks();
  }
});