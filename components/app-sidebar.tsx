"use client";

import {
  AtSignIcon,
  BookOpenIcon,
  BriefcaseBusinessIcon,
  CameraIcon,
  Code2Icon,
  HashIcon,
  LayoutDashboardIcon,
  LightbulbIcon,
  MailIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  NewspaperIcon,
  PaletteIcon,
  PawPrintIcon,
  Settings2Icon,
  SparklesIcon,
} from "lucide-react";
import type * as React from "react";

import { BrandSwitcher } from "@/components/brand-switcher";
import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  navMain: [
    { title: "Overview", url: "/app", icon: <LayoutDashboardIcon /> },
    { title: "Brands", url: "/app/brands", icon: <SparklesIcon /> },
    { title: "Brand voice", url: "/app/brand-voice", icon: <PaletteIcon /> },
  ],
  platforms: [
    { name: "Medium", url: "/app/platforms/medium", icon: <BookOpenIcon /> },
    { name: "Dev.to", url: "/app/platforms/devto", icon: <Code2Icon /> },
    { name: "Hashnode", url: "/app/platforms/hashnode", icon: <HashIcon /> },
    { name: "Substack", url: "/app/platforms/substack", icon: <NewspaperIcon /> },
    { name: "Reddit", url: "/app/platforms/reddit", icon: <MessageCircleIcon /> },
    {
      name: "Indie Hackers",
      url: "/app/platforms/indie-hackers",
      icon: <LightbulbIcon />,
    },
    { name: "LinkedIn", url: "/app/platforms/linkedin", icon: <BriefcaseBusinessIcon /> },
    { name: "X", url: "/app/platforms/x", icon: <AtSignIcon /> },
    { name: "Threads", url: "/app/platforms/threads", icon: <MessagesSquareIcon /> },
    { name: "Instagram", url: "/app/platforms/instagram", icon: <CameraIcon /> },
    { name: "Newsletter", url: "/app/platforms/newsletter", icon: <MailIcon /> },
  ],
  navSecondary: [{ title: "Settings", url: "/app/settings", icon: <Settings2Icon /> }],
};

export function AppSidebar({
  brands,
  activeBrandId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  brands: { id: string; name: string }[];
  activeBrandId: string | null;
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/app" />}
            >
              <PawPrintIcon className="size-5" aria-hidden="true" />
              <span className="text-base font-semibold">Wolf</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.platforms} />
        <BrandSwitcher brands={brands} activeBrandId={activeBrandId} />
        <NavSecondary items={data.navSecondary} />
      </SidebarContent>
    </Sidebar>
  );
}
