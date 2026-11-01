import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "./components/CartContext";
import ThemeLoader from "./components/ThemeLoader";
import GapifyChat from "./components/GapifyChat";
import SplashScreen from "./components/SplashScreen";

const kavenegarPushAppId = process.env.NEXT_PUBLIC_KAVENEGAR_PUSH_APP_ID;

export const metadata: Metadata = {
  title: "گالری طلای خانوم جون | زیبایی، ماندگار مثل طلا",
  description: "فروشگاه اینترنتی طلا و جواهرات گالری طلای خانوم جون - ارسال امن و سریع به سراسر ایران",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        {kavenegarPushAppId && (
          <script
            src={`https://cdn.kavenegar.com/sdk/page.js?appId=${kavenegarPushAppId}`}
            defer
            charSet="utf-8"
          />
        )}
      </head>
      <body>
        <SplashScreen />
        <ThemeLoader />
        <CartProvider>{children}</CartProvider>
        <GapifyChat />
      </body>
    </html>
  );
}
