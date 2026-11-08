import { LiveDataProvider } from "@/contexts/LiveDataContext";
import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useViewTransitionActive } from "@/lib/viewTransitionState";
import { RevealBoundary } from "@/components/motion/reveal";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import {
  DEFAULT_BODY_FONT,
  DEFAULT_DISPLAY_FONT,
  applyThemeFonts,
  resolveFontFamilyKey,
} from "@/lib/font-store";

const IndexLayout = () => {
  const InnerLayout = () => {
    const { publicInfo } = usePublicInfo();
    const location = useLocation();
    const viewTransitionActive = useViewTransitionActive();
    const reducedMotion = useReducedMotion();
    const routeSection = location.pathname.split("/").filter(Boolean)[0] ?? "home";
    const configuredDisplayFont =
      publicInfo?.theme_settings?.displayFont ??
      publicInfo?.theme_settings?.fontFamily;
    const configuredBodyFont = publicInfo?.theme_settings?.bodyFont;

    // 字体来自主题配置 theme_settings.displayFont / theme_settings.bodyFont，
    // 未配置时分别回退默认字体（Space Grotesk / Inter Tight）。
    useEffect(() => {
      applyThemeFonts(
        resolveFontFamilyKey(configuredDisplayFont, DEFAULT_DISPLAY_FONT),
        resolveFontFamilyKey(configuredBodyFont, DEFAULT_BODY_FONT),
      );
    }, [configuredDisplayFont, configuredBodyFont]);

    const transition = reducedMotion
      ? { duration: 0 }
      : { duration: 0.12, ease: "easeOut" as const };

    return (
      <div className="app-shell min-h-screen flex flex-col bg-white text-black dark:bg-[#0A0A0A] dark:text-[#F2F2F2] font-sans">
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
