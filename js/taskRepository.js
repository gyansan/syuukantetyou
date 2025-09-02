
//データベース操作専用
const dbPromise = connectDb();

//データベースに接続
function connectDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("taskDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("tasks")) {
        db.createObjectStore("tasks", { keyPath: "id", autoIncrement: true});
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      // 将来のバージョン変更で接続を閉じる安全策
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

//IDBRequest を Promise 化する小ユーティリティ
const req = r => new Promise((res, rej) => {
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
//トランザクションが確定(commit)するまで待つための Promise
const txDone = tx => new Promise((res, rej) => {
  tx.oncomplete = () => res();
  tx.onabort = tx.onerror = () => rej(tx.error);
});

//タスクを保存
async function addTask(task) {
  const db = await dbPromise;
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");
  
  const { id, ...rest } = task || {};
  const newId = await req(store.add(rest));
  await txDone(tx);
  return newId;
}

//タスクを取得
async function getAllTask(){
  const db = await dbPromise;
  const tx = db.transaction("tasks", "readonly");
  const store = tx.objectStore("tasks");
  const all = await req(store.getAll());
  await txDone(tx);
  return all;
}

//タスクを編集（存在前提なら NOT_FOUND を投げる例）
async function editTask(id, patch) {
  const db = await dbPromise;
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");

  // 必要なら厳密更新：存在チェック（無ければエラー）
  const curr = await req(store.get(id));
  if (!curr) {
    tx.abort();
    throw new Error("NOT_FOUND");
  }

  const updated = { ...curr, ...patch, id }; // 部分更新をマージ
  await req(store.put(updated));             // value を先に渡す
  await txDone(tx);                          // コミット完了待ち
  return updated;
}

//タスクを削除
async function deleteTask(id){
  const db = await dbPromise;
  const tx = db.transaction("tasks", "readwrite");
  const store = tx.objectStore("tasks");
  const curr = await req(store.get(id));

  if (!curr) {
    tx.abort();
    throw new Error("NOT_FOUND");
  }

    // 削除リクエスト
  store.delete(id);

  // トランザクション完了を待つ
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

}

async function getTaskById(id){
  const db = await dbPromise;
  const tx = db.transaction("tasks", "readonly");
  const store = tx.objectStore("tasks");
  const data = await req(store.get(id));
  await txDone(tx);
  return data;
}

// （必要なら）グローバル公開（非モジュール時は関数宣言でもwindowに出ます）
window.getTaskById = getTaskById;