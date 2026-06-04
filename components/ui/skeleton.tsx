//
//  skeleton.tsx
//  Argent
//
//  Created by Hilario Ferreira on 08 December 2025 at 19:38.
//  Description: Defines the reusable Skeleton UI primitive for Argent, centralizing styling, composition
//  behavior, and accessibility-facing structure for consistent interfaces.
//  Last changed by hilario on 30 May 2026 at 19:35.
//
import { UDS } from "@/lib/UDS"
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot = "skeleton" className = {cn("animate-pulse sq-md", UDS.subtleFill, className)}
			{...props}
		/>
	)
}

export { Skeleton }
