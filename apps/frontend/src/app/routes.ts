import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  // Public routes
  index("routes/home.route.tsx"),
  route("/login", "routes/login.route.tsx"),
  route("/pending-access", "routes/pending-access.route.tsx"),

  // ROOT dashboard
  route("/dashboard/root", "routes/root-dashboard.route.tsx"),
  route(
    "/dashboard/root/session/:companyId",
    "routes/root-session.route.tsx",
  ),

  // User dashboard
  route("/dashboard", "routes/user-dashboard.route.tsx"),
  route("/dashboard/session", "routes/user-session.route.tsx"),

  // 404
  route("/*", "routes/not-found.route.tsx"),
] satisfies RouteConfig;
