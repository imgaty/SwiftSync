
"use client"

import * as React from "react"
import { ChevronRight, FileText, Folder, PenTool, Rocket, Settings, Upload } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const data = {
    nav: [
        {
            title: "Getting started",
            items: [
                { title: "Introduction", url: "/docs", isActive: true, icon: FileText },
                { title: "Installation", url: "#", icon: Upload },
            ]
        },
    ],
    collapsibles: [
        {
            title: "Writing",
            icon: PenTool,
            items: [
                { title: "Markdown", url: "#" },
                { title: "Pages", url: "#" },
                { title: "Folders", url: "#" },
            ]
        },
        {
            title: "Upgrade Guide",
            icon: Settings,
            items: [
                { title: "Upgrade to v1", url: "#" },
            ]
        }
    ],
    other: [
        {
            title: "Deployment",
            url: "#",
            icon: Rocket
        }
    ]
}

export function DocsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props} className="border-r-0">
            <SidebarContent className="gap-0">
                <SidebarGroup>
                    <SidebarGroupLabel className="font-semibold text-foreground">Getting started</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {data.nav[0].items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={item.isActive} className="h-8 text-sm">
                                        <a href={item.url}>
                                            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                            {item.title}
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                            
                            {data.collapsibles.map((group) => (
                                <Collapsible key={group.title} defaultOpen className="group/collapsible">
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton className="h-8 text-sm">
                                                {group.icon && <group.icon className="mr-2 h-4 w-4" />}
                                                {group.title}
                                                <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {group.items.map((item) => (
                                                    <SidebarMenuSubItem key={item.title}>
                                                        <SidebarMenuSubButton asChild className="h-8 text-sm">
                                                            <a href={item.url}>{item.title}</a>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </Collapsible>
                            ))}

                            {data.other.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild className="h-8 text-sm">
                                        <a href={item.url}>
                                            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                            {item.title}
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="font-semibold text-foreground">Components</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="h-8 text-sm">
                                    <a href="#">Accordion</a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="font-semibold text-foreground">API</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="h-8 text-sm">
                                    <a href="#">Reference</a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}

function SidebarMenuSub({ children }: { children: React.ReactNode }) {
    return <ul className="flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5">{children}</ul>
}

function SidebarMenuSubItem({ children }: { children: React.ReactNode }) {
    return <li>{children}</li>
}

function SidebarMenuSubButton({ asChild, className, children, ...props }: any) {
    const Comp = asChild ? React.Fragment : "button"
    return (
        <SidebarMenuButton asChild className={className} {...props}>
            {children}
        </SidebarMenuButton>
    )
}
