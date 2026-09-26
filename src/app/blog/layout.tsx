import "./blog.css";
import { GoogleAnalytics } from "@/lib/analytics/ga";

/**
 * The guides carry the analytics tag, the same as the rest of the public
 * site. They are the pages people arrive on from a search, so leaving them
 * out meant the one surface whose traffic actually needed measuring was the
 * one surface not being measured.
 *
 * It stays off /app and off a parent's progress page, which is the line that
 * matters: a parent opening a link about their child's visa application has
 * not agreed to be measured by Google.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoogleAnalytics />
      {children}
    </>
  );
}
