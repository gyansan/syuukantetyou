//indexファイルのみに読み込ませる,表示担当
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

// 初回描画
window.addEventListener("DOMContentLoaded", async ()=>{
  refreshTasks();
});

async function refreshTasks() {

  await updateTasks(); //更新処理

  const tasks = await createTodayTasks(); //当日タスクを生成（一番下に書きます）

  tasks.sort((a, b) => 
    a.deadline.localeCompare(b.deadline) ||
    a.startTime.localeCompare(b.startTime) ||
    a.endTime.localeCompare(b.endTime)
  );
  renderTaskTable(tasks);
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

function createTaskRow(task) {
  const taskRow = taskRowTemplate.content.firstElementChild.cloneNode(true);

  // 元データを特定するための情報も持たせる
  if (task.repeatType) taskRow.dataset.repeatType = task.repeatType;
  if (task.originId !== undefined) taskRow.dataset.originId = task.originId;

  const taskCell = taskRow.querySelector(".cell-task");
  taskCell.textContent = task.title || "";
  if (task.notes) taskCell.setAttribute("data-note", task.notes);

  taskRow.querySelector(".cell-start").textContent = task.startTime || "";
  taskRow.querySelector(".cell-end").textContent = task.endTime || "";
  taskRow.querySelector(".cell-deadline").textContent = task.deadline || "";

  return taskRow;
}

// 操作ボタン処理（完了・削除・編集）
taskTableBody.addEventListener("click", async (e) => {
  const row = e.target.closest("tr");
  if (!row) return;

  const originId = Number(row.dataset.originId);
  const repeatType = row.dataset.repeatType;

  // 完了ボタン
  if (e.target.closest('button[data-action="complete"]')) {
    console.log("こことオタ");
    try {
      const storeName = selectStoreName(repeatType);
      await completeItem(originId, storeName);
      await refreshTasks();
    } catch (err) {
      console.error("完了処理エラー:", err);
    }
    return;
  }

  // 編集ボタン
  if (e.target.closest('button[data-action="edit"]')) {
    try {
      await openUpdateModal(originId, repeatType);
    } catch (err) {
      console.error("編集モーダルエラー:", err);
    }
    return;
  }

});

//////////////////////////////////////////////////////////////////////
// 更新処理
async function updateTasks() {
  
  const today = new Date();
  const todayStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD

  // 最終更新日を取得
  let lastDateStr = await getLastUpdated();
  let lastDate = lastDateStr ? new Date(lastDateStr) : null;
  
  if (lastDate === today){
    return;
  }

  if (!lastDate) {
    // 初回起動なら今日を保存して終了
    await setLastUpdated(todayStr);
    console.log("初回起動: 今日を lastUpdated に設定");
    return;
  }

  // 差分ループ（lastDate+1日 〜 今日まで）
  while (lastDate < today) {
    lastDate.setDate(lastDate.getDate() + 1); // 1日進める
    await resetForDate(lastDate);
  }

  // 最終更新日を更新
  await setLastUpdated(todayStr);

}

// 日ごとのリセット処理
async function resetForDate(date) {
  const weekday = date.getDay();   // 0=日曜〜6=土曜
  const day = date.getDate();      // 1〜31
  const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  // dailyTasks → 全部未完了に戻す
  const dailyTasks = await getAllItems("dailyTasks");
  for (const task of dailyTasks) {
    task.status = false;
    await editItem(task.id, task, "dailyTasks");
  }

  // weeklyTasks → 曜日一致
  const weeklyTasks = await getAllItems("weeklyTasks");
  for (const task of weeklyTasks) {
    if (Number(task.weekday) === weekday) {
      task.status = false;
      await editItem(task.id, task, "weeklyTasks");
    }
  }

  // monthlyTasks → 日付一致 or 月末補正
  const monthlyTasks = await getAllItems("monthlyTasks");
  for (const task of monthlyTasks) {
    if (day === lastDayOfMonth) {
      // 月末補正: その日以降の startDay をまとめて処理
      if (Number(task.startDay) >= day) {
        task.status = false;
        await editItem(task.id, task, "monthlyTasks");
      }
    } else {
      // 通常: 日付一致のみ
      if (Number(task.startDay) === day) {
        task.status = false;
        await editItem(task.id, task, "monthlyTasks");
      }
    }
  }
}

/////////////////////////////////////////////////////////
//当日タスク生成
async function createTodayTasks() {
  const today = new Date();
  const tasksForToday = [];

  // 個別タスク
  const indiv = await getAllItems("tasks");
  indiv
    .filter(t => t.status === false)
    .forEach(t => {
      tasksForToday.push({
        ...t,
        repeatType: "none",
        originId: t.id
      });
    });

  // 日次タスク
  const daily = await getAllItems("dailyTasks");
  daily
    .filter(t => t.status === false)
    .forEach(t => {
      tasksForToday.push({
        ...t,
        deadline: today.toISOString().slice(0,10),
        repeatType: "daily",
        originId: t.id
      });
    });

  // 週次タスク
  const weekly = await getAllItems("weeklyTasks");
  const weekday = today.getDay();
  weekly
    .filter(t => t.status === false && Number(t.weekday) === weekday)
    .forEach(t => {
      const deadline = new Date(today);
      deadline.setDate(today.getDate() + Number(t.weeklyDeadline || 0));
      tasksForToday.push({
        ...t,
        deadline: deadline.toISOString().slice(0,10),
        repeatType: "weekly",
        originId: t.id
      });
    });

  // 月次タスク
  const monthly = await getAllItems("monthlyTasks");
  const day = today.getDate();
  const lastDay = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();

  monthly
    .filter(t => t.status === false && Number(t.startDay) === day)
    .forEach(t => {
      let deadlineDay = Number(t.monthlyDeadline);
      let deadlineDate;

      if (t.startDay <= deadlineDay) {
        deadlineDay = Math.min(deadlineDay, lastDay);
        deadlineDate = new Date(today.getFullYear(), today.getMonth(), deadlineDay);
      } else {
        const nextMonthLast = new Date(today.getFullYear(), today.getMonth()+2, 0).getDate();
        deadlineDay = Math.min(deadlineDay, nextMonthLast);
        deadlineDate = new Date(today.getFullYear(), today.getMonth()+1, deadlineDay);
      }

      tasksForToday.push({
        ...t,
        deadline: deadlineDate.toISOString().slice(0,10),
        repeatType: "monthly",
        originId: t.id
      });
    });

  return tasksForToday;
}




