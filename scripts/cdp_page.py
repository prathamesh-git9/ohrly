"""Small helper to drive one tab of Comet over raw CDP, for dashboard setup work.

    python scripts/cdp_page.py <url-substring> state            visible text, buttons, inputs
    python scripts/cdp_page.py <url-substring> shot <file.png>
    python scripts/cdp_page.py <url-substring> click "<button text>"
    python scripts/cdp_page.py <url-substring> goto <url>
    python scripts/cdp_page.py <url-substring> js "<expression>"
"""
import asyncio
import base64
import json
import sys

import websockets

sys.path.insert(0, __file__.rsplit('\\', 1)[0].rsplit('/', 1)[0])
import gemini_cdp as g  # noqa: E402

STATE = """(() => ({
  url: location.href,
  title: document.title,
  text: document.body.innerText.replace(/\\n{2,}/g, '\\n').slice(0, 1800),
  buttons: [...document.querySelectorAll('button, a[role=button], a')].map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(t => t && t.length < 60).slice(0, 60),
  inputs: [...document.querySelectorAll('input, textarea, select')].map(i => ({ name: i.name || i.id || i.getAttribute('aria-label') || i.placeholder, type: i.type, value: i.type === 'password' ? '***' : (i.value || '').slice(0, 60) })).slice(0, 30),
}))()"""


async def main():
    match, action = sys.argv[1], sys.argv[2]
    tabs = [t for t in g.http('/json/list') if t.get('type') == 'page' and match in t.get('url', '')]
    if not tabs:
        raise SystemExit(f'no tab matching {match!r}')
    async with websockets.connect(tabs[0]['webSocketDebuggerUrl'], max_size=None, ping_interval=None) as ws:
        tab = g.Tab(ws)
        await tab.call('Page.enable')
        if action == 'state':
            print(json.dumps(await tab.js(STATE), ensure_ascii=False, indent=1))
        elif action == 'shot':
            r = await tab.call('Page.captureScreenshot', format='png')
            open(sys.argv[3], 'wb').write(base64.b64decode(r['data']))
            print('saved')
        elif action == 'goto':
            await tab.call('Page.navigate', url=sys.argv[3])
            await asyncio.sleep(6)
            print(await tab.js('location.href'))
        elif action == 'js':
            print(json.dumps(await tab.js(sys.argv[3]), ensure_ascii=False, indent=1))
        elif action == 'click':
            label = sys.argv[3]
            r = await tab.js(f"""(() => {{ const want = {json.dumps(label)};
              const el = [...document.querySelectorAll('button, a, [role=button], [role=menuitem], [role=option], label')]
                .find(b => (b.innerText || b.getAttribute('aria-label') || '').trim() === want)
                || [...document.querySelectorAll('button, a, [role=button], [role=menuitem], [role=option]')]
                .find(b => (b.innerText || '').trim().startsWith(want));
              if (!el) return null; el.scrollIntoView({{ block: 'center' }}); const r = el.getBoundingClientRect();
              return {{ x: r.x + r.width / 2, y: r.y + r.height / 2, t: (el.innerText || '').trim().slice(0, 40) }}; }})()""")
            if not r:
                raise SystemExit(f'nothing labelled {label!r}')
            await g.click(tab, r['x'], r['y'])
            await asyncio.sleep(4)
            print('clicked', r['t'], '->', await tab.js('location.href'))


asyncio.run(main())
