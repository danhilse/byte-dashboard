"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Monitor, Palette } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function CustomizationsSettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the application looks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label>Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="mr-2 size-4" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="mr-2 size-4" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
              >
                <Monitor className="mr-2 size-4" />
                System
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize your organization's branding elements.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-[150px] items-center justify-center text-muted-foreground">
          Custom branding options coming soon.
        </CardContent>
      </Card>
    </div>
  )
}
