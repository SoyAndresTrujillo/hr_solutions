/**
 * Open ANY detail route and read it the way the app renders it: every label/value pair
 * grouped by its nearest preceding heading, every table, and the page's verbatim text.
 *
 * One flow rather than one per module on purpose: an employee page, a leave request and a
 * payslip are usually the same label/value component plus tables, so a per-module copy
 * would be N copies of one DOM walk. Give it the route; module knowledge stays in the caller.
 *
 * Pairs read out of the box: <dt>/<dd> and two-cell <tr><th>label</th><td>value</td></tr>.
 * The app uses its own component? Pass `pair` / `label` / `value` CSS selectors
 * (e.g. { pair: '.detail-item', label: '.detail-label', value: '.detail-value' }).
 *
 * Traps this flow absorbs:
 *  - Headings are often FLAT SIBLINGS of their rows, not parents, so a heading has no subtree
 *    to query. Rows are attributed to the nearest PRECEDING heading in document order.
 *  - `innerText` returns CSS-transformed text (text-transform: capitalize/uppercase), so an
 *    exact lookup against the i18n string misses silently. `detail()` compares case-insensitively.
 *  - A row rendered EMPTY is '' (or '-'); a row not rendered at all is ABSENT. That difference
 *    is the whole point of a field-visibility check, so `detail()` returns null only for absent.
 *  - Expandable table rows keep their content out of the DOM until opened. Pass `expand`
 *    (a selector for the collapsed toggles) to click them all first.
 *
 * Performs and returns; asserts nothing.
 */
export const module = 'shared';
export const action = 'read a detail page (sections, tables, text)';
export const needs = ['route']; // web route, e.g. `/employees/42`
export const creates = null;

export async function run(s, d) {
  await s.goto(d.route);
  await s.page.waitForTimeout(d.settle ?? 1500);

  if (d.expand) {
    const toggles = s.page.locator(d.expand);
    for (let i = (await toggles.count()) - 1; i >= 0; i--) {
      await toggles.nth(i).click({ timeout: 5000 }).catch(() => {});
      await s.page.waitForTimeout(300);
    }
  }

  const read = await s.page.evaluate((o) => {
    const txt = (el) => (el?.innerText ?? '').trim();
    const sections = { '(no heading)': {} };
    let current = '(no heading)';
    const put = (label, value) => {
      if (label && !(label in sections[current])) sections[current][label] = value;
    };
    const custom = o.pair ? `, ${o.pair}` : '';
    for (const el of document.querySelectorAll(`h1, h2, h3, h4, dt, tr${custom}`)) {
      if (/^H[1-4]$/.test(el.tagName)) {
        current = txt(el) || '(no heading)';
        sections[current] = sections[current] || {};
      } else if (o.pair && el.matches(o.pair)) {
        put(txt(el.querySelector(o.label)), txt(el.querySelector(o.value)));
      } else if (el.tagName === 'DT') {
        const values = [];
        for (let n = el.nextElementSibling; n && n.tagName === 'DD'; n = n.nextElementSibling) values.push(txt(n));
        put(txt(el), values.join('\n'));
      } else if (el.tagName === 'TR' && el.children.length === 2 && el.children[0].tagName === 'TH' && el.children[1].tagName === 'TD') {
        put(txt(el.children[0]), txt(el.children[1]));
      }
    }
    const tables = [...document.querySelectorAll('table')].map((t) => ({
      headers: [...t.querySelectorAll('thead th')].map(txt),
      rows: [...t.querySelectorAll('tbody tr')].map((r) => [...r.querySelectorAll('td')].map(txt)),
    }));
    return { sections, tables, text: txt(document.querySelector('main') || document.body) };
  }, { pair: d.pair || null, label: d.label || null, value: d.value || null });

  const flat = Object.assign({}, ...Object.values(read.sections));
  const headers = read.tables.flatMap((t) => t.headers);

  return {
    url: s.page.url(),
    /** `{ '<heading>': { '<label>': '<verbatim value>' } }` */
    sections: read.sections,
    sectionTitles: Object.keys(read.sections),
    /** Every label/value pair, headings collapsed away. */
    flat,
    /** `[{headers, rows}]` — every table on the page, in document order. */
    tables: read.tables,
    /** Every column header on the page, flattened. */
    tableHeaders: headers,
    /** Verbatim rendered text of the main content area. */
    text: read.text,
    /** `null` = the row was NOT rendered (≠ rendered empty, which is ''). */
    detail(label) {
      const key = String(label).trim().toLowerCase();
      const k = Object.keys(flat).find((x) => x.trim().toLowerCase() === key);
      return k === undefined ? null : flat[k];
    },
    /** Case-insensitive: does any label OR column header contain `fragment`? */
    mentions(fragment) {
      const f = String(fragment).toLowerCase();
      return [...Object.keys(flat), ...headers].some((l) => l.toLowerCase().includes(f));
    },
    /** Every label/header containing `fragment` — names the offender on a miss. */
    matching(fragment) {
      const f = String(fragment).toLowerCase();
      return [...Object.keys(flat), ...headers].filter((l) => l.toLowerCase().includes(f));
    },
  };
}
