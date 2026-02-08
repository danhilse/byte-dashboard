import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ContactStatusBadge,
  TaskPriorityBadge,
  TaskStatusBadge,
  WorkflowStatusBadge,
} from "@/components/common/status-badge"

describe("components/common/status-badge", () => {
  it("renders configured contact label and badge variant", () => {
    render(<ContactStatusBadge status="active" />)

    const badge = screen.getByText("Active")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute("data-variant", "default")
  })

  it("renders workflow status label from config", () => {
    render(<WorkflowStatusBadge status="in_review" />)

    const badge = screen.getByText("In Review")
    expect(badge).toHaveAttribute("data-variant", "default")
  })

  it("falls back to outline variant for unknown workflow status", () => {
    render(<WorkflowStatusBadge status={"unknown" as never} />)

    const badge = screen.getByText("unknown")
    expect(badge).toHaveAttribute("data-variant", "outline")
  })

  it("renders task status and priority labels", () => {
    render(
      <>
        <TaskStatusBadge status="in_progress" />
        <TaskPriorityBadge priority="urgent" />
      </>
    )

    expect(screen.getByText("In Progress")).toHaveAttribute("data-variant", "default")
    expect(screen.getByText("Urgent")).toHaveAttribute("data-variant", "destructive")
  })
})
