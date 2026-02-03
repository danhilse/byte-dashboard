import { redirect } from "next/navigation"

export default function ApplicationsRedirect() {
  redirect("/my-work?tab=applications")
}
