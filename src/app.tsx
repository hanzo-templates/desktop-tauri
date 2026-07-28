import { useEffect, useState } from "react";
import { Win, NavItem } from "./shell";
import { isNative } from "./native";
import { call } from "./web";
import { base, push, pull } from "./base";

const RELEASES = "https://github.com/hanzo-templates/desktop-tauri/releases/latest";

type Env = { os: string; arch: string; family: string; cores: number; tauri: string };
type Note = { id?: string; title: string; body: string };

const PANES = ["Overview", "Commands", "Backend", "Shipping"] as const;
type Pane = (typeof PANES)[number];

export default function App() {
  const [pane, setPane] = useState<Pane>("Overview");
  const [env, setEnv] = useState<Env | null>(null);
  const [status, setStatus] = useState("starting");

  useEffect(() => {
    call("app_env").then((e) => {
      setEnv(e);
      setStatus(`${e.os}/${e.arch} · ${e.cores} cores`);
    });
  }, []);

  return (
    <Win
      title="Hanzo Desktop"
      sub="starter"
      releases={RELEASES}
      status={<><span>{status}</span><span className="grow" /><span>tauri {env?.tauri ?? "—"}</span></>}
      side={
        <>
          <h2>Template</h2>
          <nav className="nav">
            {PANES.map((p) => (
              <NavItem key={p} on={pane === p} onClick={() => setPane(p)} dot={pane === p}>
                {p}
              </NavItem>
            ))}
          </nav>
          <h2>Wired up</h2>
          <div className="grid" style={{ gap: 6, padding: "0 8px" }}>
            {[
              ["Rust core", "src-tauri/src/lib.rs"],
              ["Web fallback", "src/web.ts"],
              ["Backend", "src/base.ts"],
              ["Chrome", "src/shell.tsx"],
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize: 12 }}>
                <div>{k}</div>
                <div className="dim mono" style={{ fontSize: 11 }}>{v}</div>
              </div>
            ))}
          </div>
        </>
      }
    >
      {pane === "Overview" && <Overview env={env} />}
      {pane === "Commands" && <Commands />}
      {pane === "Backend" && <Backend />}
      {pane === "Shipping" && <Shipping />}
    </Win>
  );
}

function Overview({ env }: { env: Env | null }) {
  const cells: [string, string][] = [
    ["Runtime", isNative ? "Tauri window (system webview)" : "Browser tab (web fallbacks)"],
    ["Platform", env ? `${env.os} ${env.arch}` : "…"],
    ["Family", env?.family ?? "…"],
    ["Logical cores", env ? String(env.cores) : "…"],
  ];
  return (
    <>
      <h3>One codebase, four artifacts</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        The same React tree renders inside a Tauri window on macOS, Windows and
        Linux, and as a static site here. <code className="mono">src/native.ts</code>{" "}
        is the only module that knows which.
      </p>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginTop: 16 }}>
        {cells.map(([k, v]) => (
          <div className="card" key={k}>
            <div className="dim" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{k}</div>
            <div style={{ fontSize: 18, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Bundle sizes it produces</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <tbody>
            {[
              ["macOS", ".app / .dmg", "aarch64 + x86_64"],
              ["Windows", ".msi / .exe (NSIS)", "x86_64"],
              ["Linux", ".deb / .AppImage / .rpm", "x86_64 + aarch64"],
              ["Web", "static dist/", "any"],
            ].map(([a, b, c]) => (
              <tr key={a} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "7px 0" }}>{a}</td>
                <td className="mono dim">{b}</td>
                <td className="mono dim" style={{ textAlign: "right" }}>{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Commands() {
  const [text, setText] = useState("hanzo");
  const [out, setOut] = useState("");
  const [ms, setMs] = useState(0);
  async function go() {
    const t = performance.now();
    setOut(await call("digest", { text }));
    setMs(Math.round((performance.now() - t) * 100) / 100);
  }
  useEffect(() => { go(); }, []);
  return (
    <>
      <h3>Rust command round-trip</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        <code className="mono">digest</code> is a{" "}
        <code className="mono">#[tauri::command]</code> in{" "}
        <code className="mono">src-tauri/src/lib.rs</code>. In the browser the
        same call resolves through the fallback in <code className="mono">src/web.ts</code>,
        so this pane works in both builds.
      </p>
      <div className="row" style={{ marginTop: 16 }}>
        <input className="inp" value={text} onChange={(e) => setText(e.target.value)}
               onKeyDown={(e) => e.key === "Enter" && go()} placeholder="anything" />
        <button className="btn pri" onClick={go}>invoke</button>
      </div>
      <div className="card mono" style={{ marginTop: 12, wordBreak: "break-all" }}>{out || "…"}</div>
      <div className="dim mono" style={{ marginTop: 8, fontSize: 11 }}>
        {isNative ? "rust fnv-1a" : "web fnv-1a"} · {ms} ms
      </div>
    </>
  );
}

function Backend() {
  const [health, setHealth] = useState("checking…");
  const [rows, setRows] = useState<Note[]>([]);
  const [title, setTitle] = useState("");

  async function refresh() {
    try {
      await base.health();
      setHealth("connected");
    } catch (e) {
      setHealth(`offline — ${(e as Error).message}`);
    }
    setRows(await pull<Note>("notes"));
  }
  useEffect(() => { refresh(); }, []);

  return (
    <>
      <h3>Hanzo Base</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        <code className="mono">src/base.ts</code> holds one client against{" "}
        <code className="mono">base.hanzo.ai</code>. Collections, realtime and CRDT
        come from <code className="mono">@hanzo/base</code>; point a fork at its own
        instance with <code className="mono">VITE_BASE_URL</code>.
      </p>
      <div className="row" style={{ marginTop: 14 }}>
        <span className={"tag " + (health === "connected" ? "ok" : "warn")}>{health}</span>
        <span className="grow" />
        <button className="btn" onClick={refresh}>refresh</button>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input className="inp" value={title} placeholder="new note title"
               onChange={(e) => setTitle(e.target.value)} />
        <button className="btn pri" disabled={!title} onClick={async () => {
          const r = await push("notes", [{ title, body: "" }]);
          setHealth(r.ok ? "connected" : r.note);
          setTitle("");
          refresh();
        }}>create</button>
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        {rows.length === 0 && <div className="empty">no records — create one, or run against your own Base</div>}
        {rows.map((r, i) => (
          <div className="card row" key={r.id ?? i}>
            <span>{r.title}</span>
            <span className="grow" />
            <span className="dim mono" style={{ fontSize: 11 }}>{r.id}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Shipping() {
  const steps: [string, string][] = [
    ["npm run desktop", "dev window with HMR — Vite serves the UI, Rust hot-restarts"],
    ["npm run desktop:build", "installer for the host OS in src-tauri/target/release/bundle"],
    ["npm run build", "static dist/ — what <slug>.hanzo.app serves"],
    ["git tag v0.1.0 && git push --tags", "GitHub Actions fans out to mac/win/linux runners"],
  ];
  return (
    <>
      <h3>Shipping</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Four commands, nothing else to configure.
      </p>
      <div className="grid" style={{ marginTop: 16 }}>
        {steps.map(([cmd, why]) => (
          <div className="card" key={cmd}>
            <div className="mono" style={{ color: "var(--accent-2)" }}>{cmd}</div>
            <div className="muted" style={{ marginTop: 4 }}>{why}</div>
          </div>
        ))}
      </div>
    </>
  );
}
