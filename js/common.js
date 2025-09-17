//ナビゲーション
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".sidebar ul");

  toggleBtn.addEventListener("click", () => {
    menu.classList.toggle("show");
  });

  // メニューリンク押したら閉じる
  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      menu.classList.remove("show");
    });
  });
});


//////////////////////////////////////
//スマホ対応メモモーダル
// モーダル要素取得
const noteModal = document.getElementById("note-modal");
const noteModalText = document.getElementById("note-modal-text");
const noteModalClose = document.querySelector(".note-modal-close");

document.addEventListener("click", (e) => {
  if (e.target.matches('[data-action="note"]')) {
    const row = e.target.closest("tr");
    const note = row.querySelector(".cell-task").dataset.note || "メモはありません";
    noteModalText.textContent = note;
    noteModal.style.display = "block";
  }
});

// 閉じる処理
noteModalClose.addEventListener("click", () => {
  noteModal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === noteModal) {
    noteModal.style.display = "none";
  }
});