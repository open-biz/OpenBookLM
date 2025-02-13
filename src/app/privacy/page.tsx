import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#1A1A1A]">
      <div className="max-w-5xl mx-auto px-6 py-12 w-full">
        <h1
          className="text-6xl font-bold mb-16 bg-gradient-to-r from-blue-500 via-blue-400 to-teal-400 
          inline-block text-transparent bg-clip-text tracking-tight"
        >
          Privacy Policy
        </h1>

        <div className="space-y-6">
          <section className="bg-[#2A2A2A] rounded-xl p-8 border border-[#3A3A3A] hover:border-[#4A4A4A] transition-colors duration-200">
            <h2 className="text-2xl font-semibold mb-6 text-white/90">
              Introduction
            </h2>
            <p className="text-gray-300/90 leading-7">
              OpenBookLM is a text processing and summarization platform that
              uses advanced language models to help users understand and
              interact with their content. We take your privacy seriously and
              want to be transparent about how we use your data.
            </p>
          </section>

          <section className="bg-[#2A2A2A] rounded-xl p-8 border border-[#3A3A3A] hover:border-[#4A4A4A] transition-colors duration-200">
            <h2 className="text-2xl font-semibold mb-6 text-white/90">
              Data Collection and Usage
            </h2>
            <p className="text-gray-300/90 mb-8 leading-7">
              To provide our services, we need certain permissions through Clerk
              Authentication. Here's what we request and why:
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors duration-200">
                <h3 className="text-xl font-semibold mb-4 text-white/90">
                  Authentication Data
                </h3>
                <ul className="list-disc pl-6 space-y-3 text-gray-300/90">
                  <li>
                    Email Address: Used for account identification and essential
                    communications
                  </li>
                  <li>
                    Profile Information: Used to personalize your experience
                  </li>
                </ul>
              </div>

              <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#2A2A2A] hover:border-[#3A3A3A] transition-colors duration-200">
                <h3 className="text-xl font-semibold mb-4 text-white/90">
                  Content Processing
                </h3>
                <ul className="list-disc pl-6 space-y-3 text-gray-300/90">
                  <li>
                    Uploaded Documents: Processed for summarization and analysis
                  </li>
                  <li>Generated Summaries: Stored securely in our database</li>
                  <li>User Interactions: Used to improve our services</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-[#2A2A2A] rounded-xl p-8 border border-[#3A3A3A] hover:border-[#4A4A4A] transition-colors duration-200">
            <h2 className="text-2xl font-semibold mb-6 text-white/90">
              Data Protection
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>All data is encrypted in transit and at rest</li>
              <li>
                Access to your data is strictly limited to processing your
                requests
              </li>
              <li>
                We do not share your personal information with third parties
              </li>
              <li>You can request deletion of your data at any time</li>
            </ul>
          </section>

          <section className="bg-[#2A2A2A] rounded-xl p-8 border border-[#3A3A3A] hover:border-[#4A4A4A] transition-colors duration-200">
            <h2 className="text-2xl font-semibold mb-6 text-white/90">
              Your Rights
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Access your personal data</li>
              <li>Correct any inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw your consent at any time</li>
            </ul>
          </section>

          <section className="bg-[#2A2A2A] rounded-xl p-8 border border-[#3A3A3A] hover:border-[#4A4A4A] transition-colors duration-200">
            <h2 className="text-2xl font-semibold mb-6 text-white/90">
              Contact Us
            </h2>
            <p className="text-gray-300/90">
              If you have any questions about our privacy policy or how we
              handle your data, please contact us at{" "}
              <a
                href="mailto:privacy@openbooklm.com"
                className="text-blue-400 hover:text-blue-300 transition-all duration-200 border-b border-blue-400/30 hover:border-blue-300"
              >
                privacy@openbooklm.com
              </a>
            </p>
          </section>
        </div>

        <footer className="text-sm text-gray-500/80 mt-16 pt-8 border-t border-[#2A2A2A]">
          Last updated: {new Date().toLocaleDateString()}
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
