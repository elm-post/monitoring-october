const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileTabsViewport = window.matchMedia("(max-width: 1199px)");
let chapterSections = [];

function setProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  document.documentElement.style.setProperty("--scroll-progress", String(Math.min(1, Math.max(0, progress))));
}

function setActiveChapter(id) {
  let activeMobileLink = null;

  document.querySelectorAll("[data-chapter-link]").forEach((link) => {
    const active = link.dataset.chapterLink === id;
    if (active) {
      link.setAttribute("aria-current", "true");
      if (link.classList.contains("mobile-chapter-tabs__link")) {
        activeMobileLink = link;
      }
    } else {
      link.removeAttribute("aria-current");
    }
  });

  syncMobileTabsToActive(activeMobileLink);
}

function syncMobileTabsToActive(activeLink) {
  if (!activeLink || !mobileTabsViewport.matches) return;

  const container = activeLink.closest(".mobile-chapter-tabs");
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  const padding = 16;
  const isFullyVisible =
    linkRect.left >= containerRect.left + padding &&
    linkRect.right <= containerRect.right - padding;

  if (isFullyVisible) return;

  const targetLeft = activeLink.offsetLeft - (container.clientWidth - activeLink.clientWidth) / 2;
  const maxScrollLeft = container.scrollWidth - container.clientWidth;

  container.scrollTo({
    left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
    behavior: reduceMotion.matches ? "auto" : "smooth"
  });
}

function updateActiveChapterFromScroll() {
  if (!chapterSections.length) return;

  const viewportAnchor = window.scrollY + window.innerHeight * 0.3;
  let activeChapter = chapterSections[0].id;

  for (const chapter of chapterSections) {
    if (chapter.offsetTop <= viewportAnchor) {
      activeChapter = chapter.id;
    } else {
      break;
    }
  }

  setActiveChapter(activeChapter);
}

function initChapterObserver() {
  const linkedChapters = new Set(
    [...document.querySelectorAll("[data-chapter-link]")].map((link) => link.dataset.chapterLink)
  );
  chapterSections = [...document.querySelectorAll("[data-chapter]")].filter((section) =>
    linkedChapters.has(section.dataset.chapter)
  );
  if (!chapterSections.length) return;

  updateActiveChapterFromScroll();
}

function getAnchorScrollTarget(target) {
  if (!target.matches("[data-chapter]")) return target;

  return target.querySelector(".content-section__intro:first-child .section-title") || target;
}

function getTopOverlayOffset(targetTop) {
  const tabs = document.querySelector(".mobile-chapter-tabs");
  if (!tabs || getComputedStyle(tabs).display === "none") return 0;

  const hero = document.querySelector(".hero");
  const tabsTop = hero ? hero.getBoundingClientRect().bottom + window.scrollY : 0;
  const willCoverViewportTop = targetTop >= tabsTop;

  return willCoverViewportTop ? Math.ceil(tabs.getBoundingClientRect().height) : 0;
}

function scrollToAnchor(id, behavior, moveFocus = false) {
  const target = document.getElementById(id);
  if (!target) return false;

  const scrollTarget = getAnchorScrollTarget(target);
  const targetTop = scrollTarget.getBoundingClientRect().top + window.scrollY;
  const top = targetTop - getTopOverlayOffset(targetTop) - 12;

  if (moveFocus) {
    scrollTarget.focus({ preventScroll: true });
  }

  window.scrollTo({
    top: Math.max(0, top),
    behavior
  });

  return true;
}

function initAnchorNavigation() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const id = link.getAttribute("href").slice(1);
      const behavior = reduceMotion.matches ? "auto" : "smooth";
      if (!document.getElementById(id)) return;

      event.preventDefault();

      scrollToAnchor(id, behavior, true);

      const chapter = document.getElementById(id).closest("[data-chapter]");
      if (chapter) setActiveChapter(chapter.id);
      history.pushState(null, "", `#${id}`);
    });
  });
}

window.initNavigation = function initNavigation() {
  setProgress();
  initChapterObserver();
  initAnchorNavigation();
  window.addEventListener("popstate", () => {
    if (window.location.hash) {
      scrollToAnchor(window.location.hash.slice(1), "auto", true);
    }
    setProgress();
    updateActiveChapterFromScroll();
  });
  window.addEventListener("hashchange", () => {
    if (window.location.hash) {
      scrollToAnchor(window.location.hash.slice(1), "auto");
    }
    setProgress();
    updateActiveChapterFromScroll();
  });
  window.addEventListener("load", () => {
    requestAnimationFrame(() => {
      setProgress();
      if (window.location.hash) {
        scrollToAnchor(window.location.hash.slice(1), "auto");
      }
      updateActiveChapterFromScroll();
    });
  }, { once: true });
  window.addEventListener("scroll", () => {
    setProgress();
    updateActiveChapterFromScroll();
  }, { passive: true });
  window.addEventListener("resize", () => {
    setProgress();
    updateActiveChapterFromScroll();
  });
};
