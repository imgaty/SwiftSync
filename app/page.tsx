import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

import { Separator } from "@/components/ui/separator"

import {
    SidebarTrigger,
} from "@/components/ui/sidebar"

import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"

import data from "./Dashboard/data.json"



export default function Dashboard() {
    return (
        <div className = "@container/main flex flex-col flex-1 gap-6 | p-6">
            <header>
                <div className = "flex items-center gap-4">
                    <SidebarTrigger />
                    
                    <Separator orientation = "vertical" className = "data-[orientation=vertical]:h-4" />

                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem className = "hidden md:block">
                                <BreadcrumbLink href="#">
                                    Dashboard
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </header>

            <SectionCards />
            <ChartAreaInteractive />
            <DataTable data = {data} />
        </div>
    )
}