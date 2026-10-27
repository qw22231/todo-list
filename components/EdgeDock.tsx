"use client";

import { useEffect, useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import {
  cursorPosition,
  currentMonitor,
  getCurrentWindow,
  PhysicalPosition,
} from "@tauri-apps/api/window";

interface EdgeDockProps {
  paused: boolean;
}

export default function EdgeDock({ paused }: EdgeDockProps) {
  const [desktop, setDesktop] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    // 保持瀏覽器版也可以正常開啟。
    Promise.resolve(isTauri()).then(setDesktop);
  }, []);

  useEffect(() => {
    if (!enabled || !isTauri()) return;

    const win = getCurrentWindow();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let restorePosition: PhysicalPosition | undefined;

    async function start() {
      const monitor = await currentMonitor();
      if (!monitor || cancelled) return;

      // 以啟用時所在的螢幕為準。
      const area = monitor.workArea;
      const scale = monitor.scaleFactor;
      const strip = Math.round(5 * scale);
      const right = area.position.x + area.size.width;

      let hidden = false;
      let outsideSince: number | null = null;

      async function tick() {
        if (cancelled) return;

        const [size, mouse] = await Promise.all([
          win.outerSize(),
          cursorPosition(),
        ]);

        if (cancelled) return;

        // 使用實體像素，避免 Windows 縮放比例造成位置錯誤。
        const shownX = Math.max(area.position.x, right - size.width);
        const hiddenX = right - strip;
        const y = area.position.y;

        restorePosition = new PhysicalPosition(shownX, y);

        const insideExpanded =
          mouse.x >= shownX &&
          mouse.x < right &&
          mouse.y >= y &&
          mouse.y < y + size.height;

        const overStrip =
          mouse.x >= hiddenX &&
          mouse.x < right &&
          mouse.y >= y &&
          mouse.y < y + size.height;

        // 編輯表單或輸入欄位有焦點時，保持展開。
        const inputFocused =
          document.activeElement instanceof HTMLElement &&
          document.activeElement.matches(
            "input, textarea, select, [contenteditable='true']"
          );

        if (pausedRef.current || inputFocused) {
          hidden = false;
          outsideSince = null;
        } else if (hidden) {
          if (overStrip) {
            hidden = false;
            outsideSince = null;
          }
        } else if (insideExpanded) {
          outsideSince = null;
        } else {
          outsideSince ??= Date.now();

          if (Date.now() - outsideSince >= 600) {
            hidden = true;
          }
        }

        await win.setPosition(
          new PhysicalPosition(hidden ? hiddenX : shownX, y)
        );

        if (!cancelled) {
          timer = setTimeout(() => {
            void tick().catch(handleError);
          }, 150);
        }
      }

      await tick();
    }

    function handleError(error: unknown) {
      if (cancelled) return;

      setError(
        error instanceof Error ? error.message : String(error)
      );
      setEnabled(false);
    }

    void start().catch(handleError);

    return () => {
      cancelled = true;
      clearTimeout(timer);

      // 關閉貼邊功能時，把視窗放回可見範圍。
      if (restorePosition) {
        void win.setPosition(restorePosition).catch(console.error);
      }
    };
  }, [enabled]);

  if (!desktop) return null;

  return (
    <div className="edge-dock-control">
      <button
        type="button"
        aria-pressed={enabled}
        aria-label={enabled ? "取消貼邊，固定展開" : "啟用右側貼邊"}
        title={enabled ? "已啟用貼邊自動隱藏；點擊固定展開" : "啟用右側貼邊自動隱藏"}
        className="edge-dock-button"
        onClick={() => {
          setError("");
          setEnabled((value) => !value);
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true">
          <path d="M20 4v16" />
          <rect x="3" y="5" width="11" height="14" rx="2" />
          {enabled ? <path d="m10 9-3 3 3 3" /> : <path d="m7 9 3 3-3 3" />}
        </svg>
      </button>

      {error && (
        <p role="alert" className="edge-dock-error">
          貼邊功能失敗：{error}
        </p>
      )}
    </div>
  );
}
