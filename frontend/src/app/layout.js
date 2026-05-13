import { AuthProvider } from '../context/AuthContext';
import { Toaster } from 'sonner';
import "./globals.css";
import I18nProvider from '../context/I18nProvider';

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
        <I18nProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}