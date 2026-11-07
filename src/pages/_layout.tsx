import { LiveDataProvider } from "@/contexts/LiveDataContext";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { Outlet, useLocation } from "react-router-dom";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, useReducedMotion } from "motion/react";
import { useViewTransitionActive } from "@/lib/viewTransitionState";
import { RevealBoundary } from "@/components/motion/reveal";

const IndexLayout = () => {
  const InnerLayout = () => {
    const { publicInfo } = usePublicInfo();
    const isMobile = useIsMobile();
    const location = useLocation();
    const viewTransitionActive = useViewTransitionActive();
    const reducedMotion = useReducedMotion();
    const routeSection = location.pathname.split("/").filter(Boolean)[0] ?? "home";
    const bgUrlDesktop = publicInfo?.theme_settings?.backgroundImageUrlDesktop;
    const bgUrlMobile = publicInfo?.theme_settings?.backgroundImageUrlMobile;
    const bgUrl = isMobile ? bgUrlMobile || bgUrlDesktop : bgUrlDesktop;

    const transition = reducedMotion
      ? { duration: 0 }
      : { duration: 0.12, ease: "easeOut" as const };

    return (
      <div
        className="app-shell min-h-screen flex flex-col bg-white text-black dark:bg-[#0A0A0A] dark:text-[#F2F2F2] font-sans"
        style={{
          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
          backgroundSize: bgUrl ? "cover" : undefined,
          backgroundPosition: bgUrl ? "center" : undefined,
          backgroundAttachment: bgUrl ? "fixed" : undefined,
        }}
      >
        <NavBar />
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-8 xl:px-12 py-8">
          <motion.div
            key={routeSection}
            initial={viewTransitionActive ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={transition}
          >
            <RevealBoundary>
              <Outlet />
            </RevealBoundary>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  };

  return (
    <LiveDataProvider>
      <InnerLayout />
    </LiveDataProvider>
  );
};

export default IndexLayout;
