// /israelite-research/js/metadata.js
(function () {
  var doc = document, head = doc.head;
  var html = doc.documentElement;
  var ds = html ? html.dataset : {};

  var title   = ds.title   || doc.title || '';
  var desc    = ds.desc    || '';
  var img     = ds.img     || '';
  var url     = ds.url     || (location && location.href) || '';
  var site    = ds.site    || 'Semitic Jew';
  var twSite  = ds.twSite  || '@semitic_jew';
  var twCreator = ds.twCreator || '@semitic_jew';

  function ensureMetaAttr(attr, key, val) {
    if (!val) return;
    var sel = attr + '="' + key + '"';
    var node = head.querySelector('meta[' + sel + ']');
    if (!node) {
      node = doc.createElement('meta');
      node.setAttribute(attr, key);
      head.appendChild(node);
    }
    node.setAttribute('content', val);
  }

  function ensureTitle(t) {
    if (!t) return;
    if (!doc.title) doc.title = t;
    else if (doc.title !== t) doc.title = t;
  }

  ensureTitle(title);

  // Open Graph
  ensureMetaAttr('property', 'og:title', title);
  ensureMetaAttr('property', 'og:description', desc);
  ensureMetaAttr('property', 'og:image', img);
  ensureMetaAttr('property', 'og:type', 'article');
  ensureMetaAttr('property', 'og:url', url);
  ensureMetaAttr('property', 'og:site_name', site);

  // Twitter
  ensureMetaAttr('name', 'twitter:card', 'summary_large_image');
  ensureMetaAttr('name', 'twitter:title', title);
  ensureMetaAttr('name', 'twitter:description', desc);
  ensureMetaAttr('name', 'twitter:image', img);
  ensureMetaAttr('name', 'twitter:site', twSite);
  ensureMetaAttr('name', 'twitter:creator', twCreator);
})();
