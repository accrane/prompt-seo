import { SegmentedNav } from "@/components/ui/segmented-nav";

/** Tabs shared by every page inside a project. */
export function ProjectNav({
  projectId,
  counts,
}: {
  projectId: string;
  counts?: { pages?: number; tasks?: number };
}) {
  const base = `/projects/${projectId}`;
  return (
    <SegmentedNav
      ariaLabel="Project sections"
      items={[
        { href: `${base}/overview`, label: "Overview" },
        { href: `${base}/intake`, label: "Intake" },
        { href: `${base}/runs`, label: "Runs" },
        { href: `${base}/pages`, label: "Pages", count: counts?.pages },
        { href: `${base}/checklist`, label: "Checklist", count: counts?.tasks },
      ]}
    />
  );
}
