import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCoachStore } from "../store";
import { refreshOpenSignalCount, useOpenSignalCount } from "../../shared/openSignals";
import { TabBadge } from "../../components/TabBadge";
import { SideNav, isTabActive, type NavTab } from "../../components/SideNav";
import { useIsDesktop } from "../../shared/useMediaQuery";

/** The coach side's destinations and their badges, shared by the phone's bottom bar and the computer's side
 * menu. `refresh` is true only for whichever of them is on screen: both call this, and two timers would
 * double every poll. */
function useCoachTabs(refresh: boolean): NavTab[] {
  const { pathname } = useLocation();
  const { state } = useCoachStore();
  const unread = state.threads.filter((t) => t.unread).length;
  const waiting = useOpenSignalCount();

  // Refreshed on every navigation as well as on a timer, so acting on something from another screen is
  // reflected by the time you land back on the bar.
  React.useEffect(() => {
    if (refresh) void refreshOpenSignalCount();
  }, [pathname, refresh]);
  React.useEffect(() => {
    if (!refresh) return;
    const id = setInterval(() => void refreshOpenSignalCount(true), 60000);
    const onFocus = () => void refreshOpenSignalCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return [
    // Reviewing next week's numbers is reached from the desk, so the desk stays lit while you do it.
    { path: "/coach/desk", label: "Desk", icon: "ph-squares-four", badge: waiting, also: ["/coach/review"] },
    { path: "/coach/programs", label: "Programs", icon: "ph-stack", badge: 0 },
    { path: "/coach/clients", label: "Clients", icon: "ph-users-three", badge: 0 },
    { path: "/coach/messages", label: "Messages", icon: "ph-chat-circle", badge: unread },
  ];
}

/** Bottom tabs on a phone; nothing on a computer, where the side menu has the same destinations. */
export function CoachTabBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const desktop = useIsDesktop();
  const tabs = useCoachTabs(!desktop);
  if (desktop) return null;
  return (
    <div className="tb">
      {tabs.map((t) => {
        const on = isTabActive(pathname, t);
        return (
          <button key={t.path} className={`tbi${on ? " on" : ""}`} onClick={() => nav(t.path)}>
            <span className="tbi-icon" style={{ position: "relative" }}>
              <i className={`${on ? "ph-fill" : "ph"} ${t.icon}`} />
              <TabBadge count={t.badge} label={t.label} />
            </span>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function CoachSideNav() {
  return <SideNav tabs={useCoachTabs(true)} />;
}
