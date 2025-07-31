import React from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from '../components/OptimizedImage';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50 border-b border-orange-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            {/* Back Button */}
            <Link
              to="/home"
              className="p-2 bg-orange-100 rounded-full hover:bg-orange-200 transition-colors duration-200"
              aria-label="Go back to home"
            >
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>

            {/* Title */}
            <h1 className="text-xl font-bold text-gray-800">Privacy Policy</h1>

            {/* Logo */}
            <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full p-0.5 shadow-sm flex items-center justify-center">
              <OptimizedImage 
                src="/images/m_logo.png" 
                alt="Masala Madness Logo" 
                className="w-9 h-9 object-contain"
                width={36}
                height={36}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Masala Madness</h2>
            <p className="text-orange-600 font-semibold">Privacy Policy</p>
            <p className="text-sm text-gray-500 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-6 text-gray-700">
            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Information We Collect</h3>
              <p className="mb-3">
                At Masala Madness, we collect information to provide better services to our customers. The types of information we collect include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Personal Information:</strong> Name, phone number, and email address when you place orders</li>
                <li><strong>Order Information:</strong> Details about your food orders, preferences, and delivery information</li>
                <li><strong>Device Information:</strong> IP address, browser type, and device identifiers for app functionality</li>
                <li><strong>Usage Data:</strong> How you interact with our app, including features used and pages visited</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2. How We Use Your Information</h3>
              <p className="mb-3">We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Process and fulfill your food orders</li>
                <li>Communicate with you about your orders and account</li>
                <li>Improve our services and customer experience</li>
                <li>Send you updates about our menu and promotions (with your consent)</li>
                <li>Ensure the security and integrity of our platform</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3. Information Sharing</h3>
              <p className="mb-3">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>With delivery partners to fulfill your orders</li>
                <li>With payment processors to complete transactions</li>
                <li>When required by law or to protect our rights</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4. Data Security</h3>
              <p className="mb-3">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of sensitive data during transmission</li>
                <li>Secure storage of personal information</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication procedures</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">5. Your Rights</h3>
              <p className="mb-3">You have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">6. Cookies and Tracking</h3>
              <p className="mb-3">
                Our app may use cookies and similar technologies to enhance your experience. These technologies help us:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze app usage and performance</li>
                <li>Provide personalized content and recommendations</li>
                <li>Ensure secure authentication</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">7. Children's Privacy</h3>
              <p>
                Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">8. Changes to This Policy</h3>
              <p>
                We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">9. Contact Us</h3>
              <p className="mb-3">
                If you have any questions about this privacy policy or our data practices, please contact us:
              </p>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="font-semibold text-orange-800">Masala Madness</p>
                <p className="text-gray-700">Email: query.masalamadness@gmail.com</p>
                <p className="text-gray-700">Phone: [+91 7860908009]</p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <Link
              to="/home"
              className="inline-flex items-center px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
