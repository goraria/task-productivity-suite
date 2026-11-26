export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="dark:bg-dark h-full">{children}</div>
}
