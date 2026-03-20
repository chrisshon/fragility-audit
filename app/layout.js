export const metadata = {
  title: "Operations Fragility Audit | Compound Systems",
  description: "Find out how fragile your home services business really is. 3-minute audit with actionable results.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#0C1C1C" }}>
        {children}
      </body>
    </html>
  );
}
