"use client"

import * as React from "react"
import { DatePickerV1 } from "@/components/date-picker-v1"
import { DatePickerV2 } from "@/components/date-picker-v2"
import { DatePickerV3 } from "@/components/date-picker-v3"

export default function PickerTestPage() {
  const [v1, setV1] = React.useState("")
  const [v2, setV2] = React.useState("")
  const [v3, setV3] = React.useState("")

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Date Picker Comparison</h1>
      <p className="text-muted-foreground mb-8">
        Click each one to try it out. Tell me which you prefer.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* V1 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">V1 — Standard Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Classic popover calendar. Arrow buttons to navigate months. Click a
              day to select. Used by shadcn, Ant Design, MUI, Carbon.
            </p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <label className="text-sm font-medium mb-2 block">Date of Birth</label>
            <DatePickerV1 value={v1} onChange={setV1} />
            {v1 && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {v1}
              </p>
            )}
          </div>
        </div>

        {/* V2 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">V2 — Dropdown Navigation</h2>
            <p className="text-sm text-muted-foreground">
              Calendar with month &amp; year dropdowns for fast jumping. Great
              for DOB or far-away dates. shadcn&apos;s recommended DOB pattern.
            </p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <label className="text-sm font-medium mb-2 block">Date of Birth</label>
            <DatePickerV2 value={v2} onChange={setV2} />
            {v2 && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {v2}
              </p>
            )}
          </div>
        </div>

        {/* V3 */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">V3 — Input + Calendar</h2>
            <p className="text-sm text-muted-foreground">
              Type the date directly (auto-formats as you type). Calendar icon
              opens an assist calendar. Best for power users.
            </p>
          </div>
          <div className="border rounded-lg p-4 bg-card">
            <label className="text-sm font-medium mb-2 block">Date of Birth</label>
            <DatePickerV3 value={v3} onChange={setV3} />
            {v3 && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {v3}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
