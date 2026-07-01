"use client";

import {
  Box,
  Flex,
  ScrollArea,
  Text,
} from "@radix-ui/themes";
import {
  BellIcon,
  ChevronRightIcon,
  DashboardIcon,
  FileTextIcon,
  HamburgerMenuIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PersonIcon,
  ReaderIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthProvider";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useThemeAppearance } from "./ThemeToggle";
import { UserProfileMenu } from "./UserProfileMenu";

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  admin?: boolean;
  superAdmin?: boolean;
}

const MENU: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: <DashboardIcon /> },
];

const ADMIN: NavItem[] = [
  { href: "/admin/org", labelKey: "nav.orgChart", icon: <HomeIcon />, admin: true },
  { href: "/admin/users", labelKey: "nav.users", icon: <PersonIcon />, admin: true },
  { href: "/admin/audit", labelKey: "nav.loginAudit", icon: <ReaderIcon />, superAdmin: true },
];

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
          <ChevronRightIcon className="sidebar-nav-item__chevron" width={16} height={16} />
        </>
      )}
    </Link>
  );
}

function SidebarNav({
  collapsed,
  pathname,
  visibleAdmin,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  visibleAdmin: NavItem[];
  onNavigate?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <ScrollArea type="auto" scrollbars="vertical" style={{ flex: 1 }}>
      <nav className={`sidebar-nav${collapsed ? " sidebar-nav--collapsed" : ""}`}>
        <div className="sidebar-section">
          {!collapsed && <span className="sidebar-section__label">{t("common.menu")}</span>}
          <div className="sidebar-nav-list">
            {MENU.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                label={t(item.labelKey)}
                active={pathname.startsWith(item.href)}
                collapsed={collapsed}
                onClick={onNavigate}
              />
            ))}
          </div>
        </div>

        {visibleAdmin.length > 0 && (
          <div className="sidebar-section">
            {!collapsed && <span className="sidebar-section__label">{t("common.others")}</span>}
            <div className="sidebar-nav-list">
              {visibleAdmin.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  label={t(item.labelKey)}
                  active={pathname.startsWith(item.href)}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </div>
        )}
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

  const visibleAdmin = useMemo(
    () =>
      ADMIN.filter((item) => {
        if (item.superAdmin) return user?.role === "SUPER_ADMIN";
        if (item.admin) return isAdmin;
        return true;
      }),
    [user?.role, isAdmin],
  );

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
        <div className={`sidebar-brand${isCollapsed ? " sidebar-brand--collapsed" : ""}`}>
          <div className="sidebar-brand__logo">
            <FileTextIcon width={18} height={18} />
          </div>
          {!isCollapsed && <span className="sidebar-brand__title">FluxPro</span>}
        </div>

        <SidebarNav
          collapsed={isCollapsed}
          pathname={pathname}
          visibleAdmin={visibleAdmin}
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

            <button type="button" className="header-icon-btn" aria-label={t("header.notifications")}>
              <BellIcon width={20} height={20} />
              <span className="header-icon-btn__badge" />
            </button>

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
