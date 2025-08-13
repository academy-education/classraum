"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'
import { Check } from 'lucide-react'

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

export function UpgradePage({ academyId, onNavigateToOrderSummary }: UpgradePageProps) {
  const { t } = useTranslation()

  const handleUpgradeClick = (planName: string, price: string, description: string, features: string[], additionalCosts?: string[]) => {
    if (onNavigateToOrderSummary) {
      onNavigateToOrderSummary({
        name: planName,
        price: price,
        description: description,
        features: features,
        additionalCosts: additionalCosts
      })
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('upgrade.title')}</h1>
        <p className="text-gray-500">{t('upgrade.subtitle')}</p>
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
              t('upgrade.plans.individual.name'),
              '₩24,900',
              t('upgrade.plans.individual.description'),
              [
                t('upgrade.plans.individual.features.users'),
                t('upgrade.plans.individual.features.storage'),
                t('upgrade.plans.individual.features.access'),
                t('upgrade.plans.individual.features.contacts'),
                t('upgrade.plans.individual.features.sessions'),
                t('upgrade.plans.individual.features.support'),
                t('upgrade.plans.individual.features.security')
              ],
              [t('upgrade.plans.individual.additionalCosts.users'), t('upgrade.plans.individual.additionalCosts.storage')]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{t('upgrade.upgradeButton')}
          </Button>
        </Card>

        {/* Small Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.small.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩199,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
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
              t('upgrade.plans.small.name'),
              '₩199,000',
              t('upgrade.plans.small.description'),
              [
                t('upgrade.plans.small.features.users'),
                t('upgrade.plans.small.features.storage'),
                t('upgrade.plans.small.features.reportCards'),
                t('upgrade.plans.small.features.access'),
                t('upgrade.plans.small.features.management'),
                t('upgrade.plans.small.features.support'),
                t('upgrade.plans.small.features.reports')
              ],
              [t('upgrade.plans.small.additionalCosts.users'), t('upgrade.plans.small.additionalCosts.storage')]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{t('upgrade.upgradeButton')}
          </Button>
        </Card>

        {/* Medium Academy Plan - Most Popular */}
        <Card className="p-6 border-2 border-primary hover:shadow-lg transition-all duration-300 relative flex flex-col h-full">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">{t('upgrade.mostPopular')}</span>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.medium.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩349,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
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
              t('upgrade.plans.medium.name'),
              '₩349,000',
              t('upgrade.plans.medium.description'),
              [
                t('upgrade.plans.medium.features.users'),
                t('upgrade.plans.medium.features.storage'),
                t('upgrade.plans.medium.features.aiReports'),
                t('upgrade.plans.medium.features.customization'),
                t('upgrade.plans.medium.features.consulting'),
                t('upgrade.plans.medium.features.allFeatures'),
                t('upgrade.plans.medium.features.support')
              ],
              [t('upgrade.plans.medium.additionalCosts.users'), t('upgrade.plans.medium.additionalCosts.storage')]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{t('upgrade.upgradeButton')}
          </Button>
        </Card>

        {/* Large Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t('upgrade.plans.large.name')}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩649,000<span className="text-sm text-gray-600">{t('upgrade.perMonth')}</span></div>
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
              t('upgrade.plans.large.name'),
              '₩649,000',
              t('upgrade.plans.large.description'),
              [
                t('upgrade.plans.large.features.users'),
                t('upgrade.plans.large.features.storage'),
                t('upgrade.plans.large.features.aiReports'),
                t('upgrade.plans.large.features.aiAdvanced'),
                t('upgrade.plans.large.features.consulting'),
                t('upgrade.plans.large.features.enterprise'),
                t('upgrade.plans.large.features.multiLocation')
              ],
              [t('upgrade.plans.large.additionalCosts.users'), t('upgrade.plans.large.additionalCosts.storage'), t('upgrade.plans.large.additionalCosts.aiCards')]
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
{t('upgrade.upgradeButton')}
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