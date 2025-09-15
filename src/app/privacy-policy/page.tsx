"use client"

import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { Shield } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"

export default function PrivacyPolicyPage() {
  const { t, language } = useTranslation()

  // Helper function to get array values from translation data
  const getArray = (path: string): string[] => {
    const pathParts = path.split('.')
    let current: any = languages[language]

    for (const part of pathParts) {
      current = current?.[part]
    }

    return Array.isArray(current) ? current : []
  }
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              {t('privacyPolicy.title')}
            </h1>
            
            <p className="text-lg text-gray-600 mb-2">
              {t('privacyPolicy.lastUpdated')}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-8">
              {t('privacyPolicy.intro')}
            </p>


            {/* Summary Section */}
            <section className="bg-gray-50 rounded-lg p-6 mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('privacyPolicy.summary.title')}</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('privacyPolicy.summary.whatCollect.title')}</h3>
                  <p className="text-gray-700">{t('privacyPolicy.summary.whatCollect.content')}</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('privacyPolicy.summary.sensitive.title')}</h3>
                  <p className="text-gray-700">{t('privacyPolicy.summary.sensitive.content')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('privacyPolicy.summary.thirdParty.title')}</h3>
                  <p className="text-gray-700">{t('privacyPolicy.summary.thirdParty.content')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('privacyPolicy.summary.howUsed.title')}</h3>
                  <p className="text-gray-700 mb-2">{t('privacyPolicy.summary.howUsed.intro')}</p>
                  <ul className="list-disc pl-6 mb-3 text-gray-700 space-y-1">
                    {getArray('privacyPolicy.summary.howUsed.items').map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-gray-700">{t('privacyPolicy.summary.howUsed.content')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('privacyPolicy.summary.sharing.title')}</h3>
                  <p className="text-gray-700">{t('privacyPolicy.summary.sharing.content')}</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('privacyPolicy.summary.rights.title')}</h3>
                  <p className="text-gray-700 mb-2">{t('privacyPolicy.summary.rights.intro')}</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    {getArray('privacyPolicy.summary.rights.items').map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{t('privacyPolicy.summary.exercise.title')}</h3>
                  <p className="text-gray-700">{t('privacyPolicy.summary.exercise.content')}</p>
                </div>
              </div>
            </section>

            {/* Table of Contents */}
            <section className="mb-12">
              <div className="bg-white border rounded-lg p-6">
                <div className="text-gray-700 whitespace-pre-line">
                  {t('privacyPolicy.mainText')}
                </div>
              </div>
            </section>

            {/* Detailed Sections */}
            <section id="section-1" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">1. {t('privacyPolicy.sections.section1.title')}</h2>

              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4">{t('privacyPolicy.sections.section1.subtitle')}</h3>
                <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section1.short')}</p>
                <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section1.content')}</p>

                <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section1.sensitive')}</p>
                <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section1.notice')}</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">{t('privacyPolicy.sections.section1.automatic')}</h3>
                <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section1.automaticShort')}</p>
                <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section1.automaticContent')}</p>
              </div>
            </section>

            <section id="section-2" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">2. {t('privacyPolicy.sections.section2.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section2.short')}</p>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section2.intro')}</p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                {getArray('privacyPolicy.sections.section2.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section2.basis')}</p>
            </section>

            <section id="section-3" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">3. {t('privacyPolicy.sections.section3.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section3.short')}</p>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section3.intro')}</p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                {getArray('privacyPolicy.sections.section3.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              
              <p className="text-gray-700 leading-relaxed font-medium">
                {t('privacyPolicy.sections.section3.notice')}
              </p>
            </section>

            <section id="section-4" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">4. {t('privacyPolicy.sections.section4.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section4.short')}</p>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section4.intro')}</p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                {getArray('privacyPolicy.sections.section4.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              
              <p className="text-gray-700 leading-relaxed">
                {t('privacyPolicy.sections.section4.content')}
              </p>
            </section>

            <section id="section-5" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">5. {t('privacyPolicy.sections.section5.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section5.short')}</p>
              
              <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section5.content')}</p>
            </section>

            <section id="section-6" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">6. {t('privacyPolicy.sections.section6.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section6.short')}</p>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section6.intro')}</p>
              <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                {getArray('privacyPolicy.sections.section6.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section id="section-7" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">7. {t('privacyPolicy.sections.section7.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section7.short')}</p>
              
              <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section7.content')}</p>
            </section>

            <section id="section-8" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">8. {t('privacyPolicy.sections.section8.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section8.short')}</p>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section8.content')}</p>
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section8.data')}</p>
              <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section8.rights')}</p>
            </section>

            <section id="section-9" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">9. {t('privacyPolicy.sections.section9.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section9.short')}</p>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section9.intro')}</p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                {getArray('privacyPolicy.sections.section9.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section9.exercise')}</p>
            </section>

            <section id="section-10" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">10. {t('privacyPolicy.sections.section10.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section10.short')}</p>
              
              <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section10.content')}</p>
            </section>

            <section id="section-11" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">11. {t('privacyPolicy.sections.section11.title')}</h2>
              <p className="text-gray-700 font-medium mb-3">{t('privacyPolicy.sections.section11.short')}</p>
              
              <p className="text-gray-700 leading-relaxed">{t('privacyPolicy.sections.section11.content')}</p>
            </section>

            <section id="section-12" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">12. {t('privacyPolicy.sections.section12.title')}</h2>
              
              <p className="text-gray-700 leading-relaxed mb-6">{t('privacyPolicy.sections.section12.description')}</p>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">{t('privacyPolicy.sections.section12.address')}</p>
                    <div className="text-gray-700">
                      {getArray('privacyPolicy.sections.section12.addressDetails').map((line: string, index: number) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="section-13" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">13. {t('privacyPolicy.sections.section13.title')}</h2>
              
              <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section13.intro')}</p>
              <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                {getArray('privacyPolicy.sections.section13.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

              <p className="text-gray-700 leading-relaxed">
                {t('privacyPolicy.sections.section13.content')}
              </p>
            </section>

            <section id="section-14" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">14. {t('privacyPolicy.sections.section14.title')}</h2>
              <p className="text-gray-700 font-medium mb-6">{t('privacyPolicy.sections.section14.short')}</p>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('privacyPolicy.sections.section14.role.title')}</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {t('privacyPolicy.sections.section14.role.content')}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('privacyPolicy.sections.section14.ferpa.title')}</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {t('privacyPolicy.sections.section14.ferpa.content')}
                  </p>
                  <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                    {getArray('privacyPolicy.sections.section14.ferpa.items').map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('privacyPolicy.sections.section14.ccpa.title')}</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {t('privacyPolicy.sections.section14.ccpa.intro')}
                  </p>
                  <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                    {getArray('privacyPolicy.sections.section14.ccpa.laws').map((law: string, index: number) => (
                      <li key={index}>{law}</li>
                    ))}
                  </ul>

                  <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section14.ccpa.compliance')}</p>
                  <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                    {getArray('privacyPolicy.sections.section14.ccpa.items').map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>

                  <p className="text-gray-700 leading-relaxed">
                    {t('privacyPolicy.sections.section14.ccpa.dpa')}
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('privacyPolicy.sections.section14.responsibilities.title')}</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('privacyPolicy.sections.section14.responsibilities.intro')}</p>
                  <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                    {getArray('privacyPolicy.sections.section14.responsibilities.items').map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">{t('privacyPolicy.sections.section14.dpaInfo.title')}</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {t('privacyPolicy.sections.section14.dpaInfo.content')}
                  </p>
                </div>
              </div>
            </section>

            <section id="section-15" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">15. {t('privacyPolicy.sections.section15.title')}</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacyPolicy.sections.section15.description')}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">{t('privacyPolicy.sections.section15.officer.title')}:</h4>
                <div className="space-y-2 text-gray-700">
                  <p>{t('privacyPolicy.sections.section15.officer.name')}</p>
                  <p>{t('privacyPolicy.sections.section15.officer.position')}</p>
                  <p>{t('privacyPolicy.sections.section15.officer.email')}</p>
                  <p>{t('privacyPolicy.sections.section15.officer.phone')}</p>
                  <p>{t('privacyPolicy.sections.section15.officer.address')}</p>
                </div>
              </div>
              
              <p className="text-gray-700 leading-relaxed mt-6">
                {t('privacyPolicy.sections.section15.contact')}
              </p>
            </section>

            <section id="section-16" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">16. {t('privacyPolicy.sections.section16.title')}</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacyPolicy.sections.section16.retention')}
              </p>
              
              <p className="text-gray-700 leading-relaxed mb-4">
                {t('privacyPolicy.sections.section16.destruction')}
              </p>
              
              <div className="ml-6">
                <h4 className="font-semibold text-gray-900 mb-3">{t('privacyPolicy.sections.section16.methods.title')}:</h4>
                <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                  {getArray('privacyPolicy.sections.section16.methods.items').map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="section-17" className="mb-12">
              <h2 className="text-2xl font-bold mb-6">17. {t('privacyPolicy.sections.section17.title')}</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                {t('privacyPolicy.sections.section17.description')}
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <div className="grid md:grid-cols-2 gap-4 text-gray-700">
                  <div>
                    <p>{t('privacyPolicy.sections.section17.details.provider')}</p>
                    <p>{t('privacyPolicy.sections.section17.details.location')}</p>
                    <p>{t('privacyPolicy.sections.section17.details.purpose')}</p>
                  </div>
                  <div>
                    <p>{t('privacyPolicy.sections.section17.details.items')}</p>
                    <p>{t('privacyPolicy.sections.section17.details.method')}</p>
                    <p>{t('privacyPolicy.sections.section17.details.retention')}</p>
                  </div>
                </div>
                <p className="mt-4">{t('privacyPolicy.sections.section17.details.protection')}</p>
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                {t('privacyPolicy.sections.section17.compliance')}
              </p>
            </section>

            {/* Contact Section */}
            <section className="bg-blue-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">{t('privacyPolicy.contactTitle')}</h2>
              <p className="text-gray-700 leading-relaxed">
                {t('privacyPolicy.contactDescription')}
              </p>
              <p className="text-gray-700 mt-4">
                <strong>Email:</strong> <a href="mailto:support@classraum.com" className="text-blue-600 hover:text-blue-800 font-medium">support@classraum.com</a>
              </p>
            </section>
          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}