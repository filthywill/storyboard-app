import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles'

export default function TermsOfService() {
  useEffect(() => {
    document.title = 'Terms of Service - Storyboard Flow'
  }, [])

  return (
    <div className="min-h-screen flex flex-col relative" style={{ position: 'relative', zIndex: 2 }}>
      {/* Header Section */}
      <div className="pt-6" style={getGlassmorphismStyles('header')}>
        <div className="max-w-7xl mx-auto px-6 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <img 
                src="/storyflow-whc_01.png" 
                alt="Storyboard Flow" 
                className="h-4 object-contain"
                style={{
                  imageRendering: 'auto',
                  maxWidth: 'none',
                  width: 'auto',
                  height: '42px',
                  filter: 'none'
                }}
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = '/'}
                className="text-white hover:bg-white/20 hover:text-white px-3 py-1.5 rounded transition-colors text-sm font-medium flex items-center"
                style={{ fontFamily: '"BBH Sans Hegarty", sans-serif' }}
              >
                <ArrowLeft className="h-4 w-4 mr-2 font-bold" />
                Back to App
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <div 
          className="p-8 rounded-lg"
          style={getGlassmorphismStyles('content')}
        >
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-white/70">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg max-w-none text-white">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-white/80 mb-4">
              By accessing and using Storyboard Flow, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p className="text-white/80 mb-4">
              Storyboard Flow is a web-based application that allows users to create, edit, and manage storyboards. The service includes:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li>Storyboard creation and editing tools</li>
              <li>Cloud synchronization of projects</li>
              <li>Image upload and management</li>
              <li>Project sharing and collaboration features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p className="text-white/80 mb-4">
              To use our service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Providing accurate and complete information</li>
              <li>Notifying us immediately of any unauthorized use</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Acceptable Use</h2>
            <p className="text-white/80 mb-4">
              You agree not to use the service to:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious code or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of the service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Intellectual Property</h2>
            <p className="text-white/80 mb-4">
              You retain ownership of all content you create using our service. By using our service, you grant us a limited license to store, process, and display your content as necessary to provide the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Privacy</h2>
            <p className="text-white/80 mb-4">
              Your privacy is important to us. Please review our <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>, which also governs your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Service Availability</h2>
            <p className="text-white/80 mb-4">
              We strive to provide reliable service, but we cannot guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue the service at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
            <p className="text-white/80 mb-4">
              To the maximum extent permitted by law, Storyboard Flow shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Termination</h2>
            <p className="text-white/80 mb-4">
              We may terminate or suspend your account at any time for violation of these terms. You may also terminate your account at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">10. Changes to Terms</h2>
            <p className="text-white/80 mb-4">
              We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new terms on this page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">11. Contact Information</h2>
            <p className="text-white/80 mb-4">
              If you have any questions about these terms, please contact us at:
            </p>
            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-white/80">
                <strong>Email:</strong> support@storyboardflow.com<br />
                <strong>Website:</strong> <a href="/" className="text-blue-400 hover:underline">storyboardflow.com</a>
              </p>
            </div>
          </section>
        </div>

        </div>
      </div>
    </div>
  )
}
