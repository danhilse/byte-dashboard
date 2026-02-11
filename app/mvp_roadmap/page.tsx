import { RoadmapView } from "./roadmap-view"
import backlogData from "@/context/TBD_PHASE2.json"

export default function MvpRoadmapPage() {
  return <RoadmapView data={backlogData} />
}
