"use client";
// components/theme-color-switch.tsx
import React, { useState } from "react";
// import { useConfig } from "@/hooks/use-config";
import { Button } from "@/components/primitive/custom"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/primitive/default"
import { cn } from "@gorth/primitive/cores/cn"
import { hexToHSL } from "@/utils/temp"

const themeColors = [
  { name: "Pink", value: "#FF00AA" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Green", value: "#22C55E" },
  { name: "Purple", value: "#A855F7" },
  { name: "Orange", value: "#F97316" },
  { name: "Red", value: "#EF4444" },
] as const

export function ThemeColorSwitch() {
  const [currentColor, setCurrentColor] = useState<typeof themeColors[number]["value"]>(themeColors[0].value)

  const handleColorChange = (color: typeof themeColors[number]["value"]) => {
    setCurrentColor(color)
    // Convert hex to HSL
    const hsl = hexToHSL(color)
    // Update CSS variables
    document.documentElement.style.setProperty('--primary', hsl)
    document.documentElement.style.setProperty('--ring', hsl)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-10 h-10 p-0">
          <div
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: currentColor }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="grid grid-cols-3 gap-2">
          {themeColors.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorChange(color.value)}
              className={cn(
                "w-full aspect-square rounded-md border-2 transition-all",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                currentColor === color.value ? "border-primary" : "border-transparent"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// export function ThemeSwitcher() {
//   // const [config] = useConfig();
//   const segment = useSelectedLayoutSegment();
//
//   React.useEffect(() => {
//     document.body.classList.forEach((className) => {
//       if (className.match(/^theme.*/)) {
//         document.body.classList.remove(className);
//       }
//     });
//
//     const theme = segment === "themes" ? config.theme : null;
//     if (theme) {
//       return document.body.classList.add(`theme-${theme}`);
//     }
//   }, [segment, config.theme]);
//
//   return null;
// }
