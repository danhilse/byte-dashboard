import { HelpCircle, MessageCircle, Book, Mail } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const supportOptions = [
  {
    title: "Documentation",
    description: "Browse our comprehensive guides and tutorials",
    icon: Book,
    href: "#",
  },
  {
    title: "Contact Support",
    description: "Get in touch with our support team",
    icon: Mail,
    href: "#",
  },
  {
    title: "Live Chat",
    description: "Chat with our support agents in real-time",
    icon: MessageCircle,
    href: "#",
  },
]

export default function SupportPage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Support" }]} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">
            Get help and find answers to your questions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {supportOptions.map((option) => (
            <Card key={option.title} className="hover:bg-muted/50 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <option.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription>{option.description}</CardDescription>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={option.href}>
                    <HelpCircle className="mr-2 size-4" />
                    Learn More
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Common questions and answers about using the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8 text-muted-foreground">
            <HelpCircle className="mx-auto mb-4 size-12 opacity-50" />
            <p>FAQ section coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
