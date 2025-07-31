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
              <h3 className="text-xl font-semibold text-gray-800 mb-3">1. Introduction</h3>
              <p className="mb-3">
                Welcome to Masala Madness ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service").
              </p>
              <p className="mb-3">
                By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2. Information We Collect</h3>
              <p className="mb-3">
                We collect several different types of information for various purposes to provide and improve our Service to you:
              </p>
              
              <h4 className="text-lg font-semibold text-gray-800 mb-2">2.1 Personal Information</h4>
              <p className="mb-2">When you use our Service, we may ask you to provide certain personally identifiable information that can be used to contact or identify you:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
                <li>Name and contact information (phone number, email address)</li>
                <li>Payment information (processed securely through third-party payment processors)</li>
                <li>Order history and preferences</li>
              </ul>

              <h4 className="text-lg font-semibold text-gray-800 mb-2">2.2 App Permissions</h4>
              <p className="mb-2">Our app may request the following permissions:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Storage:</strong> To save app data and cache for offline functionality</li>
                <li><strong>Network:</strong> To connect to our servers and process orders</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3. How We Use Your Information</h3>
              <p className="mb-3">We use the collected information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Service Provision:</strong> Process and fulfill your food orders, manage your account, and provide customer support</li>
                <li><strong>Communication:</strong> Send order confirmations, delivery updates, and respond to your inquiries</li>
                <li><strong>Personalization:</strong> Customize your experience based on your preferences and order history</li>
                <li><strong>Improvement:</strong> Analyze usage patterns to improve our app functionality and user experience</li>
                <li><strong>Legal Compliance:</strong> Comply with applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4. Information Sharing and Disclosure</h3>
              <p className="mb-3">
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>Safety and Security:</strong> To protect our rights, property, or safety, or that of our users or the public</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">5. Data Security</h3>
              <p className="mb-3">
                We implement appropriate technical and organizational security measures to protect your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encryption of sensitive data during transmission (SSL/TLS)</li>
                <li>Secure storage of personal information with access controls</li>
                <li>Regular security assessments and vulnerability testing</li>
                <li>Employee training on data protection practices</li>
                <li>Incident response procedures for data breaches</li>
              </ul>
              <p className="mt-3 text-sm text-gray-600">
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">6. Your Rights and Choices</h3>
              <p className="mb-3">You have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal information we hold</li>
                <li><strong>Correction:</strong> Update or correct inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us using the information provided in the "Contact Us" section.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">7. Data Retention</h3>
              <p className="mb-3">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account information: Retained while your account is active and for a reasonable period after deactivation</li>
                <li>Order information: Retained for legal and accounting purposes (typically 31 days)</li>
              </ul>
              <p className="mt-3">
                We will delete or anonymize your personal information when it is no longer needed for the stated purposes.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">8. Third-Party Services</h3>
              <p className="mb-3">
                Our Service may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.
              </p>
              <p className="mb-3">Third-party services we use include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Payment processors (for secure payment processing)</li>
                <li>Cloud storage providers (for secure data storage)</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">9. Children's Privacy</h3>
              <p className="mb-3">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
              <p className="mb-3">
                If we become aware that we have collected personal information from children under 13 without parental consent, we will take steps to remove such information from our servers.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">10. Changes to This Privacy Policy</h3>
              <p className="mb-3">
                We may update this Privacy Policy from time to time. We will notify you of any changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last updated" date at the top of this policy</li>
                <li>Sending you a notification through the app (for significant changes)</li>
              </ul>
              <p className="mt-3">
                We encourage you to review this Privacy Policy periodically. Your continued use of the Service after any changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">11. Contact Us</h3>
              <p className="mb-3">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="font-semibold text-orange-800">Masala Madness</p>
                <p className="text-sm text-gray-600 mt-2 overflow-hidden">Email: query.masalamadness@gmail.com</p>
                <p className="text-gray-700">Phone: +91 7860908009</p>
                <p className="text-gray-700">Address: Shop No 1, RPS View, Parihar Chauraha, Awas Vikas -1, Keshavpuram, Kalyanpur, Kanpur, Uttar Pradesh 208017</p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">12. Governing Law</h3>
              <p>
                This Privacy Policy is governed by and construed in accordance with the laws of India. Any disputes arising from this policy will be subject to the exclusive jurisdiction of the courts in India.
              </p>
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
