import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useInboxUnreadCount } from "../shared/inboxUnread";
import { useIsDesktop } from "../shared/useMediaQuery";
import { TabBadge } from "./TabBadge";
import { SideNav, isTabActive, type NavTab } from "./SideNav";

/** The client side's destinations and their badges, shared by the phone's bottom bar and the computer's side
 * menu so the two cannot drift apart. `poll` is true only for whichever of them is actually on screen. */
function useClientTabs(poll: boolean): NavTab[] {
  const { state } = useStore();
  const unread = useInboxUnreadCount(state.inboxReadAt, poll);
  return [
    { path: "/block", label: "Train", icon: "ph-calendar-blank", badge: 0 },
    { path: "/progress", label: "Progress", icon: "ph-chart-line-up", badge: 0 },
    { path: "/nutrition", label: "Nutrition", icon: "ph-fork-knife", badge: 0 },
    { path: "/inbox", label: "Inbox", icon: "ph-chat-circle", badge: unread },
  ];
}

/** Bottom tabs on a phone. On a computer the layout's side menu carries the same destinations, so this
 * renders nothing there rather than a second copy of the navigation. */
export function TabBar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const desktop = useIsDesktop();
  const tabs = useClientTabs(!desktop);
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

export function ClientSideNav() {
  return <SideNav tabs={useClientTabs(true)} />;
}
