import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileDown, Grid3x3, Layout, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';
import { APP_HOME, PRIVACY, TERMS } from '@/config/routes';
import { Telemetry } from '@/utils/telemetry';

const BRAND_CYAN = '#21d4fc';
const PRODUCT_PREVIEW_SRC = '/product-sample-02.webp';
/** Landing page canvas — opaque so the global body aurora does not show through. */
const LANDING_PAGE_BG = '#050505';
/** Subtle lighter band for alternating section separation. */
const LANDING_SECTION_BAND_BG = '#0c0c0c';
/** How it works container — slightly lighter than the band for separation. */
const LANDING_HOW_IT_WORKS_CONTAINER_BG = '#111111';
/** Step cards — slightly lighter than the How it works container. */
const LANDING_HOW_IT_WORKS_CARD_BG = '#191919';

/** Preserve inbound UTM/query params and tag the CTA source when sending users to the app. */
function buildAppUrl(searchParams: URLSearchParams, source: string): string {
  const params = new URLSearchParams(searchParams);
  params.set('source', source);
  return `${APP_HOME}?${params.toString()}`;
}

function buildSampleStoryboardUrl(searchParams: URLSearchParams): string {
  const params = new URLSearchParams(searchParams);
  params.set('sample', '1');
  params.set('sampleRequest', crypto.randomUUID());
  params.set('source', 'sample_storyboard');
  return `${APP_HOME}?${params.toString()}`;
}
const WORKFLOW_STEPS = [
  { icon: Upload, title: 'Upload frames', description: 'Import images, artwork, or references for your shots.' },
  { icon: Grid3x3, title: 'Arrange shots', description: 'Arrange the sequence while keeping it organized.' },
  { icon: Layout, title: 'Customize layout', description: 'Adjust page size, aspect ratio, and template features.' },
  { icon: FileDown, title: 'Export PDF', description: 'Generate a PDF file to share or review your project.' },
] as const;

const heroPrimaryCtaStyle = {
  backgroundColor: BRAND_CYAN,
  color: getColor('brand', 'dark') as string,
  border: 'none',
  fontWeight: 600,
} as const;

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const headerAppHref = useMemo(
    () => buildAppUrl(searchParams, 'homepage_header'),
    [searchParams]
  );
  const heroAppHref = useMemo(
    () => buildAppUrl(searchParams, 'homepage_hero'),
    [searchParams]
  );
  const handleSampleStoryboardClick = () => {
    navigate(buildSampleStoryboardUrl(searchParams));
  };

  useEffect(() => {
    document.title = 'Storyboard Flow — Instant storyboard layout';
    Telemetry.event('landing_page_viewed');
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ position: 'relative', zIndex: 2, backgroundColor: LANDING_PAGE_BG }}
    >
      <header
        className="sticky top-0 z-20 border-b border-white/10"
        style={{ backgroundColor: LANDING_PAGE_BG }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" aria-label="StoryboardFlow home">
            <img
              src="/storyboardflow-whc_01.png"
              alt="StoryboardFlow"
              className="block object-contain"
              style={{ height: '32px', width: 'auto' }}
            />
          </Link>
          <Button
            asChild
            size="sm"
            className="shrink-0"
            style={heroPrimaryCtaStyle}
          >
            <Link
              to={headerAppHref}
              onClick={() => Telemetry.event('cta_clicked', { source: 'homepage_header' })}
            >
              Open app
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full pb-16 sm:pb-20">
        <div className="max-w-5xl mx-auto px-6 pt-10 sm:pt-12 pb-10 sm:pb-12">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight"
              style={{ color: getColor('text', 'primary') as string }}
            >
              <span className="whitespace-nowrap">Storyboard layout</span>{' '}
              <span className="whitespace-nowrap">fast and flexible</span>
            </h1>
            <p
              className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0"
              style={{ color: getColor('text', 'secondary') as string }}
            >
              Upload your shots, arrange the sequence, customize the template, and export your storyboard in minutes.
            </p>
            <div className="pt-2 flex flex-wrap justify-center lg:justify-start gap-3">
              <Button
                asChild
                size="lg"
                className="whitespace-nowrap max-[400px]:w-full shadow-lg shadow-cyan-500/20"
                style={heroPrimaryCtaStyle}
              >
                <Link
                  to={heroAppHref}
                  onClick={() => Telemetry.event('cta_clicked', { source: 'homepage_hero' })}
                >
                  Create a storyboard
                </Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="whitespace-nowrap max-[400px]:w-full"
                onClick={handleSampleStoryboardClick}
              >
                Sample storyboard
              </Button>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden border shadow-lg shadow-cyan-500/10"
            style={{
              borderColor: 'rgba(33, 212, 252, 0.25)',
              backgroundColor: 'rgba(15, 30, 49, 0.4)',
            }}
          >
            <img
              src={PRODUCT_PREVIEW_SRC}
              alt="StoryboardFlow storyboard layout and PDF export preview"
              className="w-full h-auto block"
              loading="eager"
              decoding="async"
            />
          </div>
        </section>
        </div>

        <div
          className="py-8 sm:py-10"
          style={{ backgroundColor: LANDING_SECTION_BAND_BG }}
        >
          <div className="max-w-5xl mx-auto px-6 space-y-10">
        <section className="flex justify-center items-center w-full">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight text-center max-w-4xl mx-auto"
            style={{ color: getColor('text', 'primary') as string }}
          >
            Made for creators planning visual sequences
          </h2>
        </section>

        <div className="text-center">
        <section
          className="rounded-xl p-6 sm:p-8 space-y-6 border-no"
          style={{
            backgroundColor: LANDING_HOW_IT_WORKS_CONTAINER_BG,
            borderColor: 'rgba(33, 212, 252, 0.25)',
          }}
        >
          <h2
            className="text-3xl font-semibold"
            style={{ color: getColor('text', 'primary') as string }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW_STEPS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-lg p-4 space-y-2 text-center"
                style={{
                  ...getGlassmorphismStyles('content'),
                  backgroundColor: LANDING_HOW_IT_WORKS_CARD_BG,
                }}
              >
                <Icon
                  className="h-6 w-6 mx-auto"
                  style={{ color: getColor('brand', 'primary') as string }}
                  aria-hidden
                />
                <h3
                  className="text-sm font-semibold"
                  style={{ color: getColor('text', 'primary') as string }}
                >
                  {title}
                </h3>
                <p className="text-sm" style={{ color: getColor('text', 'secondary') as string }}>
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>
        </div>
          </div>
        </div>

        <div
          className="py-12 sm:py-16"
          style={{ backgroundColor: LANDING_PAGE_BG }}
        >
          <div className="max-w-5xl mx-auto px-6 text-center">
        <section className="w-full max-w-5xl mx-auto space-y-5 sm:space-y-6">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight"
            style={{ color: getColor('text', 'primary') as string }}
          >
            Stop rebuilding static storyboard templates.
          </h2>
          <p
            className="text-base sm:text-lg leading-relaxed max-w-4xl mx-auto"
            style={{ color: getColor('text', 'secondary') as string }}
          >
          StoryboardFlow gives you a dynamic storyboard layout template that adapts as your sequence changes. Add frames, rearrange shots, adjust the template, and keep your visual plan organized without manually rebuilding pages in Illustrator, InDesign, Canva, or Google Slides. 
          </p>
        </section>
          </div>
        </div>
      </main>

      <footer
        className="border-t border-white/10 py-6"
        style={{ backgroundColor: 'rgba(15, 30, 49, 0.5)' }}
      >
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p style={{ color: getColor('text', 'secondary') as string }}>
            © {new Date().getFullYear()} StoryboardFlow
          </p>
          <nav aria-label="Legal links" className="flex items-center gap-4">
            <Link
              to={PRIVACY}
              className="transition-opacity hover:opacity-80"
              style={{ color: getColor('text', 'secondary') as string }}
            >
              Privacy
            </Link>
            <Link
              to={TERMS}
              className="transition-opacity hover:opacity-80"
              style={{ color: getColor('text', 'secondary') as string }}
            >
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
