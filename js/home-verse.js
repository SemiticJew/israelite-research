(() => {
  "use strict";

  const SITE_ORIGIN = "https://semiticjew.org";
  const MAX_X_DRAFT_LENGTH = 280;
  const X_URL_LENGTH = 23;

  const referenceNode = document.getElementById("daily-reference");
  const verseNode = document.getElementById("daily-verse");
  const shareRoot = document.querySelector("[data-verse-share]");

  if (!referenceNode || !verseNode || !shareRoot) return;

  const toggle = shareRoot.querySelector(".verse-share-toggle");
  const actions = shareRoot.querySelector(".verse-share-actions");
  const xLink = shareRoot.querySelector("[data-share-x]");
  const facebookLink = shareRoot.querySelector("[data-share-facebook]");
  const nativeButton = shareRoot.querySelector("[data-share-native]");
  const downloadLink = shareRoot.querySelector("[data-share-download]");
  const statusNode = shareRoot.querySelector("[data-share-status]");

  let currentVerse = null;

  function titleFromSlug(slug) {
    return String(slug || "")
      .split("-")
      .filter(Boolean)
      .map(part => part.length <= 2
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function verseSlug(item) {
    return `${item.book}-${item.chapter}-${item.verse}`;
  }

  function permanentUrl(item) {
    return `${SITE_ORIGIN}/v/${verseSlug(item)}/`;
  }

  function cardPath(item) {
    return `/images/verse-cards/${verseSlug(item)}.png`;
  }

  function newYorkDayNumber(date = new Date()) {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
    const [year, month, dayOfMonth] = day.split("-").map(Number);
    return Math.floor(Date.UTC(year, month - 1, dayOfMonth) / 86400000);
  }

  function shortenAtWord(text, maxLength) {
    const clean = String(text || "").trim().replace(/\s+/g, " ");
    if (clean.length <= maxLength) return clean;
    const clipped = clean.slice(0, Math.max(0, maxLength - 1));
    const lastSpace = clipped.lastIndexOf(" ");
    return `${clipped.slice(0, lastSpace > maxLength * 0.65 ? lastSpace : clipped.length).trimEnd()}…`;
  }

  function xDraft(text, reference) {
    const suffix = `” — ${reference}`;
    const availableText = MAX_X_DRAFT_LENGTH - X_URL_LENGTH - 1 - suffix.length - 1;
    return `“${shortenAtWord(text, availableText)}${suffix}`;
  }

  function setStatus(message) {
    statusNode.textContent = message;
  }

  async function copyPermanentLink(url) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }
    const field = document.createElement("textarea");
    field.value = url;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Copy was not available");
  }

  function updateShareTargets(item) {
    const url = permanentUrl(item);
    const draft = xDraft(item.text, item.reference);

    xLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(draft)}&url=${encodeURIComponent(url)}`;
    facebookLink.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    downloadLink.href = cardPath(item);
    downloadLink.download = `${verseSlug(item)}-semitic-jew.png`;
    nativeButton.textContent = navigator.share ? "Share on this device" : "Copy permanent link";
  }

  async function loadVerse() {
    const configResponse = await fetch("/data/verse-of-the-day.json", { cache: "no-cache" });
    if (!configResponse.ok) throw new Error("Verse schedule unavailable");
    const config = await configResponse.json();
    const choices = Array.isArray(config.verses) ? config.verses : [];
    if (!choices.length) throw new Error("Verse schedule is empty");

    const selected = choices[Math.abs(newYorkDayNumber()) % choices.length];
    const chapterResponse = await fetch(
      `/data/${encodeURIComponent(selected.canon)}/${encodeURIComponent(selected.book)}/${encodeURIComponent(selected.chapter)}.json`,
      { cache: "force-cache" }
    );
    if (!chapterResponse.ok) throw new Error("Verse text unavailable");
    const chapter = await chapterResponse.json();
    const verse = chapter.verses?.find(item => Number(item.v) === Number(selected.verse));
    if (!verse?.t) throw new Error("Verse not found");

    currentVerse = {
      ...selected,
      reference: `${titleFromSlug(selected.book)} ${selected.chapter}:${selected.verse}`,
      text: String(verse.t).trim().replace(/\s+/g, " ")
    };

    referenceNode.textContent = currentVerse.reference;
    verseNode.textContent = currentVerse.text;
    updateShareTargets(currentVerse);
  }

  toggle.addEventListener("click", () => {
    const opening = actions.hidden;
    actions.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
    if (opening) xLink.focus();
  });

  nativeButton.addEventListener("click", async () => {
    if (!currentVerse) return;
    const url = permanentUrl(currentVerse);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${currentVerse.reference} | Semitic Jew`,
          text: `“${currentVerse.text}” — ${currentVerse.reference}`,
          url
        });
        setStatus("Verse shared.");
        return;
      }
      await copyPermanentLink(url);
      setStatus("Permanent verse link copied.");
    } catch (error) {
      if (error?.name === "AbortError") return;
      try {
        await copyPermanentLink(url);
        setStatus("Sharing was unavailable, so the permanent link was copied.");
      } catch {
        setStatus("Unable to share automatically. Open the permanent verse link and copy it from your browser.");
      }
    }
  });

  loadVerse().catch(error => {
    console.warn("Verse of the Day could not be updated.", error);
    const fallback = {
      canon: "tanakh",
      book: "proverbs",
      chapter: 25,
      verse: 2,
      reference: referenceNode.textContent.trim(),
      text: verseNode.textContent.trim()
    };
    currentVerse = fallback;
    updateShareTargets(fallback);
  });
})();
