"use client";

import {
  Avatar,
  Box,
  DropdownMenu,
  Flex,
  Separator,
  Text,
} from "@radix-ui/themes";
import {
  ChevronDownIcon,
  ExitIcon,
  GearIcon,
  InfoCircledIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "@/lib/types";

interface UserProfileMenuProps {
  user: UserProfile;
  onLogout: () => void;
}

function MenuRow({
  icon,
  label,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect?: () => void;
}) {
  return (
    <DropdownMenu.Item className="user-menu-item" onSelect={() => onSelect?.()}>
      <span className="user-menu-item__icon">{icon}</span>
      <span className="user-menu-item__label">{label}</span>
    </DropdownMenu.Item>
  );
}

export function UserProfileMenu({ user, onLogout }: UserProfileMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Flex
          align="center"
          gap="2"
          className="user-menu-trigger"
          style={{
            cursor: "pointer",
            padding: "4px 8px 4px 4px",
            borderRadius: 9999,
            flexShrink: 0,
          }}
        >
          <Avatar
            size="1"
            fallback={`${user.firstName[0]}${user.lastName[0]}`}
            radius="full"
            color="indigo"
          />
          <Box display={{ initial: "none", md: "block" }}>
            <Text size="1" weight="medium">
              {user.firstName}
            </Text>
          </Box>
          <ChevronDownIcon width={14} height={14} color="var(--gray-9)" />
        </Flex>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end" sideOffset={12} className="user-menu-popup">
        <Box className="user-menu-header">
          <Text as="p" weight="medium" mb="1" className="user-menu-header__name">
            {user.firstName} {user.lastName}
          </Text>
          <Text as="p" className="user-menu-header__email">
            {user.email}
          </Text>
        </Box>

        <Separator size="4" className="user-menu-divider" />

        <Box className="user-menu-items">
          <MenuRow icon={<PersonIcon />} label={t("profile.editProfile")} />
          <MenuRow icon={<GearIcon />} label={t("profile.accountSettings")} />
          <MenuRow icon={<InfoCircledIcon />} label={t("profile.support")} />
        </Box>

        <Separator size="4" className="user-menu-divider" />

        <Box className="user-menu-items">
          <MenuRow icon={<ExitIcon />} label={t("profile.logout")} onSelect={onLogout} />
        </Box>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
