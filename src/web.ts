import { bridge } from "./native";

/** Browser fallbacks for the Rust commands. Same signatures, same results —
 *  the FNV-1a digest below is the exact algorithm src-tauri/src/lib.rs runs, so
 *  the preview is not a mock, it is the same function in the other language. */
export const call = bridge({
  app_env: () => {
    const ua = navigator.userAgent;
    const os = /Mac/.test(ua) ? "macos" : /Win/.test(ua) ? "windows" : /Linux/.test(ua) ? "linux" : "web";
    return {
      os,
      arch: /aarch64|arm64/i.test(ua) ? "aarch64" : /x86_64|Win64|x64/i.test(ua) ? "x86_64" : "unknown",
      family: os === "windows" ? "windows" : "unix",
      cores: navigator.hardwareConcurrency || 1,
      tauri: "2 (web build)",
    };
  },
  digest: ({ text }: { text: string }) => {
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(text)) {
      h ^= b;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return "fnv1a:" + h.toString(16).padStart(8, "0");
  },
});
