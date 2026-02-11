import { RoadmapView } from "./roadmap-view"
import backlogData from "./backlog-data.json"

export default function MvpRoadmapPage() {
  return <RoadmapView data={backlogData} />
}
