import { redirect } from "next/navigation"

export default function TasksRedirect() {
  redirect("/my-work?tab=tasks")
}
