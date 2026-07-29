"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavDocuments({
  items,
}: {
  items: {
    name: string;
    url: string;
    icon: React.ReactNode;
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <Collapsible.Root defaultOpen>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Platforms" render={<Collapsible.Trigger />}>
                <SlidersHorizontalIcon />
                <span>Platforms</span>
                <ChevronDownIcon className="ml-auto transition-transform group-data-[panel-open]/collapsible:rotate-180" />
              </SidebarMenuButton>
              <Collapsible.Panel>
                <SidebarMenuSub>
                  {items.map((item) => (
                    <SidebarMenuSubItem key={item.name}>
                      <SidebarMenuSubButton render={<a href={item.url} />}>
                        {item.icon}
                        <span>{item.name}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </Collapsible.Panel>
            </SidebarMenuItem>
          </SidebarMenu>
        </Collapsible.Root>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
