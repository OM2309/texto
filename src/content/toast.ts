const TOAST_ID = "gai-toast";

export function showToast(message: string, type: "success" | "error" = "success") {
  // Remove existing
  document.getElementById(TOAST_ID)?.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;

  const bg = type === "success"
    ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
    : "linear-gradient(135deg,#dc2626,#b91c1c)";

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    background: bg,
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "10px",
    fontSize: "13px",
    fontFamily: "system-ui,sans-serif",
    fontWeight: "600",
    boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
    pointerEvents: "none",
    animation: "gai-toast-in 0.2s ease",
    maxWidth: "280px",
    lineHeight: "1.4",
  });

  toast.textContent = message;

  injectToastStyles();
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "gai-toast-out 0.2s ease forwards";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

function injectToastStyles() {
  if (document.getElementById("gai-toast-styles")) return;
  const s = document.createElement("style");
  s.id = "gai-toast-styles";
  s.textContent = `
    @keyframes gai-toast-in  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes gai-toast-out { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(8px); } }
  `;
  document.head.appendChild(s);
}
