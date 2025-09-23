// データベース操作専用
const dbPromise = connectDb();

// データベースに接続
function connectDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("taskDB", 2);

    // 作りたいストアを全部ここで定義
    const stores = [
      { name: "tasks",       options: { keyPath: "id", autoIncrement: true }},
      { name: "dailyTasks",  options: { keyPath: "id", autoIncrement: true }},
      { name: "weeklyTasks", options: { keyPath: "id", autoIncrement: true }},
      { name: "monthlyTasks",options: { keyPath: "id", autoIncrement: true }},
      { name: "lastUpdated"}
    ];

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      stores.forEach(s => {
        if (!db.objectStoreNames.contains(s.name)) {
          db.createObjectStore(s.name, s.options);
        }
      });
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      db.onversionchange = () => db.close(); // 将来のバージョン変更に備える
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

// IDBRequest を Promise 化する小ユーティリティ
const req = r => new Promise((res, rej) => {
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
// トランザクションが確定(commit)するまで待つための Promise
const txDone = tx => new Promise((res, rej) => {
  tx.oncomplete = () => res();
  tx.onabort = tx.onerror = () => rej(tx.error);
});

// アイテムを保存
async function addItem(storeName, item) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  
  const { id, ...rest } = item || {};
  const newId = await req(store.add(rest));
  await txDone(tx);
  return newId;
}

// アイテムを全件取得
async function getAllItems(storeName) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const all = await req(store.getAll());
  await txDone(tx);
  return all;
}

// アイテムを編集（存在前提なら NOT_FOUND を投げる例）
async function editItem(id, patch, storeName) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);

  // 必要なら厳密更新：存在チェック（無ければエラー）
  const curr = await req(store.get(Number(id)));
  if (!curr) {
    tx.abort();
    throw new Error("NOT_FOUND");
  }

  const updated = { ...curr, ...patch, id }; 
  await req(store.put(updated)); 
  await txDone(tx); 
  return updated;
}

//完了処理
async function completeItem(id, storeName){
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);

  const curr = await req(store.get(Number(id)));
  if (!curr) {
    tx.abort();
    throw new Error("NOT_FOUND");
  }

  const updated = { ...curr, status: true, id: Number(id) };

  await req(store.put(updated)); 
  await txDone(tx);

  return updated;
}

// アイテムを削除
async function deleteItem(id, storeName) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readwrite");
  const store = tx.objectStore(storeName);
  const curr = await req(store.get(Number(id)));
  if (!curr) {
    tx.abort();
    throw new Error("NOT_FOUND");
  }
  // 削除リクエスト
  store.delete(Number(id));
  // トランザクション完了を待つ
  await txDone(tx);
}

// IDでアイテムを取得
async function getItemById(id, storeName) {
  const db = await dbPromise;
  const tx = db.transaction(storeName, "readonly");
  const store = tx.objectStore(storeName);
  const data = await req(store.get(Number(id)));
  await txDone(tx);
  return data;
}

//最終更新日
async function getLastUpdated() {
  const db = await dbPromise;
  const tx = db.transaction("lastUpdated", "readonly");
  const store = tx.objectStore("lastUpdated");
  const data = await req(store.get("lastDate")); // 値: "YYYY-MM-DD"
  await txDone(tx);
  return data;
}

async function setLastUpdated(dateStr) {
  const db = await dbPromise;
  const tx = db.transaction("lastUpdated", "readwrite");
  const store = tx.objectStore("lastUpdated");
  await req(store.put(dateStr, "lastDate")); // 値:日付, キー:"lastDate"
  await txDone(tx);
}