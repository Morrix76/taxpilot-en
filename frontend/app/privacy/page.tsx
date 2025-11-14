import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated November 14, 2025</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-10">
          
          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              TaxPilot is a document management platform designed to help individuals and businesses organize, 
              analyze, and manage their financial documents efficiently. This Privacy Policy explains how we 
              collect, use, disclose, and protect your personal information when you use our services. By using 
              TaxPilot, you agree to the collection and use of information in accordance with this policy.
            </p>
            <p className="text-gray-700 leading-relaxed mt-4">
              TaxPilot is operated by Ciardo Francesco, acting as Data Controller under applicable data protection laws, 
              including the GDPR.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect several types of information to provide and improve our services:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Account Information:</strong> Email address and name when you register for an account</li>
              <li><strong>Authentication Data:</strong> Password, which is encrypted and securely stored</li>
              <li><strong>Document Data:</strong> Uploaded files including invoices, receipts, payslips, and other financial documents</li>
              <li><strong>Client Data:</strong> Business information you input such as client names, VAT numbers, and addresses</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our platform, including access times and features used</li>
              <li><strong>Technical Data:</strong> IP address, browser type, device information, and operating system</li>
            </ul>
          </section>

          {/* 3. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the collected information for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Service Provision:</strong> To provide, maintain, and improve the TaxPilot platform and its features</li>
              <li><strong>Document Analysis:</strong> To analyze your uploaded documents using AI technology (powered by Groq) to extract relevant information and provide insights</li>
              <li><strong>Account Verification:</strong> To send account verification emails and important service notifications</li>
              <li><strong>Customer Support:</strong> To respond to your inquiries, support requests, and provide technical assistance</li>
              <li><strong>Security:</strong> To detect, prevent, and address technical issues, fraud, and security vulnerabilities</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              We do not use your documents or personal data to train our own AI models. AI-based document analysis is 
              performed in real time only for the purpose of providing the service.
            </p>
          </section>

          {/* 4. Data Storage and Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Storage and Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We take the security of your data seriously and implement industry-standard measures to protect it:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Database:</strong> We use Turso for database storage with encryption at rest and in transit</li>
              <li><strong>Hosting Infrastructure:</strong> Our backend is hosted on Railway and frontend on Vercel, both providing enterprise-grade security</li>
              <li><strong>File Storage:</strong> Uploaded documents are stored on secure Railway servers with restricted access</li>
              <li><strong>Email Service:</strong> We use Resend for transactional emails, which complies with data protection standards</li>
              <li><strong>Data Transmission:</strong> All data transmitted between your device and our servers is encrypted using HTTPS/TLS protocols</li>
              <li><strong>Password Security:</strong> User passwords are hashed using bcrypt with salt and never stored in plain text</li>
              <li><strong>Access Controls:</strong> We implement strict access controls to ensure only authorized personnel can access user data</li>
              <li><strong>Data Location:</strong> We strive to store and process your data within the European Union (EU) whenever possible.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              While we strive to protect your personal information, no method of transmission over the internet 
              or electronic storage is 100% secure. We cannot guarantee absolute security but continuously work 
              to improve our security measures.
            </p>
          </section>

          {/* 5. Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To provide our services, we share data with carefully selected third-party service providers:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Cloud Computing Services:</strong> Railway (backend hosting) and Vercel (frontend hosting) for infrastructure and platform services</li>
              <li><strong>Data Storage Providers:</strong> Turso for secure database management and storage</li>
              <li><strong>Email Services:</strong> Resend for sending transactional emails such as account verification and notifications</li>
              <li><strong>AI Platforms:</strong> Groq for AI-powered document analysis and data extraction</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              These third parties are contractually obligated to use your data only for the purposes of providing 
              their services to us and are required to maintain the confidentiality and security of your information. 
              We do not sell your personal data to third parties for marketing purposes.
            </p>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information and uploaded documents for as long as you maintain an active 
              TaxPilot account. When you choose to delete your account, we will permanently delete your personal 
              data, including all uploaded documents and client information, within 30 days. Some information may 
              be retained for longer periods if required by law, for legitimate business purposes, or to resolve 
              disputes. Backup copies may persist in our systems for up to 90 days before being permanently deleted.
            </p>
          </section>

          {/* 7. Your Rights (GDPR) */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Rights (GDPR)</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Under the General Data Protection Regulation (GDPR) and other applicable data protection laws, 
              you have the following rights regarding your personal data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
              <li><strong>Right to Access:</strong> Request access to the personal data we hold about you</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete personal data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your account and all associated personal data</li>
              <li><strong>Right to Data Portability:</strong> Request an export of your data in a machine-readable format</li>
              <li><strong>Right to Restrict Processing:</strong> Request limitation of how we process your personal data</li>
              <li><strong>Right to Object:</strong> Object to certain types of data processing</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw your consent at any time where processing is based on consent</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise any of these rights, please contact us at <a href="mailto:iltuobrand@outlook.it" className="text-purple-600 hover:text-purple-700 font-medium">iltuobrand@outlook.it</a>. 
              We will respond to your request within 30 days. You also have the right to lodge a complaint with 
              your local data protection authority if you believe we have not handled your data properly.
            </p>
          </section>

          {/* 8. International Data Transfers */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              TaxPilot operates globally, and your personal data may be processed and stored in countries outside 
              of your residence, including the United States, where our service providers are located. These 
              countries may have different data protection laws than your country. When we transfer personal data 
              from the European Economic Area (EEA) or United Kingdom to other countries, we use Standard Contractual 
              Clauses (SCCs) approved by the European Commission and implement appropriate safeguards to ensure your 
              data receives an adequate level of protection in compliance with GDPR requirements.
            </p>
          </section>

          {/* 9. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              TaxPilot is not intended for use by individuals under the age of 18. We do not knowingly collect 
              personal information from children under 18. If you are a parent or guardian and believe your child 
              has provided us with personal information, please contact us at <a href="mailto:iltuobrand@outlook.it" className="text-purple-600 hover:text-purple-700 font-medium">iltuobrand@outlook.it</a>. 
              If we discover that we have collected personal information from a child under 18, we will take steps 
              to delete that information as quickly as possible.
            </p>
          </section>

          {/* 10. Changes to This Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, 
              legal requirements, or other factors. When we make changes, we will update the "Last updated" date 
              at the top of this policy. We encourage you to review this Privacy Policy periodically to stay 
              informed about how we protect your information. If we make material changes that significantly affect 
              your rights, we will notify you via email or through a prominent notice on our platform before the 
              changes take effect.
            </p>
          </section>

          {/* 11. Contact Us */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
              please contact us:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <p className="text-gray-700 mb-2">
                <strong>Email:</strong> <a href="mailto:iltuobrand@outlook.it" className="text-purple-600 hover:text-purple-700 font-medium">iltuobrand@outlook.it</a>
              </p>
              <p className="text-gray-700">
                <strong>Website:</strong> <a href="https://taxpilot-en.vercel.app" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-medium">https://taxpilot-en.vercel.app</a>
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed mt-4">
              We are committed to resolving any privacy concerns you may have and will respond to your inquiries 
              as promptly as possible.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
