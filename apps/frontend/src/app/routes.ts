import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.route.tsx"),
  route("/audio", "routes/audio.route.tsx"),
  route("/*", "routes/not-found.route.tsx"),
] satisfies RouteConfig;
