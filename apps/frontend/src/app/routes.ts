import {
  index,
  layout,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.route.tsx"),
  route("/dashboard", "routes/dashboard.route.tsx"),
  route("/playground", "routes/playground.route.tsx"),
  route("/calls", "routes/calls-dashboard.route.tsx"),
  route("/calls/:callId", "routes/call-detail.route.tsx"),
  route("/realtime-call", "routes/realtime-call.route.tsx"),
  route("/*", "routes/not-found.route.tsx"),
] satisfies RouteConfig;
