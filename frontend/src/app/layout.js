import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'sonner';
import "./globals.css";

export const metadata = {
  title: "AI Teacher Assistant",
  description: "Vlerësim automatik me AI",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="sq">
      <body>
        <AuthProvider>
          {children}
          {/* Shtuam Toaster për njoftimet e menjëhershme */}
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </body>
    </html>
  );
}