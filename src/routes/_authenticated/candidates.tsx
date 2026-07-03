import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidates")({
  component: CandidatesLayout,
});

function CandidatesLayout() {
  return <Outlet />;
}
