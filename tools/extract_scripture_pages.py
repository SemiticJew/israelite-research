"""One-time extraction of the existing Biblia/canon hub and book page content into JSON.
Usage: python3 extract_pages.py <repo-root> <out.json>
Reads the pages exactly as they are on main; nothing is invented here."""
import json, sys, re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(sys.argv[1])

class Tree(HTMLParser):
    """Tiny DOM: nodes = {tag, attrs, children, text}."""
    VOID = {'meta', 'link', 'img', 'br', 'hr', 'input', 'source'}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = {'tag': 'root', 'attrs': {}, 'children': []}
        self.stack = [self.root]
    def handle_starttag(self, tag, attrs):
        node = {'tag': tag, 'attrs': dict(attrs), 'children': []}
        self.stack[-1]['children'].append(node)
        if tag not in self.VOID:
            self.stack.append(node)
    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]['tag'] == tag:
                del self.stack[i:]
                return
    def handle_data(self, data):
        self.stack[-1]['children'].append(data)

def parse(path):
    t = Tree(); t.feed(path.read_text(encoding='utf-8')); return t.root

def walk(n):
    yield n
    for c in n.get('children', []):
        if isinstance(c, dict):
            yield from walk(c)

def cls(n): return (n['attrs'].get('class') or '').split()
def find(n, pred): return next((x for x in walk(n) if pred(x)), None)
def find_all(n, pred): return [x for x in walk(n) if pred(x)]
def by_class(n, c): return find(n, lambda x: c in cls(x))
def all_class(n, c): return find_all(n, lambda x: c in cls(x))
def text(n):
    if n is None: return ''
    out = []
    def rec(x):
        for c in x.get('children', []):
            if isinstance(c, str): out.append(c)
            else: rec(c)
    rec(n)
    return re.sub(r'\s+', ' ', ''.join(out)).strip()
def inner_html(n):
    """Keep <sup> in abbreviations (e.g. <sup>1</sup>Sa)."""
    out = []
    for c in n.get('children', []):
        if isinstance(c, str): out.append(re.sub(r'\s+', ' ', c))
        elif c['tag'] == 'sup': out.append(f"<sup>{text(c)}</sup>")
        else: out.append(text(c))
    return ''.join(out).strip()
def meta(root, name):
    m = find(root, lambda x: x['tag'] == 'meta' and x['attrs'].get('name') == name)
    return m['attrs'].get('content', '') if m else ''
def title(root): return text(find(root, lambda x: x['tag'] == 'title'))
def crumbs(root):
    nav = find(root, lambda x: x['tag'] == 'nav' and 'breadcrumbs' in cls(x))
    out = []
    for c in nav['children']:
        if isinstance(c, dict) and c['tag'] == 'a': out.append({'label': text(c), 'href': c['attrs']['href']})
        elif isinstance(c, dict) and 'current' in cls(c): out.append({'label': text(c)})
    return out

data = {'hubs': {}, 'books': {}}

# ---- Biblia hub
r = parse(ROOT / 'biblia.html')
hero = by_class(r, 'biblia-hero'); note = by_class(r, 'hub-note')
data['hubs']['biblia'] = {
    'title': title(r), 'description': meta(r, 'description'), 'crumbs': crumbs(r),
    'kicker': text(by_class(hero, 'biblia-kicker')), 'h1': text(by_class(hero, 'biblia-title')), 'subtitle': text(by_class(hero, 'biblia-subtitle')),
    'note': {'label': text(by_class(note, 'label')), 'h2': text(find(note, lambda x: x['tag'] == 'h2')), 'p': text(find(note, lambda x: x['tag'] == 'p'))},
    'stats': [{'value': text(find(s, lambda x: x['tag'] == 'strong')), 'label': text(find(s, lambda x: x['tag'] == 'span'))} for s in all_class(r, 'hub-stat')],
    'cards': [{'href': find(c, lambda x: x['tag'] == 'a')['attrs']['href'], 'thumb': text(by_class(c, 'thumb')), 'kicker': text(by_class(c, 'kicker')),
               'title': text(by_class(c, 'title')), 'desc': text(by_class(c, 'desc'))} for c in all_class(r, 'card')],
}

# ---- Canon hubs
for canon, page in [('tanakh', 'tanakh.html'), ('newtestament', 'newtestament.html'), ('apocrypha', 'apocrypha.html')]:
    r = parse(ROOT / page)
    hero = by_class(r, 'canon-hero')
    cols = []
    for col in all_class(r, 'pt-col'):
        cards = []
        for a in all_class(col, 'pt-card'):
            group = [c for c in cls(a) if c != 'pt-card'][0]
            cards.append({'href': a['attrs']['href'], 'group': group, 'era': text(by_class(a, 'pt-era')),
                          'abbr': inner_html(by_class(a, 'pt-abbr')), 'name': text(by_class(a, 'pt-name'))})
        cols.append(cards)
    data['hubs'][canon] = {
        'title': title(r), 'description': meta(r, 'description'), 'crumbs': crumbs(r),
        'kicker': text(by_class(hero, 'canon-kicker')), 'h1': text(by_class(hero, 'canon-title')), 'subtitle': text(by_class(hero, 'canon-subtitle')),
        'guide_label': (by_class(r, 'canon-guide') or {'attrs': {}})['attrs'].get('aria-label', ''),
        'guide': [{'count': text(by_class(g, 'count')), 'h2': text(find(g, lambda x: x['tag'] == 'h2')), 'p': text(find(g, lambda x: x['tag'] == 'p'))} for g in all_class(r, 'canon-guide-card')],
        'columns': cols,
    }

# ---- Book pages
for canon in ['tanakh', 'newtestament', 'apocrypha']:
    for f in sorted((ROOT / canon).glob('*.html')):
        if f.name == 'chapter.html': continue
        r = parse(f)
        ident = []
        for card in all_class(r, 'identity-card'):
            ident.append({'label': text(by_class(card, 'identity-label')), 'value': text(by_class(card, 'identity-value'))})
        panel = by_class(r, 'chapter-panel-head')
        data['books'][f'{canon}/{f.stem}'] = {
            'canon': canon, 'slug': f.stem, 'title': title(r), 'description': meta(r, 'description'), 'crumbs': crumbs(r),
            'kicker': text(by_class(r, 'book-kicker')), 'h1': text(by_class(r, 'book-title')), 'subtitle': text(by_class(r, 'book-subtitle')),
            'identity_label': (by_class(r, 'book-identity') or {'attrs': {}})['attrs'].get('aria-label', ''),
            'identity': ident,
            'panel_h2': text(find(panel, lambda x: x['tag'] == 'h2')), 'panel_p': text(find(panel, lambda x: x['tag'] == 'p')),
            'chapter_count_label': text(by_class(r, 'chapter-count')),
        }

Path(sys.argv[2]).write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
print('hubs', len(data['hubs']), 'books', len(data['books']))
