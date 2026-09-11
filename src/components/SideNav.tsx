import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TabBadge } from "./TabBadge";

export interface NavTab {
  path: string;
  label: string;
  icon: string;
  badge: number;
  /** Other paths that belong to this tab -- a screen reached from it that doesn't sit under its path. */
  also?: string[];
}

export function isTabActive(pathname: string, tab: NavTab): boolean {
  return [tab.path, ...(tab.also ?? [])].some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** The bottom tab bar's job on a computer: the same destinations and badges, down the left edge of the
 * window, under the wordmark. Rendered once by each layout rather than by each screen, so it stays put while
 * the page beside it changes -- including on detail screens, which never had a tab bar at all. */
export function SideNav({ tabs }: { tabs: NavTab[] }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  return (
    <nav className="side-nav" aria-label="Main">
      <div className="side-brand">Jacked</div>
      {tabs.map((t) => {
        const on = isTabActive(pathname, t);
        return (
          <button key={t.path} className={`sni${on ? " on" : ""}`} onClick={() => nav(t.path)} aria-current={on ? "page" : undefined}>
            <span className="sni-icon">
              <i className={`${on ? "ph-fill" : "ph"} ${t.icon}`} />
              <TabBadge count={t.badge} label={t.label} />
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
