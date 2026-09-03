import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
  { path: "/block", label: "Train", icon: "ph-calendar-blank" },
  { path: "/progress", label: "Progress", icon: "ph-chart-line-up" },
  { path: "/nutrition", label: "Nutrition", icon: "ph-fork-knife" },
  { path: "/inbox", label: "Inbox", icon: "ph-chat-circle" },
];

export function TabBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  return (
    <div className="tb">
      {TABS.map((t) => {
        const on = pathname === t.path || pathname.startsWith(t.path + "/");
        return (
          <button key={t.path} className={`tbi${on ? " on" : ""}`} onClick={() => nav(t.path)}>
            <span className="tbi-icon">
              <i className={`${on ? "ph-fill" : "ph"} ${t.icon}`} />
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
