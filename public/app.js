async function loadTitles(elementId, type) {
  const element = document.getElementById(elementId);

  if (!element) return;

  try {
    const response = await fetch(
      "/api/titles?type=" + encodeURIComponent(type)
    );

    if (!response.ok) {
      throw new Error("Failed to load titles");
    }

    const titles = await response.json();

    if (!titles.length) {
      element.innerHTML = `
        <div class="empty">
          <p>هێشتا هیچ ناوەڕۆکێک زیاد نەکراوە.</p>
        </div>
      `;

      return;
    }

    element.innerHTML = titles.map(title => {

      const poster =
        title.poster ||
        "https://placehold.co/400x600/111522/ffffff?text=Kurd+Cine";

      return `
        <a class="card" href="/details.html?id=${title.id}">

          <img
            src="${escapeHTML(poster)}"
            alt="${escapeHTML(title.title)}"
            loading="lazy"
            onerror="this.src='https://placehold.co/400x600/111522/ffffff?text=Kurd+Cine'"
          >

          <div class="card-content">

            <div class="card-title">
              ${escapeHTML(title.title)}
            </div>

            <div class="card-meta">
              ${escapeHTML(title.year || "")}
              ${title.genre ? " • " + escapeHTML(title.genre) : ""}
            </div>

          </div>

        </a>
      `;

    }).join("");

  } catch (error) {

    console.error(error);

    element.innerHTML = `
      <div class="empty">
        <p>کێشەیەک ڕوویدا لە بارکردنی ناوەڕۆک.</p>
      </div>
    `;
  }
}


function escapeHTML(value) {

  return String(value || "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );

}
