"""Run every regression suite from the repo root:  python3 tests/run_all.py
Serves the repo on a free localhost port (or TP_BASE=<url>), runs headless Chromium via Playwright, exits non-zero on any failure."""
import os, sys, importlib; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from playwright.sync_api import sync_playwright
SUITES=['r14.c','r14.f','r14.neg','r14.hf','r14.n','r14.s','r14.r5','r15']
tp=tf=0
with sync_playwright() as p:
    for m in SUITES:
        ok,bad=importlib.import_module(m).run(p).report(); tp+=ok; tf+=bad
print('TOTAL pass %d  fail %d'%(tp,tf))
sys.exit(1 if tf else 0)
