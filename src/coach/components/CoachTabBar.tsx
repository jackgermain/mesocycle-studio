import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";

const TABS = [
  { path: "/coach/desk", label: "Desk", icon: "ph-squares-four" },
  { path: "/coach/programs", label: "Programs", icon: "ph-stack" },
  { path: "/coach/clients", label: "Clients", icon: "ph-users-three" },
  { path: "/coach/messages", label: "Messages", icon: "ph-chat-circle" },
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
          <button key={t.path} className={`tbi${on ? " on" : ""}`} onClick={() => nav(t.path)}>
            <span className="tbi-icon" style={{ position: "relative" }}>
              <i className={`${on ? "ph-fill" : "ph"} ${t.icon}`} />
              {t.path === "/coach/messages" && unread > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: 2,
                    minWidth: 15,
                    height: 15,
                    borderRadius: 8,
                    background: "var(--color-accent)",
                    color: "#123726",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    boxShadow: "0 0 0 2px var(--color-bg)",
                  }}
                >
                  {unread}
                </span>
              )}
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
