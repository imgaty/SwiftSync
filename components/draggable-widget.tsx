"use client"

import * as React from "react";

export default function DraggableWidget({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col bg-card rounded-xl shadow-sm overflow-hidden border | ${className}`}
      style={{ minWidth: 0 }}
    >
      {title && (
        <div className="px-3 py-2 border-b | text-sm font-medium | bg-muted/40">
          {title}
        </div>
      )}

      <div className="p-3 flex-1 min-h-[150px]">{children}</div>
    </div>
  );
}
