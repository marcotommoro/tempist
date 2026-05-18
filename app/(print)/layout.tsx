import "../globals.css";

/**
 * Layout per pagine print-friendly. Niente sidebar/topbar.
 * Auth è verificato dalle singole pagine via requireActiveOrganization.
 */
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="max-w-3xl mx-auto p-6 print:p-0">{children}</div>;
}
