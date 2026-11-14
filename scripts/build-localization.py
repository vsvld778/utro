"""Build Russian page snapshots without modifying the English source or image bytes."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape, unescape
from urllib.parse import urlsplit, urlunsplit, unquote
import json, re

ROOT = Path(__file__).resolve().parents[1]
base = json.loads((ROOT / 'reference/pages.json').read_text())
translations = {}
for name in ('commerce', 'content', 'policies'):
    file = ROOT / f'reference/i18n/{name}-ru.json'
    if file.exists(): translations.update(json.loads(file.read_text()))
translations.update({'4.8':'4,8','4.7':'4,7','170,000+':'170 000+','15 Days Subscription': 'Доставка каждые 15 дней', '30 Days Subscription': 'Доставка каждый месяц'})
translations.update({'Announcement / верхняя строка':'Строка акций','Header / меню':'Меню и шапка','Global / общие элементы':'Общие элементы','Footer / подвал':'Подвал сайта','Drink tonight, feel great tomorrow.':'Яркий вечер, лёгкое утро.','UNDO Gummies® Pre‑Alcohol Support':'Жевательный мармелад UTRO'})
context_file = ROOT / 'reference/i18n/context-ru.json'
context = json.loads(context_file.read_text()) if context_file.exists() else {}

def ruble_text(value):
    # Preserve numeric amounts; the owner sets Russian retail prices in the CMS.
    value = re.sub(r'\$\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*USD\b)?', lambda m: m[1].replace(',', ' ').replace('.', ',') + '\u00a0₽', value)
    return re.sub(r'(\d+(?:[.,]\d{1,2})?)\s*USD\b', lambda m: m[1].replace('.', ',') + '\u00a0₽', value)

def brand_text(value):
    # Match the browser normalizer. URLs, contacts, asset paths and identifiers
    # retain their original values; only the separately displayed brand changes.
    protected = re.compile(r'(?:https?://|www\.)[^\s<>"\']+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|/[^\s<>"\']+', re.I)
    parts, end = [], 0
    for match in protected.finditer(value):
        parts.extend((re.sub(r'(?<![\w])undo(?![\w])', 'UTRO', value[end:match.start()], flags=re.I), match[0]))
        end = match.end()
    return ''.join(parts) + re.sub(r'(?<![\w])undo(?![\w])', 'UTRO', value[end:], flags=re.I)

def translated(value):
    text = value.strip()
    if text in translations:
        value = value[:len(value)-len(value.lstrip())] + translations[text] + value[len(value.rstrip()):]
    return ruble_text(brand_text(value))

def english_link(href):
    if not href.startswith('/') or href.startswith('//'): return href
    parts = urlsplit(href)
    path = parts.path
    is_page = path in base or any(unquote(p) == unquote(path) for p in base)
    if not is_page and path not in ('/account', '/cart', '/checkout'): return href
    return urlunsplit(('', '', '/en' + (path if path != '/' else '/'), parts.query, parts.fragment))

class Localizer(HTMLParser):
    def __init__(self, russian):
        super().__init__(convert_charrefs=True)
        self.russian = russian
        self.out = []
        self.raw = 0
        self.json_script = False
    def handle_starttag(self, tag, attrs):
        raw = self.get_starttag_text()
        def replace(m):
            name, quote, value = m.group(1), m.group(2), unescape(m.group(3))
            if self.russian and name.lower() in ('alt','placeholder','aria-label','title','data-custom-title'):
                value = translated(value)
            elif not self.russian and name.lower() == 'href': value = english_link(value)
            else: return m.group(0)
            return name + '=' + quote + escape(value, quote=True) + quote
        raw = re.sub(r'([\w:-]+)\s*=\s*([\"\'])(.*?)\2', replace, raw, flags=re.S)
        self.out.append(raw)
        if tag in ('script','style'):
            self.raw += 1
            self.json_script = tag == 'script' and dict(attrs).get('type') == 'application/json'
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
    def handle_endtag(self, tag):
        self.out.append('</' + tag + '>')
        if tag in ('script','style'):
            self.raw = max(0, self.raw-1)
            self.json_script = False
    def handle_data(self, data):
        if self.raw:
            if self.json_script:
                def walk(x, key=None):
                    if isinstance(x, dict): return {k:walk(v,k) for k,v in x.items()}
                    if isinstance(x, list): return [walk(v,key) for v in x]
                    if isinstance(x, str):
                        if not self.russian: return english_link(x)
                        # Runtime objects also contain product handles and other
                        # identifiers: only labels and known copy are translated.
                        if key in ('title','description','name','alt','featuredImageAlt','overrideImageAlt') or x.strip() in translations:
                            return translated(x)
                        return x
                    return x
                try: data = json.dumps(walk(json.loads(data)), ensure_ascii=False).replace('<','\\u003c')
                except json.JSONDecodeError: pass
            self.out.append(data)
        else: self.out.append(escape(translated(data) if self.russian else data, quote=False))
    def handle_comment(self, data): self.out.append('<!--' + data + '-->')
    def handle_decl(self, data): self.out.append('<!' + data + '>')

result = {}
for path, page in base.items():
    for locale in ('ru', 'en'):
        copy = json.loads(json.dumps(page))
        parser = Localizer(locale == 'ru'); parser.feed(page['body']); parser.close()
        copy['body'] = ''.join(parser.out)
        copy['title'] = translated(page['title']) if locale == 'ru' else page['title']
        copy['locale'] = locale
        copy['canonicalPath'] = path
        for field in copy['fields']:
            if locale == 'ru': field['label'] = translated(field['label'])
            if locale == 'ru' and 'alt' in field: field['alt'] = translated(field['alt'])
            if locale == 'ru' and field['kind'] == 'text':
                field['value'] = translated(field['value'])
            if locale == 'en' and field['kind'] == 'link': field['value'] = english_link(field['value'])
        if locale == 'ru':
            for index, section in enumerate(copy['sections']):
                label = translated(section['label'])
                if label.startswith('custom_section_'): label = f'Контентный блок {index}'
                elif label.startswith('scrolling_text'): label = 'Бегущая строка'
                section['label'] = label
            for field_id, text in context.get(path, {}).items():
                text = brand_text(text)
                for field in copy['fields']:
                    if field['id'] == field_id: field['value'] = text
                pattern = r'(<([a-zA-Z0-9]+)\b[^>]*\bdata-cms-text="' + re.escape(field_id) + r'"[^>]*>)[\s\S]*?(</\2>)'
                copy['body'] = re.sub(pattern, lambda m:m.group(1)+escape(text,quote=False)+m.group(3), copy['body'])
        result[path if locale == 'ru' else '/en' + (path if path != '/' else '/')] = copy
(ROOT / 'reference/localized-pages.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',',':')))
print(f'Built {len(result)} page snapshots; {len(translations)} translated phrases.')
