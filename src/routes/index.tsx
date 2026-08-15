import { createFileRoute, redirect } from "@tanstack/react-router";

// The whole product is a standalone HTML/CSS/vanilla-JS site served from
// /resume-builder/. "/" simply forwards to its index.html.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: "/resume-builder/index.html" });
  },
  head: () => ({
    meta: [
      { title: "ResumeCraft — Build a Professional Resume in Minutes" },
      {
        name: "description",
        content:
          "ResumeCraft is a free browser-based resume builder with live preview, 4 templates, ATS mode and PDF export.",
      },
      { property: "og:title", content: "ResumeCraft — Build a Professional Resume in Minutes" },
      {
        property: "og:description",
        content: "Build a professional resume. Get noticed. Get hired.",
      },
    ],
  }),
  component: () => null,
});
