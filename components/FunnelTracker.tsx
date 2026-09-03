"use client";

import { useEffect } from "react";
import { trackFunnelEventAction } from "@/app/actions";

export default function FunnelTracker({ event, source }: { event: "landing_view" | "company_view" | "share_started" | "signup_started"; source?: string }) {
  useEffect(() => { void trackFunnelEventAction(event, source); }, [event, source]);
  return null;
}
