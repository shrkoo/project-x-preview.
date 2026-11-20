"use client";

import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon; className?: string; fill?: string; "aria-hidden"?: boolean };

export default function AppIcon({ icon: Icon, className, fill = "none", "aria-hidden": ariaHidden = true }: Props) {
  return <Icon className={className} size={24} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" color="currentColor" fill={fill} aria-hidden={ariaHidden} />;
}
