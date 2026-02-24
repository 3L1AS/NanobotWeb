import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Nanobot Web Dashboard',
    description: 'A luxurious dashboard to manage your nanobot',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body>
                {children}
            </body>
        </html>
    );
}
