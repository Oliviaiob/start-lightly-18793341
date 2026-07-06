import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/compliance")({
  component: () => <Outlet />,
});
