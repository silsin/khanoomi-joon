import AnnouncementBar  from "./components/AnnouncementBar";
import Navbar           from "./components/Navbar";
import PromoStrip       from "./components/PromoStrip";
import HomeSections     from "./components/HomeSections";
import Footer           from "./components/Footer";

export default function Home() {
  return (
    <main style={{ backgroundColor: "var(--dg-bg)", minHeight: "100vh" }}>
      <AnnouncementBar />
      <Navbar />
      <PromoStrip />
      <HomeSections />
      <Footer />
    </main>
  );
}
