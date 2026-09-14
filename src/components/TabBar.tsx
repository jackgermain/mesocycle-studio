import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../state/store";
import { useAuth } from "../lib/auth";
import { canSelfBuildProgram, hasInbox } from "../shared/canBuild";
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
  const role = account?.role;
  const selfDirected = canSelfBuildProgram(role);
  const messaging = hasInbox(role);

  // Poll only for a client. get_my_thread answers a CLIENT's thread (migration 0028 gates it to that role),
  // so polling it for anyone else is a request that can only ever come back null.
  const unread = useInboxUnreadCount(state.inboxReadAt, poll && role === "client");

  const train: NavTab = { path: "/block", label: "Train", icon: "ph-calendar-blank", badge: 0 };
  const progress: NavTab = { path: "/progress", label: "Progress", icon: "ph-chart-line-up", badge: 0 };
  const nutrition: NavTab = { path: "/nutrition", label: "Nutrition", icon: "ph-fork-knife", badge: 0 };
  // Train first, Programs beside it: "on the far left there's the train tab... and then on the tab next to
  // that will be the program tab, and that's where you'll find anything related to the program design".
  const programs: NavTab = { path: "/build", label: "Programs", icon: "ph-barbell", badge: 0 };

  // A coach's messages are their roster's threads, held in their own coach_state and served by the coach
  // app's Messages screen. Pointing them at /inbox instead would open a client inbox that get_my_thread
  // always answers null for, which is a tab that looks broken rather than empty.
  const messages: NavTab =
    role === "coach"
      ? { path: "/coach/messages", label: "Messages", icon: "ph-chat-circle", badge: 0 }
      : { path: "/inbox", label: "Messages", icon: "ph-chat-circle", badge: unread };

  const tabs: NavTab[] = [train];
  if (selfDirected) tabs.push(programs);
  tabs.push(progress, nutrition);
  if (messaging) tabs.push(messages);
  return tabs;
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
