import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { getGlassmorphismStyles } from '@/styles/glassmorphism-styles'

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = 'Privacy Policy - Storyboard Flow'
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
            <h1 className="text-4xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-white/70">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg max-w-none text-white">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">1. Information We Collect</h2>
            <p className="text-white/80 mb-4">
              Storyboard Flow collects minimal information necessary to provide our service:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li><strong>Account Information:</strong> Email address, name (if provided)</li>
              <li><strong>Project Data:</strong> Storyboards, images, and project content you create</li>
              <li><strong>Usage Data:</strong> Basic analytics to improve our service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Your Information</h2>
            <p className="text-white/80 mb-4">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li>Provide and maintain our storyboard creation service</li>
              <li>Sync your projects across devices</li>
              <li>Improve our application and user experience</li>
              <li>Communicate with you about your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">3. Data Storage and Security</h2>
            <p className="text-white/80 mb-4">
              Your data is stored securely using industry-standard encryption and security measures:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li>All data is encrypted in transit and at rest</li>
              <li>We use secure cloud infrastructure (Supabase)</li>
              <li>Regular security audits and updates</li>
              <li>Access controls and authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services</h2>
            <p className="text-white/80 mb-4">
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li><strong>Supabase:</strong> For authentication and data storage</li>
              <li><strong>Google OAuth:</strong> For social login (optional)</li>
              <li><strong>GitHub OAuth:</strong> For social login (optional)</li>
              <li><strong>Apple OAuth:</strong> For social login (optional)</li>
            </ul>
            <p className="text-white/80 mb-4">
              These services have their own privacy policies and data handling practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">5. Your Rights</h2>
            <p className="text-white/80 mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-white/80 mb-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Export your project data</li>
              <li>Opt out of communications</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">6. Data Retention</h2>
            <p className="text-white/80 mb-4">
              We retain your data for as long as your account is active. You can delete your account and all associated data at any time through your account settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">7. Children's Privacy</h2>
            <p className="text-white/80 mb-4">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">8. Changes to This Policy</h2>
            <p className="text-white/80 mb-4">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">9. Contact Us</h2>
            <p className="text-white/80 mb-4">
              If you have any questions about this privacy policy, please contact us at:
            </p>
            <div className="bg-white/10 p-4 rounded-lg">
              <p className="text-white/80">
                <strong>Email:</strong> privacy@storyboardflow.com<br />
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
