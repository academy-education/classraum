"use client"

import Header from "@/components/shared/Header"
import Footer from "@/components/shared/Footer"
import { ScrollText } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"
import { useState } from "react"

export default function TermsOfServicePage() {
  const { t, language } = useTranslation()
  const [termsType, setTermsType] = useState<'business' | 'consumer'>('business')
  
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8" style={{ backgroundColor: '#2885e8' }}>
              <ScrollText className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>

            {/* Show tab selector only for Korean */}
            {language === 'korean' && (
              <div className="flex justify-center mb-6">
                <div className="inline-flex rounded-lg border border-gray-300 p-1">
                  <button
                    onClick={() => setTermsType('business')}
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                    style={termsType === 'business' ? { backgroundColor: '#2885e8', color: 'white' } : { color: '#6b7280' }}
                  >
                    {t('termsOfService.business.title')}
                  </button>
                  <button
                    onClick={() => setTermsType('consumer')}
                    className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                    style={termsType === 'consumer' ? { backgroundColor: '#2885e8', color: 'white' } : { color: '#6b7280' }}
                  >
                    {t('termsOfService.consumer.title')}
                  </button>
                </div>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4">
              {language === 'english' ? t('termsOfService.business.title') : t(`termsOfService.${termsType}.title`)}
            </h1>

            <p className="text-lg text-gray-600 mb-2">
              {language === 'english' ? t('termsOfService.business.lastUpdated') : t(`termsOfService.${termsType}.lastUpdated`)}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-8">
              {language === 'english' ? t('termsOfService.business.intro') : t(`termsOfService.${termsType}.intro`)}
            </p>

            {/* Sections */}
            {/* Manually define section keys since we can't get object from t() */}
            {(language === 'english' ?
              // English always uses business terms (29 sections)
              ['section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'section7', 'section8', 'section9', 'section10', 'section11', 'section12', 'section13', 'section14', 'section15', 'section16', 'section17', 'section18', 'section19', 'section20', 'section21', 'section22', 'section23', 'section24', 'section25', 'section26', 'section27', 'section28', 'section29'] :
              // Korean has different sections for business (22) and consumer (16)
              termsType === 'business' ?
                ['section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'section7', 'section8', 'section9', 'section10', 'section11', 'section12', 'section13', 'section14', 'section15', 'section16', 'section17', 'section18', 'section19', 'section20', 'section21', 'section22'] :
                ['section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'section7', 'section8', 'section9', 'section10', 'section11', 'section12', 'section13', 'section14', 'section15', 'section16']
            ).map((sectionKey, index) => {
              // Check if section exists by trying to get its title
              const termSection = language === 'english' ? 'business' : termsType
              const sectionTitle = t(`termsOfService.${termSection}.sections.${sectionKey}.title`)

              // Skip if section doesn't exist (title returns the path as fallback)
              if (sectionTitle === `termsOfService.${termSection}.sections.${sectionKey}.title`) {
                return null
              }

              // Get all section properties individually
              const sectionContent = t(`termsOfService.${termSection}.sections.${sectionKey}.content`)
              const sectionIntro = t(`termsOfService.${termSection}.sections.${sectionKey}.intro`)
              const sectionRefusal = t(`termsOfService.${termSection}.sections.${sectionKey}.refusal`)
              const sectionChange = t(`termsOfService.${termSection}.sections.${sectionKey}.change`)
              const sectionRestrictions = t(`termsOfService.${termSection}.sections.${sectionKey}.restrictions`)
              const sectionNotice = t(`termsOfService.${termSection}.sections.${sectionKey}.notice`)
              const sectionPolicy = t(`termsOfService.${termSection}.sections.${sectionKey}.policy`)
              const sectionEnforcement = t(`termsOfService.${termSection}.sections.${sectionKey}.enforcement`)

              // Get arrays (items) - need special handling
              const getArrayItems = (arrayPath: string) => {
                const items = []
                let i = 0
                while (true) {
                  const item = t(`${arrayPath}.${i}`)
                  if (item === `${arrayPath}.${i}`) break // No more items
                  items.push(item)
                  i++
                }
                return items.length > 0 ? items : null
              }

              const sectionItems = getArrayItems(`termsOfService.${termSection}.sections.${sectionKey}.items`)
              const sectionRefusalItems = getArrayItems(`termsOfService.${termSection}.sections.${sectionKey}.refusalItems`)
              const sectionServices = getArrayItems(`termsOfService.${termSection}.sections.${sectionKey}.services`)
              const sectionRestrictionItems = getArrayItems(`termsOfService.${termSection}.sections.${sectionKey}.restrictionItems`)
              const sectionProhibited = getArrayItems(`termsOfService.${termSection}.sections.${sectionKey}.prohibited`)

              return (
                <section key={sectionKey} id={`section-${index + 1}`} className="mb-12">
                  <h2 className="text-2xl font-bold mb-6">
                    {index + 1}. {sectionTitle}
                  </h2>

                  {sectionContent !== `termsOfService.${termSection}.sections.${sectionKey}.content` && (
                    <p className="text-gray-700 leading-relaxed mb-6">
                      {sectionContent}
                    </p>
                  )}

                  {sectionIntro !== `termsOfService.${termSection}.sections.${sectionKey}.intro` && (
                    <p className="text-gray-700 leading-relaxed mb-4">
                      {sectionIntro}
                    </p>
                  )}

                  {sectionItems && (
                    <ul className="list-decimal pl-6 mb-6 text-gray-700 space-y-2">
                      {sectionItems.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  )}

                  {sectionRefusal !== `termsOfService.${termSection}.sections.${sectionKey}.refusal` && (
                    <>
                      <p className="text-gray-700 leading-relaxed mb-4">{sectionRefusal}</p>
                      {sectionRefusalItems && (
                        <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
                          {sectionRefusalItems.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}

                  {sectionServices && (
                    <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                      {sectionServices.map((service, serviceIndex) => (
                        <li key={serviceIndex}>{service}</li>
                      ))}
                    </ul>
                  )}

                  {sectionChange !== `termsOfService.${termSection}.sections.${sectionKey}.change` && (
                    <p className="text-gray-700 leading-relaxed mb-4">{sectionChange}</p>
                  )}

                  {sectionRestrictions !== `termsOfService.${termSection}.sections.${sectionKey}.restrictions` && (
                    <>
                      <p className="text-gray-700 leading-relaxed mb-4">{sectionRestrictions}</p>
                      {sectionRestrictionItems && (
                        <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                          {sectionRestrictionItems.map((item, itemIndex) => (
                            <li key={itemIndex}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}

                  {sectionNotice !== `termsOfService.${termSection}.sections.${sectionKey}.notice` && (
                    <p className="text-gray-700 leading-relaxed mb-4">{sectionNotice}</p>
                  )}

                  {sectionPolicy !== `termsOfService.${termSection}.sections.${sectionKey}.policy` && (
                    <p className="text-gray-700 leading-relaxed mb-4">{sectionPolicy}</p>
                  )}

                  {sectionProhibited && (
                    <>
                      <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-2">
                        {sectionProhibited.map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                      {sectionEnforcement !== `termsOfService.${termSection}.sections.${sectionKey}.enforcement` && (
                        <p className="text-gray-700 leading-relaxed mb-4">{sectionEnforcement}</p>
                      )}
                    </>
                  )}
                </section>
              )
            }).filter(Boolean)}

          </div>
        </main>
      </div>
      <Footer />
    </>
  )
}