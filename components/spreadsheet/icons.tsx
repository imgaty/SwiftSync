import type { SVGProps } from "react"

/**
 * Custom spreadsheet icons in Lucide style.
 * 24×24 viewBox, stroke-based, currentColor.
 *
 * Design: full-size table/grid, with the action mark cut into the bottom-right corner.
 */

export function InsertColumn(_props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8'/>
            <path d='M12 4v16'/>
            <path d='M18 15v6'/>
            <path d='M15 18h6'/>
        </svg>
    )
}

export function DeleteColumn(_props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M12 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8'/>
            <path d='M12 4v16'/>
            <path d='M15 18h6'/>
        </svg>
    )
}

export function InsertRow(_props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M21 12V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6'/>
            <path d='M4 12h16'/>
            <path d='M18 15v6'/>
            <path d='M15 18h6'/>
        </svg>
    )
}

export function DeleteRow(_props: SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
            <path d='M21 12V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6'/>
            <path d='M4 12h16'/>
            <path d='M15 18h6'/>
        </svg>
    )
}
