const list = document.querySelector("#article-list");
const view = document.querySelector("#article-view");
const filters = [...document.querySelectorAll(".filter-chip")];
let articles = [];

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function cleanMarkdown(markdown) {
  return markdown.split(/\r?\n/).filter(line => !/^>\s*(类型：|状态：|配图：|栏目：|标签：|语言：|刊发平台：|作者：|摄影：|发稿时间：|刊发时间：|原文链接：)/.test(line)).join("\n");
}

function plainText(markdown) {
  return cleanMarkdown(markdown)
    .replace(/^#.*$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(markdown, limit = 176) {
  const text = plainText(markdown);
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text;
}

function readingTime(markdown) {
  const count = plainText(markdown).replace(/\s/g, "").length;
  return `${Math.max(2, Math.ceil(count / 650))} 分钟阅读`;
}

function markdownToHTML(markdown) {
  const lines = cleanMarkdown(markdown).split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let quote = [];
  const inline = value => escapeHTML(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote.length) output.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);
    quote = [];
  };

  for (const line of lines) {
    if (!line.trim()) { flushParagraph(); flushQuote(); continue; }
    if (/^#\s/.test(line)) { flushParagraph(); flushQuote(); continue; }
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) { flushParagraph(); flushQuote(); output.push(`<h2>${inline(heading[1])}</h2>`); continue; }
    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) { flushParagraph(); quote.push(quoted[1]); continue; }
    flushQuote();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushQuote();
  return output.join("\n");
}

function cardTemplate(article, index) {
  const image = article.image ? `<div class="card-image"><img src="${escapeHTML(article.image)}" alt="${escapeHTML(article.imageAlt || article.title)}" loading="lazy"></div>` : "";
  return `<article class="article-card${article.image ? " has-image" : ""}">
    ${image}
    <div class="card-content">
      <div class="meta-line"><span class="category-label">${escapeHTML(article.category)}</span><span>作品 ${String(index + 1).padStart(2, "0")}</span><span>${readingTime(article.content)}</span></div>
      <h2 class="article-title"><a href="#${encodeURIComponent(article.slug)}" data-open="${escapeHTML(article.slug)}">${escapeHTML(article.title)}</a></h2>
      <p class="excerpt">${escapeHTML(excerpt(article.content))}</p>
      <div class="card-bottom">
        <div class="tag-list">${article.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>
        <a class="read-link" href="#${encodeURIComponent(article.slug)}" data-open="${escapeHTML(article.slug)}">阅读文章</a>
      </div>
    </div>
  </article>`;
}

function renderList(category = "all") {
  const visible = category === "all" ? articles : articles.filter(article => article.category === category);
  list.innerHTML = visible.length ? visible.map(article => cardTemplate(article, articles.indexOf(article))).join("") : '<p class="empty-state">这个分类还没有作品。</p>';
  list.classList.remove("is-hidden");
  view.classList.add("is-hidden");
  document.querySelector(".work-section").classList.remove("is-hidden");
  document.title = "YY’S WRITING";
}

function openArticle(slug, updateAddress = true) {
  const article = articles.find(item => item.slug === slug);
  if (!article) return;
  if (updateAddress) history.pushState(null, "", `#${encodeURIComponent(slug)}`);
  document.querySelector(".work-section").classList.add("is-hidden");
  list.classList.add("is-hidden");
  view.classList.remove("is-hidden");
  view.innerHTML = `<a class="back-link" href="#home" data-back>← 返回作品列表</a>
    <div class="meta-line"><span class="category-label">${escapeHTML(article.category)}</span><span>${readingTime(article.content)}</span></div>
    <h1 class="detail-title">${escapeHTML(article.title)}</h1>
    <div class="prose">${markdownToHTML(article.content)}</div>`;
  document.title = `${article.title} — YY’S WRITING`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", event => {
  const open = event.target.closest("[data-open]");
  if (open) { event.preventDefault(); openArticle(open.dataset.open); return; }
  if (event.target.closest("[data-back]")) { event.preventDefault(); history.pushState(null, "", "#home"); renderList(); return; }
});

filters.forEach(button => button.addEventListener("click", () => {
  filters.forEach(item => item.classList.toggle("is-active", item === button));
  history.pushState(null, "", "#home");
  renderList(button.dataset.filter);
}));

window.addEventListener("popstate", () => {
  const slug = decodeURIComponent(location.hash.slice(1));
  if (slug && slug !== "home") openArticle(slug, false);
  else renderList();
});

articles = window.portfolioArticles || [];
const initialSlug = decodeURIComponent(location.hash.slice(1));
if (initialSlug && initialSlug !== "home") openArticle(initialSlug);
else renderList();
