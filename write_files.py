import os

docs_sidebar_content = """\"\"\"
"use client"

import * as React from "react"
import { ChevronRight } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const data = {
    nav: [
        {
            title: "Getting started",
            items: [
                { title: "Introduction", url: "/docs", isActive: true },
                { title: "Installation", url: "#" },
            ]
        },
        {
            title: "Components",
            items: [
                { title: "Accordion", url: "#" },
                { title: "Alert", url: "#" },
                { title: "Button", url: "#" },
            ]
        },
        {
            title: "API",
            items: [
                { title: "Reference", url: "#" },
            ]
        }
    ],
    writing: [
        {
            title: "Writing",
            items: [
                { title: "Markdown", url: "#" },
                { title: "Pages", url: "#" },
                { title: "Folders", url: "#" },
            ]
        }
    ]
}

export function DocsSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar {...props} className="border-r-0">
            <SidebarContent className="gap-0">
                {/* Static Groups */}
                {data.nav.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel className="font-semibold text-foreground">{group.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={item.isActive} className="h-8 text-sm">
                                            <a href={item.url}>{item.title}</a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}

                {/* Collapsible Groups */}
                {data.writing.map((group) => (
                    <Collapsible key={group.title} defaultOpen className="group/collapsible">
                        <SidebarGroup>
                            <SidebarGroupLabel asChild>
                                <CollapsibleTrigger className="font-semibold text-foreground">
                                    {group.title}
                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {group.items.map((item) => (
                                            <SidebarMenuItem key={item.title}>
                                                <SidebarMenuButton asChild className="h-8 text-sm">
                                                    <a href={item.url}>{item.title}</a>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </CollapsibleContent>
                        </SidebarGroup>
                    </Collapsible>
                ))}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
\"\"\""""

docs_layout_content = """\"\"\"
import { DocsSidebar } from "@/components/docs-sidebar"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Search, Sun, Moon, Github, Languages, Rocket, Coffee, ChevronDown, Menu, Paintbrush, Command } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DocsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative flex min-h-screen flex-col">
            <header className="bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-lg">
                <div className="container flex h-14 max-w-screen-2xl items-center gap-2 px-4 md:px-8">
                    <div className="hidden mr-4 md:flex">
                        <a className="flex items-center gap-2 mr-6" href="/">
                            <span className="hidden font-bold sm:inline-block">shadcn-docs</span>
                        </a>
                        <nav className="flex items-center gap-6 text-sm font-medium">
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1" href="/docs">
                                Docs <ChevronDown className="h-3 w-3" />
                            </a>
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60 flex items-center gap-1" href="/docs">
                                Credits <ChevronDown className="h-3 w-3" />
                            </a>
                            <a className="transition-colors hover:text-foreground/80 text-foreground/60" href="/blog">
                                Blog
                            </a>
                        </nav>
                    </div>

                    <Button variant="ghost" className="inline-flex md:hidden h-9 w-9 items-center justify-center px-0">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>

                    <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                        <div className="w-full flex-1 md:w-auto md:flex-none">
                            <button className="inline-flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-8 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64">
                                <span className="hidden lg:inline-flex">Search...</span>
                                <span className="inline-flex lg:hidden">Search...</span>
                                <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                                    <span className="text-xs">⌘</span>K
                                </kbd>
                            </button>
                        </div>
                        <nav className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Languages className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Paintbrush className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Coffee className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Github className="h-4 w-4" />
                            </Button>
                        </nav>
                    </div>
                </div>
            </header>
            
            <div className="flex-1">
                <SidebarProvider className="min-h-[calc(100vh-3.5rem)]">
                    <DocsSidebar className="top-14" />
                    <SidebarInset>
                        {children}
                    </SidebarInset>
                </SidebarProvider>
            </div>
        </div>
    )
}
\"\"\""""

with open("/Users/hilarioferreira/SwiftSync/components/docs-sidebar.tsx", "w") as f:
    f.write(docs_sidebar_content.strip('"'))

with open("/Users/hilarioferreira/SwiftSync/app/docs/layout.tsx", "w") as f:
    f.write(docs_layout_content.strip('"'))
