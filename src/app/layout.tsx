import type { Metadata } from "next";
import Link from 'next/link';
import "./globals.css";

export const metadata: Metadata = {
  title: "교육 일정 & 강사료 관리 앱",
  description: "음성으로 등록하고, 자동으로 계산하는 교육 일정 관리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className="app-container">
          
          {/* Desktop Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-header">
              <i className="material-icons">menu</i>
              교육 일정 관리
            </div>
            <nav className="sidebar-nav">
              <Link href="/" className="nav-item">
                <i className="material-icons">home</i>
                대시보드
              </Link>
              <Link href="/schedule" className="nav-item">
                <i className="material-icons">calendar_today</i>
                일정 관리
              </Link>
              <Link href="/calc" className="nav-item">
                <i className="material-icons">calculate</i>
                강사료 계산
              </Link>
              <Link href="/stats" className="nav-item">
                <i className="material-icons">bar_chart</i>
                통계
              </Link>
              <Link href="/settings" className="nav-item">
                <i className="material-icons">settings</i>
                설정
              </Link>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="main-content">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="bottom-nav">
            <Link href="/" className="bottom-nav-item">
              <i className="material-icons">home</i>
              홈
            </Link>
            <Link href="/schedule" className="bottom-nav-item">
              <i className="material-icons">calendar_today</i>
              일정
            </Link>
            <Link href="/calc" className="bottom-nav-item">
              <i className="material-icons">calculate</i>
              계산
            </Link>
            <Link href="/stats" className="bottom-nav-item">
              <i className="material-icons">bar_chart</i>
              통계
            </Link>
            <Link href="/settings" className="bottom-nav-item">
              <i className="material-icons">settings</i>
              설정
            </Link>
          </nav>
          
        </div>
      </body>
    </html>
  );
}
