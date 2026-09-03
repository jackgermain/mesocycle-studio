import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";

const TABS = [
  { path: "/coach/desk", label: "Desk", icon: "ph-squares-four" },
  { path: "/coach/programs", label: "Programs", icon: "ph-stack" },
  { path: "/coach/clients", label: "Clients", icon: "ph-users-three" },
  { path: "/coach/messages", label: "Messages", icon: "ph-chat-circle" },
  { path: "/coach/library", label: "Library", icon: "ph-barbell" },
];

export function CoachTabBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { state } = useCoachStore();
  const unread = state.threads.filter((t) => t.unread).length;

  return (
    <div className="tb">
      {TABS.map((t) => {
        const on = pathname === t.path || pathname.startsWith(t.path + "/");
        return (
          <button key={t.path} className={`tbi${on ? " on" : ""}`} style={{ position: "relative" }} onClick={() => nav(t.path)}>
            <i className={`${on ? "ph-fill" : "ph"} ${t.icon}`} />
            {t.label}
            {t.path === "/coach/messages" && unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  right: "50%",
                  marginRight: -20,
                  minWidth: 15,
                  height: 15,
                  borderRadius: 8,
                  background: "var(--color-accent)",
                  color: "#123726",
                  fontSize: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 3px",
                }}
              >
                {unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
