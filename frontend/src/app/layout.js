import { AuthProvider } from '../context/AuthContext';
import "./globals.css";

export const metadata = {
  title: "AI Teacher Assistant",
  description: "Vlerësim automatik me AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sq">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}