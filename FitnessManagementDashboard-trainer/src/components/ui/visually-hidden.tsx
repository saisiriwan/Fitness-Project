"use client";

import * as React from "react";
import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";

import { cn } from "./utils";

function VisuallyHidden({
  className,
  ...props
}: React.ComponentProps<typeof VisuallyHiddenPrimitive.Root>) {
  return (
    <VisuallyHiddenPrimitive.Root
      className={cn("sr-only", className)}
      {...props}
    />
  );
}

export { VisuallyHidden };