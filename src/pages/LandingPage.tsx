import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileDown, Grid3x3, Layout, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getGlassmorphismStyles, getColor } from '@/styles/glassmorphism-styles';
import { APP_HOME, PRIVACY, TERMS } from '@/config/routes';
import { Telemetry } from '@/utils/telemetry';

const BRAND_CYAN = '#21d4fc';
const PRODUCT_PREVIEW_SRC = '/product-sample-02.webp';
/** Landing page canvas — opaque so the global body aurora does not show through. */
const LANDING_PAGE_BG = '#050505';

/** Preserve inbound UTM/query params and tag the CTA source when sending users to the app. */
function buildAppUrl(searchParams: URLSearchParams, source: string): string {
  const params = new URLSearchParams(searchParams);
  params.set('source', source);
  return `${APP_HOME}?${params.toString()}`;
}

// Sample PDF asset not yet in /public — add e.g. /sample-storyboard.pdf and wire SAMPLE_PDF_HREF.
const SAMPLE_PDF_HREF: string | null = null;

const WORKFLOW_STEPS = [
  { icon: Upload, title: 'Upload frames', description: 'Bring in your images, artwork, or references for shots.' },
  { icon: Grid3x3, title: 'Arrange shots', description: 'Arrange your sequence while keeping your shots organized.' },
  { icon: Layout, title: 'Adjust layout', description: 'Customize page size, aspect ratio, and template designs.' },
  { icon: FileDown, title: 'Export PDF', description: 'Generate a PDF or PNG version of your project for review.' },
] as const;

const heroPrimaryCtaStyle = {
  backgroundColor: BRAND_CYAN,
  color: getColor('brand', 'dark') as string,
  border: 'none',
  fontWeight: 600,
} as const;

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const headerAppHref = useMemo(
    () => buildAppUrl(searchParams, 'homepage_header'),
    [searchParams]
  );
  const heroAppHref = useMemo(
    () => buildAppUrl(searchParams, 'homepage_hero'),
    [searchParams]
  );

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

      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 sm:py-16 w-full space-y-20 pb-24">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight"
              style={{ color: getColor('text', 'primary') as string }}
            >
              <span className="whitespace-nowrap">Storyboard layout</span>{' '}
              <span className="whitespace-nowrap">fast and easy.</span>
            </h1>
            <p
              className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0"
              style={{ color: getColor('text', 'secondary') as string }}
            >
              Upload your frames, arrange your shots, customize the layout, and export your
              storyboard in minutes using a dynamic template.
            </p>
            <div className="inline-grid gap-3 pt-2 w-fit max-w-full mx-auto lg:mx-0 grid-cols-[max-content_max-content] max-[400px]:grid-cols-1">
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
                  Start a free storyboard
                </Link>
              </Button>
              {SAMPLE_PDF_HREF ? (
                <Button
                  asChild
                  size="lg"
                  className="whitespace-nowrap max-[400px]:w-full"
                  style={getGlassmorphismStyles('buttonSecondary')}
                >
                  <a
                    href={SAMPLE_PDF_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => Telemetry.event('cta_clicked', { source: 'homepage_example_pdf' })}
                  >
                    View example PDF
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  disabled
                  title="Example PDF coming soon — add /public/sample-storyboard.pdf"
                  className="whitespace-nowrap max-[400px]:w-full opacity-60 cursor-not-allowed"
                  style={getGlassmorphismStyles('buttonSecondary')}
                >
                  View example PDF
                </Button>
              )}
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

        <div className="text-center space-y-20">
        <section className="space-y-6">
          <h2
            className="text-xl font-semibold"
            style={{ color: getColor('text', 'primary') as string }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WORKFLOW_STEPS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-lg p-4 space-y-2 text-center"
                style={getGlassmorphismStyles('content')}
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

        <section
          className="rounded-lg p-6 space-y-3 max-w-3xl mx-auto"
          style={getGlassmorphismStyles('content')}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: getColor('text', 'primary') as string }}
          >
            Stop fighting with storyboard templates
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: getColor('text', 'secondary') as string }}>
            StoryboardFlow replaces the manual workflow of rebuilding storyboard templates in programs like 
            Illustrator, InDesign, Canva, or Google Slides. Stop wasting time trying to manage your layouts in softwares that are designed to do everything, StoryboardFlow was designed to do one thing and do it the best. 
          </p>
        </section>

        <section className="mx-auto">
          <p
            className="text-lg sm:text-xl font-bold leading-relaxed"
            style={{ color: getColor('text', 'primary') as string }}
          >
            <span className="whitespace-nowrap">Made for storyboard artists, animators, motion designers,</span>{' '}
            <span className="whitespace-nowrap">directors, and video producers.</span>
          </p>
        </section>

        
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
