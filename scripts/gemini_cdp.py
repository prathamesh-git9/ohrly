"""Talks to one Gemini tab in Comet over raw CDP. Start Comet with --remote-debugging-port=9222."""
import asyncio
import json
import time
import urllib.parse
import urllib.request

import websockets

BASE = 'http://127.0.0.1:9222'
# The signed-in Google account with the paid Gemini plan, by its position in Comet.
APP_URL = 'https://gemini.google.com/u/3/app'
REPLIES = "document.querySelectorAll('model-response')"
# A reply may be a code block: take its text whole, since a long block can sit outside innerText.
REPLY_TEXT = """((el) => { if (!el) return '';
  const code = [...el.querySelectorAll('code')].map(c => c.textContent).filter(t => t.trim().startsWith('{') || t.length > 400);
  return code.length ? code.join('\\n') : (el.innerText || el.textContent || ''); })"""
STOP = "document.querySelector('button[aria-label*=\"Stop\" i], mat-icon[fonticon=\"stop\"]')"


def http(path, method='GET'):
    req = urllib.request.Request(BASE + path, method=method)
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode('utf8'))


def tab_target(new):
    if not new:
        for t in http('/json/list'):
            if t.get('type') == 'page' and 'gemini.google.com' in t.get('url', ''):
                return t
    return http('/json/new?' + urllib.parse.quote(APP_URL, safe=''), 'PUT')


class Tab:
    def __init__(self, ws):
        self.ws = ws
        self.n = 0

    async def call(self, method, **params):
        self.n += 1
        mine = self.n
        await self.ws.send(json.dumps({'id': mine, 'method': method, 'params': params}))
        while True:
            msg = json.loads(await self.ws.recv())
            if msg.get('id') == mine:
                if 'error' in msg:
                    raise RuntimeError(msg['error'])
                return msg.get('result', {})

    async def js(self, code):
        r = await self.call('Runtime.evaluate', expression=code, returnByValue=True, awaitPromise=True)
        if 'exceptionDetails' in r:
            raise RuntimeError(r['exceptionDetails'])
        return r.get('result', {}).get('value')


SWITCH = """([...document.querySelectorAll('button')].find(x => { const t = (x.innerText || '').trim(); return t.length < 30 && /^(Gemini|Auto|Fast|Pro|Thinking|Flash|Argon)/.test(t); }) || null)"""
ITEMS = "[role=menuitem],[role=menuitemradio],[role=option],.mat-mdc-menu-item"


async def click(tab, x, y):
    await tab.call('Input.dispatchMouseEvent', type='mouseMoved', x=x, y=y)
    for kind in ('mousePressed', 'mouseReleased'):
        await tab.call('Input.dispatchMouseEvent', type=kind, x=x, y=y, button='left', clickCount=1)


async def open_menu(tab):
    r = await tab.js(f"""(() => {{ const b = {SWITCH}; if (!b) return null; const r = b.getBoundingClientRect();
      return {{ t: b.innerText.replace(/\\s+/g, ' ').trim(), x: r.x + r.width / 2, y: r.y + r.height / 2 }}; }})()""")
    if not r:
        raise RuntimeError('model switch not found')
    await click(tab, r['x'], r['y'])
    await asyncio.sleep(1.2)
    return r['t']


async def pick(tab, label):
    r = await tab.js(f"""(() => {{ const e = [...document.querySelectorAll('{ITEMS}')].find(x => x.innerText.replace(/\s+/g, ' ').includes({json.dumps(label)}));
      if (!e) return null; const r = e.getBoundingClientRect();
      return {{ t: e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 50), x: r.x + r.width / 2, y: r.y + r.height / 2 }}; }})()""")
    if not r:
        return None
    await click(tab, r['x'], r['y'])
    await asyncio.sleep(1.2)
    return r['t']


async def menu_items(tab):
    return await tab.js(f"""[...document.querySelectorAll('{ITEMS}')].map(e => e.innerText.replace(/\\s+/g, ' ').trim().slice(0, 60))""")


async def select_model(tab, model='3.1 Pro', thinking='High'):
    chosen = level = None
    for _ in range(4):  # The menu sometimes needs a moment after the page settles.
        await open_menu(tab)
        if await menu_items(tab):
            chosen = await pick(tab, model)
            if not await menu_items(tab):  # Choosing a model can close the menu.
                await open_menu(tab)
            level = await pick(tab, thinking)
            break
        await asyncio.sleep(2)
    await tab.call('Input.dispatchKeyEvent', type='keyDown', key='Escape', code='Escape', windowsVirtualKeyCode=27)
    await tab.call('Input.dispatchKeyEvent', type='keyUp', key='Escape', code='Escape', windowsVirtualKeyCode=27)
    await asyncio.sleep(1)
    shown = await tab.js(f"({SWITCH})?.innerText.replace(/\\s+/g, ' ').trim()")
    print(f'model: chose {chosen!r}, thinking {level!r}, switch shows {shown!r}', flush=True)
    # The switch shows a short name, such as Pro for 3.1 Pro. Showing it is what counts.
    if model.split()[-1] not in (shown or ''):
        raise RuntimeError(f'could not select {model}: switch shows {shown!r}')


async def ask(prompt, new=False, timeout=1500):
    """Sends a prompt and returns the reply text once it has stopped changing."""
    # One tab throughout: a background tab may never finish loading. A new chat is a fresh navigation.
    target = tab_target(False)
    async with websockets.connect(target['webSocketDebuggerUrl'], max_size=None, ping_interval=None) as ws:
        tab = Tab(ws)
        await tab.call('Page.enable')
        await tab.call('Page.bringToFront')
        if new:
            await tab.call('Page.navigate', url=APP_URL)
            await asyncio.sleep(3)
        for _ in range(60):
            if await tab.js(f"!!document.querySelector('rich-textarea .ql-editor') && !!({SWITCH})"):
                break
            await asyncio.sleep(1)
        else:
            raise RuntimeError('Gemini did not finish loading')
        await asyncio.sleep(1)
        if new:
            await select_model(tab)
        before = await tab.js(f'{REPLIES}.length')
        focused = await tab.js(
            "(() => { const e = document.querySelector('rich-textarea .ql-editor');"
            " if (!e) return false; e.focus(); return true; })()"
        )
        if not focused:
            raise RuntimeError('no editor on the page')
        # insertText behaves like real typing, so the page's framework sees it.
        await tab.call('Input.insertText', text=prompt)
        await asyncio.sleep(2)
        sent = await tab.js(
            "(() => { const b = document.querySelector('button.send-button, button[aria-label*=\"Send\" i]');"
            " if (!b || b.disabled) return false; b.click(); return true; })()"
        )
        if not sent:
            raise RuntimeError('send button not available')
        start = time.time()
        last, stable = '', 0
        while time.time() - start < timeout:
            await asyncio.sleep(5)
            state = await tab.js(
                f"(() => {{ const r = {REPLIES}; const n = r.length;"
                f" return {{ n, text: n ? {REPLY_TEXT}(r[n-1]) : '', busy: !!{STOP} }}; }})()"
            )
            if state['n'] <= before:
                continue
            stable = stable + 1 if state['text'] == last and not state['busy'] else 0
            last = state['text']
            if stable >= 3 and last:
                return last
        raise RuntimeError('timed out waiting for the reply')


async def current_reply():
    """Reads the last finished reply on the page, without sending anything."""
    target = tab_target(False)
    async with websockets.connect(target['webSocketDebuggerUrl'], max_size=None, ping_interval=None) as ws:
        tab = Tab(ws)
        return await tab.js(f"(() => {{ const r = {REPLIES}; return r.length ? {REPLY_TEXT}(r[r.length - 1]) : ''; }})()")


async def page_info():
    target = tab_target(False)
    async with websockets.connect(target['webSocketDebuggerUrl'], max_size=None, ping_interval=None) as ws:
        tab = Tab(ws)
        await tab.call('Page.enable')
        await tab.call('Page.navigate', url=APP_URL)
        await asyncio.sleep(8)
        await tab.call('Page.bringToFront')
        was = await open_menu(tab)
        items = await menu_items(tab)
        return {'url': await tab.js('location.pathname'), 'switch': was, 'menu': items}


if __name__ == '__main__':
    print(json.dumps(asyncio.run(page_info()), ensure_ascii=False, indent=1))
