import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribeMobile(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getMobileSnapshot(): boolean {
  if (typeof window === "undefined") return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getMobileServerSnapshot(): boolean {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeMobile,
    getMobileSnapshot,
    getMobileServerSnapshot
  )
}
