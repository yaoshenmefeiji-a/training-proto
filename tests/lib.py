"""Shared harness: serves the repo root on a free localhost port and gives each suite a fresh page.
Run everything from the repo root:  python3 tests/run_all.py   (needs: pip install playwright && playwright install chromium)"""
import os, sys, json, socket, threading, functools, http.server, contextlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

_srv = None
def base():
    """Start (once) a static server on the repo root; return its URL. TP_BASE overrides (e.g. a deployed Pages URL)."""
    global _srv
    if os.environ.get('TP_BASE'): return os.environ['TP_BASE'].rstrip('/')
    if _srv is None:
        h = functools.partial(_Quiet, directory=ROOT)
        _srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), h)
        threading.Thread(target=_srv.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d' % _srv.server_address[1]

class Suite:
    def __init__(self, name): self.name, self.ok, self.bad = name, 0, []
    def check(self, label, cond, detail=''):
        if cond: self.ok += 1
        else: self.bad.append(label + (('  :: ' + str(detail)) if detail != '' else ''))
        return cond
    def report(self):
        print('[%s] pass %d  fail %d' % (self.name, self.ok, len(self.bad)))
        for b in self.bad: print('   FAIL', b)
        return self.ok, len(self.bad)

@contextlib.contextmanager
def page(p, hash_='', clear=True, viewport=None):
    b = p.chromium.launch()
    pg = b.new_page(viewport=viewport or {'width': 1280, 'height': 900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(base() + '/index.html' + hash_); pg.wait_for_timeout(300)
    if clear:
        pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(300)
    pg.errs = errs
    try: yield pg
    finally: b.close()
