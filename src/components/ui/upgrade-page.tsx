"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface UpgradePageProps {
  academyId?: string
  onNavigateToOrderSummary?: (plan: {
    name: string
    price: string
    description: string
    features: string[]
    additionalCosts?: string[]
  }) => void
}

export function UpgradePage({ onNavigateToOrderSummary }: UpgradePageProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const handleUpgradeClick = (planName: string, price: string, description: string, features: string[], additionalCosts?: string[]) => {
    if (onNavigateToOrderSummary) {
      onNavigateToOrderSummary({
        name: planName,
        price: price,
        description: description,
        features: features,
        additionalCosts: additionalCosts
      })
    } else {
      // Navigate to payments page with plan information
      const planData = {
        name: planName,
        price: price,
        description: description,
        features: features,
        additionalCosts: additionalCosts
      }
      
      // Store plan data in sessionStorage to pass to payments page
      sessionStorage.setItem('selectedPlan', JSON.stringify(planData))
      
      // Navigate to checkout page (KG Inicis payment form)
      router.push('/checkout')
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('upgrade.title')}</h1>
          <p className="text-gray-500">{t('upgrade.subtitle')}</p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Individual Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.individual.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩24,900<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.individual.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.access')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.contacts')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.sessions')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.support')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.individual.features.security')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.individual.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.individual.additionalCosts.storage')}</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.individual.name')),
              '₩24,900',
              String(t('upgrade.plans.individual.description')),
              [
                String(t('upgrade.plans.individual.features.users')),
                String(t('upgrade.plans.individual.features.storage')),
                String(t('upgrade.plans.individual.features.access')),
                String(t('upgrade.plans.individual.features.contacts')),
                String(t('upgrade.plans.individual.features.sessions')),
                String(t('upgrade.plans.individual.features.support')),
                String(t('upgrade.plans.individual.features.security'))
              ],
              [String(t('upgrade.plans.individual.additionalCosts.users')), String(t('upgrade.plans.individual.additionalCosts.storage'))]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{String(t('upgrade.upgradeButton'))}
          </Button>
        </Card>

        {/* Small Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.small.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩249,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.small.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.reportCards')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.access')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.management')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.support')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.small.features.reports')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.small.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.small.additionalCosts.storage')}</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.small.name')),
              '₩249,000',
              String(t('upgrade.plans.small.description')),
              [
                String(t('upgrade.plans.small.features.users')),
                String(t('upgrade.plans.small.features.storage')),
                String(t('upgrade.plans.small.features.reportCards')),
                String(t('upgrade.plans.small.features.access')),
                String(t('upgrade.plans.small.features.management')),
                String(t('upgrade.plans.small.features.support')),
                String(t('upgrade.plans.small.features.reports'))
              ],
              [String(t('upgrade.plans.small.additionalCosts.users')), String(t('upgrade.plans.small.additionalCosts.storage'))]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{String(t('upgrade.upgradeButton'))}
          </Button>
        </Card>

        {/* Medium Academy Plan - Most Popular */}
        <Card className="p-6 border-2 border-primary hover:shadow-lg transition-all duration-300 relative flex flex-col h-full">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">{t('upgrade.mostPopular')}</span>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.medium.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩399,999<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.medium.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.aiReports')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.customization')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.consulting')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.allFeatures')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.medium.features.support')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.medium.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.medium.additionalCosts.storage')}</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.medium.name')),
              '₩399,999',
              String(t('upgrade.plans.medium.description')),
              [
                String(t('upgrade.plans.medium.features.users')),
                String(t('upgrade.plans.medium.features.storage')),
                String(t('upgrade.plans.medium.features.aiReports')),
                String(t('upgrade.plans.medium.features.customization')),
                String(t('upgrade.plans.medium.features.consulting')),
                String(t('upgrade.plans.medium.features.allFeatures')),
                String(t('upgrade.plans.medium.features.support'))
              ],
              [String(t('upgrade.plans.medium.additionalCosts.users')), String(t('upgrade.plans.medium.additionalCosts.storage'))]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{String(t('upgrade.upgradeButton'))}
          </Button>
        </Card>

        {/* Large Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.large.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩699,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
            <p className="text-gray-600 text-sm">{t('upgrade.plans.large.description')}</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.users')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.storage')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.aiReports')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.aiAdvanced')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.consulting')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.enterprise')}</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">{t('upgrade.plans.large.features.multiLocation')}</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">{t('upgrade.plans.large.additionalCosts.users')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.large.additionalCosts.storage')}</p>
            <p className="text-xs text-gray-500">{t('upgrade.plans.large.additionalCosts.aiCards')}</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              String(t('upgrade.plans.large.name')),
              '₩699,000',
              String(t('upgrade.plans.large.description')),
              [
                String(t('upgrade.plans.large.features.users')),
                String(t('upgrade.plans.large.features.storage')),
                String(t('upgrade.plans.large.features.aiReports')),
                String(t('upgrade.plans.large.features.aiAdvanced')),
                String(t('upgrade.plans.large.features.consulting')),
                String(t('upgrade.plans.large.features.enterprise')),
                String(t('upgrade.plans.large.features.multiLocation'))
              ],
              [String(t('upgrade.plans.large.additionalCosts.users')), String(t('upgrade.plans.large.additionalCosts.storage')), String(t('upgrade.plans.large.additionalCosts.aiCards'))]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{String(t('upgrade.upgradeButton'))}
          </Button>
        </Card>
      </div>

      {/* Enterprise Contact Section */}
      <Card className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 border-2 mb-12">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {t('upgrade.enterprise.title')}
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('upgrade.enterprise.description')}
          </p>
          <Button size="lg" className="text-base px-8 py-3 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl">
            {t('upgrade.enterprise.contactButton')}
          </Button>
        </div>
      </Card>

    </div>
  )
}