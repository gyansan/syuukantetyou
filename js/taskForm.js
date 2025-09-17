//タスク追加系フォームはここで一元管理する

const modal = document.getElementById("task-modal");
const form = document.getElementById("task-form");
const openButton = document.getElementById("add-task");
const closeButtons = modal.querySelectorAll("[data-close-modal]");
const titleEl   = document.getElementById('task-modal-title');
const addButton = document.getElementById("add-task");
const editButton = document.getElementById("edit-task");
const errorBox = document.getElementById("form-error");

//////////////////////////////////////////////////////////
//表示処理

//追加で開く
addButton.addEventListener("click",()=>{
  const repeatType = addButton.dataset.repeat;
  openAddForm(repeatType);
})

function openAddForm(repeatType){
  resetForm();
  const repeatSelect = document.querySelector('select[name="repeat"]');
  repeatSelect.disabled = false;
  repeatSelect.value = repeatType;
  updateRepeatUI(repeatType);
  form.dataset.mode = 'add';
  titleEl.textContent = 'タスクを追加';
  document.getElementById("task-submit").textContent = "追加";
  modal.classList.add("is-active");
  modal.setAttribute("aria-hidden", "false");
}

//編集で開く
async function openUpdateModal(id, repeatType){
  resetForm();
  const repeatSelect = document.querySelector('select[name="repeat"]');
  repeatSelect.disabled = true;
  repeatSelect.value = repeatType;
  updateRepeatUI(repeatType);
  form.dataset.mode = 'edit';
  form.dataset.taskId = Number(id);
  titleEl.textContent = 'タスクを編集';
  
  //タスク取得
  const storeName = selectStoreName(repeatType);
  const task = await getItemById(id, storeName);

  if (!task) {
    alert("対象のタスクが見つかりませんでした");
    return;
  }

  // タスクをフォームに登録
  form.elements.title.value     = task.title || "";
  form.elements.startTime.value = task.startTime || "";
  form.elements.endTime.value   = task.endTime || "";
  form.elements.notes.value     = task.notes || "";

  if (repeatType === "none") {
    form.elements.deadline.value = task.deadline || "";
  } else if (repeatType === "weekly") {
    form.elements.weekday.value        = task.weekday || "";
    form.elements.weeklyDeadline.value = task.deadline || "";
  } else if (repeatType === "monthly") {
    form.elements.monthlyStart.value    = task.startDay || "";
    form.elements.monthlyDeadline.value = task.deadline || "";
  }

  document.getElementById("task-submit").textContent = "変更する";

  modal.classList.add("is-active");
  modal.setAttribute("aria-hidden", "false");
}

//フォーム内の初期化
function resetForm() {
  form.reset();
}

//////////////////////////////////////////////////////////
//非表示処理
closeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    closeForm();
  });
})

function closeForm(){
  modal.classList.remove("is-active");
  modal.setAttribute("aria-hidden", "true");
}

//////////////////////////////////////////////////////////
//プルダウン選択変更があったとき
const repeatSelect = document.querySelector('select[name="repeat"]');
repeatSelect.addEventListener("change", (e) => {
  const repeatType = e.target.value;
  updateRepeatUI(repeatType);
})

//////////////////////////////////////////////////////////
function updateRepeatUI(repeatType){
  UiReset();
  if (repeatType === "none"){
    UiRepeatNone();
  } else if(repeatType === "daily"){
    UiRepeatDaily();
  } else if(repeatType === "weekly"){
    UiRepeatWeekly();
  } else if(repeatType === "monthly"){
    UiRepeatMonthly();
  }
}

//フォームの要素をすべて非表示
function UiReset(){
  document.getElementById("weekday").classList.add("hidden");
  document.getElementById("start-day").classList.add("hidden");
  document.getElementById("time-row").classList.add("hidden");
  document.getElementById("deadline").classList.add("hidden");
  document.getElementById("weekly-deadline").classList.add("hidden");
  document.getElementById("monthly-deadline").classList.add("hidden");
}

function UiRepeatNone(){
  document.getElementById("time-row").classList.remove("hidden");
  document.getElementById("deadline").classList.remove("hidden");
}

function UiRepeatDaily(){
  document.getElementById("time-row").classList.remove("hidden");
}

function UiRepeatWeekly(){
  document.getElementById("weekday").classList.remove("hidden");
  document.getElementById("time-row").classList.remove("hidden");
  document.getElementById("weekly-deadline").classList.remove("hidden");
}

function UiRepeatMonthly(){
  document.getElementById("start-day").classList.remove("hidden");
  document.getElementById("time-row").classList.remove("hidden");
  document.getElementById("monthly-deadline").classList.remove("hidden");
}

//////////////////////////////////////////////////////////
// ---- 送信（追加/更新を分岐）----
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  errorBox.textContent = '';
  
  const repeatType = document.querySelector('select[name="repeat"]').value;
  const values = createValues(repeatType);//繰り返しに応じた項目をセット
  
  // ざっくりバリデーション
  if (!values.title || values.title.length < 2) {
    errorBox.textContent = 'タスク名は2文字以上で入力してください。';
    return;
  }
  if (values.startTime && values.endTime && values.startTime >= values.endTime) {
    errorBox.textContent = '終了時間は開始時間より後にしてください。';
    return;
  }

  const storeName = selectStoreName(repeatType);
  
  try {
    const mode = form.dataset.mode || 'add';
    if (mode === "edit") {
      const id = Number(form.dataset.taskId);
      await editItem(id, values, storeName);
      alert('タスクを編集しました。');
    } else {
      await addItem(storeName, values);
      alert('タスクを保存しました。');
    }
  } catch (err) {
    alert('保存に失敗しました。もう一度お試しください。');
    return;
  }

  closeForm();
  refreshTasks();
 
});

function createValues(repeatType){
  //共通
  const values = {
    title:     form.elements.title.value.trim(),
    startTime: form.elements.startTime.value,
    endTime:   form.elements.endTime.value,
    notes:     form.elements.notes.value.trim(),
    status:    false //TODOロジックで表示調整する（週次・月次）
  }
  //個別
  if (repeatType === "none") {
    values.deadline = form.elements.deadline.value;
  } else if (repeatType === "daily") {
    // daily は特別な追加項目なし
  } else if (repeatType === "weekly") {
    values.weekday  = form.elements.weekday.value;
    values.deadline = form.elements.weeklyDeadline.value;
  } else if (repeatType === "monthly") {
    values.startDay = form.elements.monthlyStart.value;
    values.deadline = form.elements.monthlyDeadline.value;
  }
  return values;
}

function selectStoreName(repeatType) {
  if (repeatType === "none") {
    return "tasks";
  } else if (repeatType === "daily") {
    return "dailyTasks";
  } else if (repeatType === "weekly") {
    return "weeklyTasks";
  } else if (repeatType === "monthly") {
    return "monthlyTasks";
  }
}
