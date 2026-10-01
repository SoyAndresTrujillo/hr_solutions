#!/usr/bin/env node
// Local markdown ticket tracker. Tickets live in <ticketsDir>/<ID>.md with flat frontmatter,
// attachments in <ticketsDir>/<ID>/attachments/. Every pipeline talks to tickets through this file.
//
//   new --type <t> --title "<t>" [--parent <ID>] [--blocks <ID>]   create, prints the new ID
//   show <ID>                                                        print the ticket
//   ingest <ID> <outDir>                                             copy ticket + attachments into a docs folder
//   list <PARENT>                                                    children (parent: or blocked_by:) split pending / handled
//   status <ID>                                                      print status + title
//   transition <ID> --to "<STATUS>"                                  set status (validated against config)
//   comment <ID> <file.md> [--attach <file> ...]                     append a dated comment, copy attachments
//   estimate <ID> <points>                                           set points (validated against estimateScale)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.mjs';

const { root, config } = loadConfig();
const dir = path.join(root, config.ticketsDir);
const today = () => new Date().toISOString().slice(0, 10);
const fail = (msg) => { console.error(msg); process.exit(1); };

function file(id) { return path.join(dir, `${id}.md`); }

function read(id) {
  if (!fs.existsSync(file(id))) fail(`Ticket not found: ${file(id)}`);
  const text = fs.readFileSync(file(id), 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) fail(`${id}: missing frontmatter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2] };
}

function write(id, { meta, body }) {
  const front = Object.entries(meta).map(([k, v]) => `${k}: ${v ?? ''}`.trimEnd()).join('\n');
  fs.writeFileSync(file(id), `---\n${front}\n---\n${body}`);
}

const list = (v) => (v || '').split(',').map((s) => s.trim()).filter(Boolean);

function flag(args, name) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
}

function nextId() {
  fs.mkdirSync(dir, { recursive: true });
  const rx = new RegExp(`^${config.ticketPrefix}-(\\d+)\\.md$`);
  const nums = fs.readdirSync(dir).map((f) => f.match(rx)).filter(Boolean).map((m) => Number(m[1]));
  return `${config.ticketPrefix}-${nums.length ? Math.max(...nums) + 1 : 1}`;
}

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'new': {
    const type = flag(args, 'type') || 'task';
    const title = flag(args, 'title') || fail('--title required');
    const id = nextId();
    const meta = { id, title, type, parent: flag(args, 'parent') || '', status: config.statuses[0], points: '', blocked_by: '', created: today() };
    write(id, { meta, body: '\n## Description\n\n## Acceptance criteria\n\n## Attachments\n\n## Comments\n' });
    const blocks = flag(args, 'blocks');
    if (blocks) {
      const t = read(blocks);
      t.meta.blocked_by = [...list(t.meta.blocked_by), id].join(', ');
      write(blocks, t);
    }
    console.log(id);
    break;
  }
  case 'show': {
    process.stdout.write(fs.readFileSync(file(args[0]) , 'utf8'));
    break;
  }
  case 'ingest': {
    const [id, out] = args;
    if (!out) fail('usage: ingest <ID> <outDir>');
    read(id);
    fs.mkdirSync(out, { recursive: true });
    fs.copyFileSync(file(id), path.join(out, 'ticket.md'));
    const att = path.join(dir, id, 'attachments');
    let n = 0;
    if (fs.existsSync(att)) {
      fs.mkdirSync(path.join(out, 'images'), { recursive: true });
      for (const f of fs.readdirSync(att)) { fs.copyFileSync(path.join(att, f), path.join(out, 'images', f)); n++; }
    }
    console.log(`Saved: ${path.join(out, 'ticket.md')} (${n} attachment(s))`);
    break;
  }
  case 'list': {
    const parent = args[0] || fail('usage: list <PARENT>');
    const linked = new Set(list(read(parent).meta.blocked_by));
    const kids = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
      .filter((id) => id !== parent).map((id) => ({ id, ...read(id).meta }))
      .filter((t) => t.parent === parent || linked.has(t.id));
    for (const group of ['pending', 'handled']) {
      const rows = kids.filter((t) => config.doneStatuses.includes(t.status) === (group === 'handled'));
      console.log(`${group.toUpperCase()} (${rows.length})`);
      for (const t of rows) console.log(`  ${t.id}\t${t.type}\t${t.status}\t${t.title}`);
    }
    break;
  }
  case 'status': {
    const { meta } = read(args[0]);
    console.log(`${meta.id}\t${meta.status}\t${meta.title}`);
    break;
  }
  case 'transition': {
    const to = flag(args, 'to');
    if (!config.statuses.includes(to)) fail(`Unknown status "${to}". Allowed: ${config.statuses.join(' | ')}`);
    const t = read(args[0]);
    const from = t.meta.status;
    t.meta.status = to;
    write(args[0], t);
    console.log(`${args[0]}: ${from} -> ${to}`);
    break;
  }
  case 'comment': {
    const [id, src] = args;
    if (!src) fail('usage: comment <ID> <file.md> [--attach <file> ...]');
    const t = read(id);
    const attach = [];
    for (let i = args.indexOf('--attach') + 1; i > 0 && i < args.length && !args[i].startsWith('--'); i++) attach.push(args[i]);
    const links = attach.map((f) => {
      const dest = path.join(dir, id, 'attachments');
      fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(f, path.join(dest, path.basename(f)));
      return `- [${path.basename(f)}](${id}/attachments/${path.basename(f)})`;
    });
    const body = fs.readFileSync(src, 'utf8').trim();
    t.body = `${t.body.trimEnd()}\n\n### ${today()}\n${body}\n${links.length ? `\nAttachments:\n${links.join('\n')}\n` : ''}`;
    write(id, t);
    console.log(`${id}: comment added (${links.length} attachment(s))`);
    break;
  }
  case 'estimate': {
    const [id, pts] = args;
    if (!config.estimateScale.includes(Number(pts))) fail(`Points must be one of ${config.estimateScale.join(', ')}`);
    const t = read(id);
    t.meta.points = pts;
    write(id, t);
    console.log(`${id}: points = ${pts}`);
    break;
  }
  default:
    fail('usage: ticket.mjs new|show|ingest|list|status|transition|comment|estimate ... (see header)');
}
