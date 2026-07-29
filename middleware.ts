export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/behaviors/:path*", "/clients/:path*", "/logs/:path*", "/audit/:path*"]
};
