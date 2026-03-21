import os

docs_sidebar_content = """\"\"\"
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
    SidebarRail,
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
            <SidebarRail />
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
\"\"\""""

docs_page_content = """\"\"\"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronRight, Star, CircleAlert, Coffee, Twitter, Github, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default function DocsPage() {
    return (
        <div className="container flex-1 items-start md:grid md:grid-cols-[1fr_220px] md:gap-6 lg:grid-cols-[1fr_240px] lg:gap-10 max-w-screen-2xl mx-auto px-4 md:px-8">
            <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_300px]">
                <div className="mx-auto w-full min-w-0">
                    <div className="mb-4 flex items-center space-x-1 text-sm text-muted-foreground">
                        <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                            Getting started
                        </div>
                        <ChevronRight className="h-4 w-4" />
                        <div className="font-medium text-foreground">Introduction</div>
                    </div>
                    <div className="space-y-2">
                        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Introduction</h1>
                        <p className="text-xl text-muted-foreground">
                            shadcn-docs-nuxt is a Nuxt documentation template built with Nuxt Content and shadcn-vue.
                        </p>
                    </div>
                    <div className="pb-12 pt-8">
                        <div className="prose prose-gray dark:prose-invert max-w-none">
                            <h2 id="motivations" className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                                Motivations
                            </h2>
                            <p className="leading-7 [&:not(:first-child)]:mt-6">
                                <strong>shadcn-docs-nuxt</strong> is created as a free alternative documentation solution to <a href="#" className="font-medium underline underline-offset-4">Docus</a> and <a href="#" className="font-medium underline underline-offset-4">Nuxt UI Pro Docs</a>.
                            </p>

                            <h2 id="features" className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-10">
                                Features
                            </h2>
                            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
                                <li>Free and <a href="#" className="font-medium underline underline-offset-4">open source</a>.</li>
                                <li>Fully <a href="#" className="font-medium underline underline-offset-4">customizable</a>.</li>
                                <li>Rich <a href="#" className="font-medium underline underline-offset-4">components</a> to work with.</li>
                                <li>Mobile support.</li>
                                <li>Indexed searching powered by Nuxt Content.</li>
                                <li>Partial component compatibility with <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">Docus</code>, <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">Nuxt UI Pro Docs</code>, <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">undocs</code>.</li>
                            </ul>

                            <h2 id="credits" className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-10">
                                Credits
                            </h2>
                            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
                                <li><a href="#" className="font-medium underline underline-offset-4">Nuxt Content</a>: Content made easy for Vue Developers.</li>
                                <li><a href="#" className="font-medium underline underline-offset-4">shadcn-ui</a>: For the beautiful component & docs design.</li>
                                <li><a href="#" className="font-medium underline underline-offset-4">shadcn-vue</a>: For the vue port of shadcn-ui & some docs component source.</li>
                                <li><a href="#" className="font-medium underline underline-offset-4">Docus</a>: For inspiration & some docs component source.</li>
                                <li><a href="#" className="font-medium underline underline-offset-4">Nuxt UI Pro Docs</a>: For inspiration.</li>
                            </ul>

                            <h2 id="who-is-using" className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-10">
                                Who's Using
                            </h2>
                            <ul className="my-6 ml-6 list-disc [&>li]:mt-2">
                                <li><a href="#" className="font-medium underline underline-offset-4">unovue/inspira-ui</a> 3.1K ⭐️</li>
                                <li><a href="#" className="font-medium underline underline-offset-4">unjs/magic-regexp</a> 4K ⭐️</li>
                                <li><a href="#" className="font-medium underline underline-offset-4">nuxt-monaco-editor</a></li>
                                <li><a href="#" className="font-medium underline underline-offset-4">nuxt-umami</a></li>
                                <li><a href="#" className="font-medium underline underline-offset-4">Msty</a></li>
                                <li><a href="#" className="font-medium underline underline-offset-4">Archiver</a></li>
                                <li><a href="#" className="font-medium underline underline-offset-4">ePoc</a></li>
                                <li><a href="#" className="font-medium underline underline-offset-4">Add your project 🚀</a></li>
                            </ul>

                            <h2 id="license" className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-10">
                                License
                            </h2>
                            <p className="leading-7 [&:not(:first-child)]:mt-6">
                                <a href="#" className="font-medium underline underline-offset-4">MIT</a>
                            </p>
                        </div>
                        
                        <div className="flex flex-row items-center justify-between pt-12">
                            <div />
                            <Link href="#" className="group flex flex-col items-end gap-1 rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Next</span>
                                <span className="font-medium flex items-center">
                                    Installation <ChevronRight className="ml-1 h-4 w-4" />
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="hidden text-sm xl:block pl-8">
                    <div className="sticky top-20 -mt-10 h-[calc(100vh-3.5rem)] overflow-hidden pt-4">
                        <div className="pb-10">
                            <div className="space-y-2">
                                <p className="font-medium">On this page</p>
                                <ul className="m-0 list-none">
                                    <li className="mt-0 pt-2">
                                        <a href="#motivations" className="inline-block no-underline transition-colors hover:text-foreground text-muted-foreground">
                                            Motivations
                                        </a>
                                    </li>
                                    <li className="mt-0 pt-2">
                                        <a href="#features" className="inline-block no-underline transition-colors hover:text-foreground text-muted-foreground">
                                            Features
                                        </a>
                                    </li>
                                    <li className="mt-0 pt-2">
                                        <a href="#credits" className="inline-block no-underline transition-colors hover:text-foreground text-muted-foreground">
                                            Credits
                                        </a>
                                    </li>
                                    <li className="mt-0 pt-2">
                                        <a href="#who-is-using" className="inline-block no-underline transition-colors hover:text-foreground text-muted-foreground">
                                            Who's Using
                                        </a>
                                    </li>
                                    <li className="mt-0 pt-2">
                                        <a href="#license" className="inline-block no-underline transition-colors hover:text-foreground text-muted-foreground">
                                            License
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            
                            <Separator className="my-6" />
                            
                            <div className="flex flex-col gap-2">
                                <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                                    <Star className="h-4 w-4" /> Star on GitHub <ArrowUpRight className="h-3 w-3 ml-auto" />
                                </a>
                                <a href="#" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                                    <CircleAlert className="h-4 w-4" /> Create Issues <ArrowUpRight className="h-3 w-3 ml-auto" />
                                </a>
                            </div>

                             <div className="mt-6 flex gap-4">
                                <Coffee className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                                <Twitter className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                                <Github className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                             </div>

                             <div className="mt-8 rounded-lg border bg-card text-card-foreground shadow-sm">
                                 <div className="flex flex-col space-y-1.5 p-6 items-center text-center">
                                    <div className="bg-foreground text-background w-12 h-12 flex items-center justify-center rounded-md mb-4">
                                        <span className="font-bold text-2xl">D</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Design and Development tips in your inbox. Every weekday.
                                    </p>
                                 </div>
                             </div>
                             <div className="mt-2 text-center">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ads via Carbon</span>
                             </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
\"\"\""""

with open("/Users/hilarioferreira/SwiftSync/components/docs-sidebar.tsx", "w") as f:
    f.write(docs_sidebar_content.strip('"'))

with open("/Users/hilarioferreira/SwiftSync/app/docs/page.tsx", "w") as f:
    f.write(docs_page_content.strip('"'))
