export default function OAuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Grows past the viewport instead of clipping, so the consent page scrolls
  // on short phones.
  return (
    <div className="flex min-h-dvh items-center justify-center overflow-x-hidden">
      {children}
    </div>
  );
}
