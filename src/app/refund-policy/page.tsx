"use client"

import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { RefreshCw } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { languages } from "@/locales"

export default function RefundPolicyPage() {
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
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
              <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              {t('refundPolicy.title')}
            </h1>

            <p className="text-lg text-gray-600 mb-2">
              {t('refundPolicy.lastUpdated')}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {/* Section 1 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section1.title')}</h2>

              <p className="text-gray-700 leading-relaxed">
                {t('refundPolicy.sections.section1.content')}
              </p>
            </section>

            {/* Section 2 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section2.title')}</h2>

              <ul className="list-disc pl-6 space-y-3 text-gray-700">
                {getArray('refundPolicy.sections.section2.items').map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Section 3 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section3.title')}</h2>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6">
                <p className="text-gray-700 font-medium">
                  {getArray('refundPolicy.sections.section3.items')[0]}
                </p>
              </div>

              <p className="text-gray-700 leading-relaxed">
                {getArray('refundPolicy.sections.section3.items')[1]}
              </p>
            </section>

            {/* Section 4 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section4.title')}</h2>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  {t('refundPolicy.sections.section4.intro')}
                </p>
                {getArray('refundPolicy.sections.section4.items').length > 0 && (
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    {getArray('refundPolicy.sections.section4.items').map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-gray-700 leading-relaxed">
                {t('refundPolicy.sections.section4.followUp')}
              </p>
            </section>

            {/* Section 5 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section5.title')}</h2>

              <div className="space-y-4">
                {getArray('refundPolicy.sections.section5.items').map((item: string, index: number) => (
                  <div key={index} className={`border-l-4 ${index === 0 ? 'border-green-500' : index === 1 ? 'border-yellow-500' : 'border-blue-500'} pl-6`}>
                    <p className="text-gray-700 leading-relaxed">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 6 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section6.title')}</h2>

              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <p className="text-gray-700 font-medium mb-4">
                  {t('refundPolicy.sections.section6.intro')}
                </p>

                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  {getArray('refundPolicy.sections.section6.items').map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section7.title')}</h2>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="space-y-3">
                  {getArray('refundPolicy.sections.section7.items').map((item: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-xs font-bold">{index + 1}</span>
                      </div>
                      <p className="text-gray-700 ml-3">
                        {item}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 8 */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">{t('refundPolicy.sections.section8.title')}</h2>

              <div className="bg-gray-50 rounded-lg p-6">
                <ul className="list-disc pl-6 space-y-3 text-gray-700">
                  {getArray('refundPolicy.sections.section8.items').map((item: string, index: number) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>

          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}