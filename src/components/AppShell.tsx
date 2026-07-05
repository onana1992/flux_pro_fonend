"use client";

import {
  Box,
  Flex,
  ScrollArea,
  Text,
} from "@radix-ui/themes";
import {
  BarChartIcon,
  BellIcon,
  ChevronRightIcon,
  ComponentInstanceIcon,
  DashboardIcon,
  FileIcon,
  HamburgerMenuIcon,
  MagnifyingGlassIcon,
  Share1Icon,
  MoonIcon,
  PersonIcon,
  ReaderIcon,
  SunIcon,
  LayersIcon,
  LockClosedIcon,
  IdCardIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthProvider";
import { canAccessAdmin, canReadUsers, canSeePermission, isSuperAdmin } from "@/lib/auth-storage";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { useThemeAppearance } from "./ThemeToggle";
import { UserProfileMenu } from "./UserProfileMenu";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  admin?: boolean;
  userRead?: boolean;
  superAdmin?: boolean;
  permission?: string;
  matchPrefix?: string;
}

interface NavSection {
  labelKey: string;
  items: NavItem[];
}

const MAIN_SECTION: NavSection = {
  labelKey: "nav.main",
  items: [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: <DashboardIcon /> },
    {
      href: "/files",
      labelKey: "nav.files",
      icon: <ReaderIcon />,
      permission: "FILES:READ",
      matchPrefix: "/files",
    },
    {
      href: "/rapports",
      labelKey: "nav.reports",
      icon: <BarChartIcon />,
      permission: "DASHBOARD:EXPORT",
    },
  ],
};

const REFERENTIALS_SECTION: NavSection = {
  labelKey: "nav.referentials",
  items: [
    {
      href: "/admin/file-types",
      labelKey: "nav.fileTypes",
      icon: <FileIcon />,
      permission: "FILE_TYPES:READ",
    },
    {
      href: "/admin/chain-templates",
      labelKey: "nav.chainTemplates",
      icon: <LayersIcon />,
      permission: "CHAIN_TEMPLATES:READ",
    },
    {
      href: "/admin/alert-types",
      labelKey: "nav.alertTypes",
      icon: <BellIcon />,
      permission: "ALERT_TYPES:READ",
    },
  ],
};

const ORG_SECTION: NavSection = {
  labelKey: "nav.organization",
  items: [
    {
      href: "/admin/org",
      labelKey: "nav.orgChart",
      icon: <Share1Icon />,
      admin: true,
      matchPrefix: "/admin/org",
    },
    {
      href: "/admin/org/types",
      labelKey: "nav.orgTypes",
      icon: <ComponentInstanceIcon />,
      admin: true,
    },
  ],
};

const SECURITY_SECTION: NavSection = {
  labelKey: "nav.security",
  items: [
    { href: "/admin/users", labelKey: "nav.users", icon: <PersonIcon />, userRead: true },
    { href: "/admin/roles", labelKey: "nav.roles", icon: <IdCardIcon />, permission: "ROLES:READ" },
    { href: "/admin/permissions", labelKey: "nav.permissions", icon: <LockClosedIcon />, permission: "PERMISSIONS:READ" },
    { href: "/admin/audit", labelKey: "nav.loginAudit", icon: <ReaderIcon />, permission: "LOGIN_AUDIT:READ" },
  ],
};

function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/admin/org") {
    return pathname === "/admin/org" || (pathname.startsWith("/admin/org/") && !pathname.startsWith("/admin/org/types"));
  }
  const prefix = item.matchPrefix ?? item.href;
  return pathname === item.href || pathname.startsWith(`${prefix}/`);
}

function NavItemLink({
  item,
  label,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={[
        "sidebar-nav-item",
        active ? "sidebar-nav-item--active" : "",
        collapsed ? "sidebar-nav-item--collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={collapsed ? label : undefined}
    >
      <span className="sidebar-nav-item__icon">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="sidebar-nav-item__label">{label}</span>
          <ChevronRightIcon className="sidebar-nav-item__chevron" width={14} height={14} />
        </>
      )}
    </Link>
  );
}

function SidebarNav({
  collapsed,
  pathname,
  sections,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1 }}>
      <nav className={`sidebar-nav${collapsed ? " sidebar-nav--collapsed" : ""}`}>
        {sections.map((section) => (
          <div key={section.labelKey} className="sidebar-section">
            {!collapsed && <span className="sidebar-section__label">{t(section.labelKey)}</span>}
            <div className="sidebar-nav-list">
              {section.items.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  label={t(item.labelKey)}
                  active={isNavItemActive(item, pathname)}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const { appearance, toggleAppearance } = useThemeAppearance();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const navSections = useMemo(() => {
    function canSeeItem(item: NavItem): boolean {
      if (item.permission) return canSeePermission(user, item.permission);
      if (item.superAdmin) return isSuperAdmin(user);
      if (item.admin) return isAdmin;
      if (item.userRead) return canReadUsers(user);
      return true;
    }

    const sections: NavSection[] = [{ ...MAIN_SECTION, items: MAIN_SECTION.items.filter(canSeeItem) }];

    const referentialItems = REFERENTIALS_SECTION.items.filter(canSeeItem);
    if (referentialItems.length > 0) {
      sections.push({ ...REFERENTIALS_SECTION, items: referentialItems });
    }

    const orgItems = ORG_SECTION.items.filter(canSeeItem);
    if (orgItems.length > 0) {
      sections.push({ ...ORG_SECTION, items: orgItems });
    }

    const securityItems = SECURITY_SECTION.items.filter(canSeeItem);
    if (securityItems.length > 0) {
      sections.push({ ...SECURITY_SECTION, items: securityItems });
    }

    return sections;
  }, [user, isAdmin]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 767px)").matches) setMobileOpen(true);
    else setCollapsed((c) => !c);
  }

  const sidebarW = collapsed ? "4.5rem" : "var(--sidebar-width)";

  const sidebarInner = (isMobile: boolean) => {
    const isCollapsed = collapsed && !isMobile;
    return (
      <>
        <Link
          href="/dashboard"
          className={`sidebar-brand${isCollapsed ? " sidebar-brand--collapsed" : ""}`}
          onClick={isMobile ? () => setMobileOpen(false) : undefined}
        >
          <div className="sidebar-brand__logo">
            <Image
              src="/logo-fluxpro.png"
              alt="FluxPro"
              width={36}
              height={36}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          {!isCollapsed && <span className="sidebar-brand__title">{t("common.brandTitle")}</span>}
        </Link>

        <SidebarNav
          collapsed={isCollapsed}
          pathname={pathname}
          sections={navSections}
          onNavigate={isMobile ? () => setMobileOpen(false) : undefined}
        />

        <div className={`sidebar-footer${isCollapsed ? " sidebar-footer--collapsed" : ""}`}>
          <LanguageSwitcher collapsed={isCollapsed} variant="sidebar" />
        </div>
      </>
    );
  };

  return (
    <Flex style={{ minHeight: "100vh", background: "var(--gray-2)" }}>
      <Box
        display={{ initial: "none", md: "block" }}
        className="sidebar"
        style={{
          width: sidebarW,
          flexShrink: 0,
          transition: "width 0.2s",
        }}
      >
        <Flex direction="column" style={{ height: "100vh", position: "sticky", top: 0 }}>
          {sidebarInner(false)}
        </Flex>
      </Box>

      {mobileOpen && (
        <Box
          display={{ md: "none" }}
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 40,
          }}
        />
      )}

      <Box
        display={{ md: "none" }}
        className="sidebar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "var(--sidebar-width)",
          zIndex: 50,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.2s",
        }}
      >
        <Flex direction="column" style={{ height: "100%" }}>
          {sidebarInner(true)}
        </Flex>
      </Box>

      <Flex direction="column" style={{ flex: 1, minWidth: 0 }}>
        <Flex
          align="center"
          justify="between"
          gap="4"
          px="5"
          style={{
            height: "var(--header-height)",
            background: "var(--color-background)",
            borderBottom: "1px solid var(--gray-a5)",
            position: "sticky",
            top: 0,
            zIndex: 30,
            flexShrink: 0,
            flexWrap: "nowrap",
          }}
        >
          <Flex align="center" gap="4" style={{ flex: 1, minWidth: 0, flexWrap: "nowrap" }}>
            <button
              type="button"
              aria-label={t("header.menu")}
              onClick={toggleSidebar}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                flexShrink: 0,
                border: "1px solid var(--gray-a5)",
                borderRadius: 8,
                background: "var(--color-background)",
                color: "var(--gray-11)",
                cursor: "pointer",
              }}
            >
              <HamburgerMenuIcon width={20} height={20} />
            </button>

            <Flex
              align="center"
              gap="2"
              px="3"
              display={{ initial: "none", sm: "flex" }}
              style={{
                flex: 1,
                maxWidth: 430,
                height: 44,
                border: "1px solid var(--gray-a5)",
                borderRadius: 8,
                background: "var(--gray-2)",
              }}
            >
              <MagnifyingGlassIcon width={18} height={18} color="var(--gray-9)" />
              <Box asChild style={{ flex: 1, minWidth: 0 }}>
                <input
                  ref={searchRef}
                  type="search"
                  placeholder={t("header.searchPlaceholder")}
                  aria-label={t("common.search")}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 14,
                    color: "var(--gray-12)",
                  }}
                />
              </Box>
              <Text
                size="1"
                color="gray"
                style={{
                  flexShrink: 0,
                  padding: "2px 6px",
                  border: "1px solid var(--gray-a5)",
                  borderRadius: 4,
                  background: "var(--color-background)",
                  fontFamily: "var(--font-geist-mono)",
                  lineHeight: 1.4,
                }}
              >
                ⌘ K
              </Text>
            </Flex>
          </Flex>

          <Flex align="center" gap="2" style={{ flexShrink: 0, flexWrap: "nowrap" }}>
            <button
              type="button"
              className="header-icon-btn"
              aria-label={appearance === "light" ? t("header.darkMode") : t("header.lightMode")}
              onClick={toggleAppearance}
            >
              {appearance === "light" ? (
                <MoonIcon width={20} height={20} />
              ) : (
                <SunIcon width={20} height={20} />
              )}
            </button>

            <NotificationBell />

            {user && <UserProfileMenu user={user} onLogout={handleLogout} />}
          </Flex>
        </Flex>

        <Box p={{ initial: "4", md: "6" }} style={{ flex: 1 }}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}
