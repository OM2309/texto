const FAB_ID = "grammar-ai-fab";

export function createFAB(
  position: { x: number; y: number },
  onClick: () => void
) {
  removeFAB();

  const fab = document.createElement("button");
  fab.id = FAB_ID;
  fab.setAttribute("aria-label", "Fix Grammar with AI");
  fab.title = "Fix Grammar with AI";
  fab.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
    <span>Fix</span>
  `;

  Object.assign(fab.style, {
    position: "absolute",
    left: `${Math.min(position.x, window.innerWidth - 90)}px`,
    top: `${position.y}px`,
    zIndex: "2147483647",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "5px 10px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "system-ui, sans-serif",
    fontWeight: "600",
    boxShadow: "0 2px 12px rgba(99,102,241,0.5)",
    transition: "transform 0.15s, box-shadow 0.15s",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  fab.addEventListener("mouseenter", () => {
    fab.style.transform = "scale(1.05)";
    fab.style.boxShadow = "0 4px 16px rgba(99,102,241,0.7)";
  });

  fab.addEventListener("mouseleave", () => {
    fab.style.transform = "scale(1)";
    fab.style.boxShadow = "0 2px 12px rgba(99,102,241,0.5)";
  });

  fab.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  fab.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });

  document.body.appendChild(fab);

  // Auto-remove after 6 seconds
  setTimeout(removeFAB, 6000);
}

export function removeFAB() {
  document.getElementById(FAB_ID)?.remove();
}
