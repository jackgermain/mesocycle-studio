import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useInboxUnreadCount } from "../shared/inboxUnread";
import { TabBadge } from "./TabBadge";

const TABS = [
  { path: "/block", label: "Train", icon: "ph-calendar-blank" },
  { path: "/progress", label: "Progress", icon: "ph-chart-line-up" },
  { path: "/nutrition", label: "Nutrition", icon: "ph-fork-knife" },
  { path: "/inbox", label: "Inbox", icon: "ph-chat-circle" },
];

export function TabBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { state } = useStore();
  const unread = useInboxUnreadCount(state.inboxReadAt);
  return (
    <div className="tb">
      {TABS.map((t) => {
        const on = pathname === t.path || pathname.startsWith(t.path + "/");
        return (
          <button key={t.path} className={`tbi${on ? " on" : ""}`} onClick={() => nav(t.path)}>
            <span className="tbi-icon" style={{ position: "relative" }}>
              <i className={`${on ? "ph-fill" : "ph"} ${t.icon}`} />
              <TabBadge count={t.path === "/inbox" ? unread : 0} label={t.label} />
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
