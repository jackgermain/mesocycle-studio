import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { canSelfBuildProgram } from "../shared/canBuild";
import { useInboxUnreadCount } from "../shared/inboxUnread";
import { useIsDesktop } from "../shared/useMediaQuery";
import { TabBadge } from "./TabBadge";
import { SideNav, isTabActive, type NavTab } from "./SideNav";

/** The client side's destinations and their badges, shared by the phone's bottom bar and the computer's side
 * menu so the two cannot drift apart. `poll` is true only for whichever of them is actually on screen.
 *
 * The list is not the same for everyone. A General account builds its own training, so it gets a **Programs**
 * tab and no Inbox -- Jack: "we don't need messages on general accounts". A prescribed client is the opposite:
 * their coach writes the program and the thread is how they reach them, so they keep Inbox and get no builder.
 *
 * `useInboxUnreadCount` is still called for everyone because a hook cannot be conditional, but it is told not
 * to poll for the accounts that have no inbox to open -- fetching messages nobody can read is just traffic. */
function useClientTabs(poll: boolean): NavTab[] {
  const { state } = useStore();
  const { account } = useAuth();
  const selfDirected = canSelfBuildProgram(account?.role);
  const unread = useInboxUnreadCount(state.inboxReadAt, poll && !selfDirected);

  const train: NavTab = { path: "/block", label: "Train", icon: "ph-calendar-blank", badge: 0 };
  const progress: NavTab = { path: "/progress", label: "Progress", icon: "ph-chart-line-up", badge: 0 };
  const nutrition: NavTab = { path: "/nutrition", label: "Nutrition", icon: "ph-fork-knife", badge: 0 };

  if (selfDirected) {
    // Train first, Programs beside it: "on the far left there's the train tab... and then on the tab next to
    // that will be the program tab, and that's where you'll find anything related to the program design".
    return [train, { path: "/build", label: "Programs", icon: "ph-barbell", badge: 0 }, progress, nutrition];
  }
  return [train, progress, nutrition, { path: "/inbox", label: "Inbox", icon: "ph-chat-circle", badge: unread }];
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
