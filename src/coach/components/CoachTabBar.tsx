import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";
import { refreshOpenSignalCount, useOpenSignalCount } from "../../shared/openSignals";
import { TabBadge } from "../../components/TabBadge";

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
  const waiting = useOpenSignalCount();

  // Refreshed on every navigation as well as on a timer, so acting on something from another screen is
  // reflected by the time you land back on the bar.
  React.useEffect(() => {
    void refreshOpenSignalCount();
  }, [pathname]);
  React.useEffect(() => {
    const id = setInterval(() => void refreshOpenSignalCount(true), 60000);
    const onFocus = () => void refreshOpenSignalCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const badgeFor = (path: string) =>
    path === "/coach/messages" ? unread : path === "/coach/desk" ? waiting : 0;

  return (
    <div className="tb">
      {TABS.map((t) => {
        const on = pathname === t.path || pathname.startsWith(t.path + "/");
        return (
          <button key={t.path} className={`tbi${on ? " on" : ""}`} onClick={() => nav(t.path)}>
            <span className="tbi-icon" style={{ position: "relative" }}>
              <i className={`${on ? "ph-fill" : "ph"} ${t.icon}`} />
              <TabBadge count={badgeFor(t.path)} label={t.label} />
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
