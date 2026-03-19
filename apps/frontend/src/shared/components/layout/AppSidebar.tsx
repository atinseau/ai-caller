import { Building2, LayoutDashboard, LogOut, Phone } from "lucide-react";
import { Link, useLocation } from "react-router";
import { authClient } from "@/infrastructure/auth";
import { UserRoleEnum } from "@/shared/enums/user-role.enum";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { cn } from "@/shared/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "../ui/sidebar";

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
}) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={to}>
          <Icon className="size-4" />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const userState = useCurrentUser();
  const user = userState.status === "authenticated" ? userState.user : null;

  const initials = user?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleLogout() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Phone className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-none">
              AI Caller
            </span>
            <span className="text-[10px] text-muted-foreground">Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="w-auto!" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {user?.role === UserRoleEnum.ROOT ? (
                <NavItem
                  to="/dashboard/root"
                  icon={Building2}
                  label="Companies"
                />
              ) : (
                <NavItem
                  to="/dashboard"
                  icon={LayoutDashboard}
                  label="Dashboard"
                />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="px-3 py-3">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={user.image ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium leading-none">
                {user.name}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] font-medium uppercase tracking-wide",
                  user.role === UserRoleEnum.ROOT
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                {user.role}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
