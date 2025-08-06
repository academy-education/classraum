"use client"

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Upgrade Your Plan</h1>
        <p className="text-gray-500">Choose the perfect plan to unlock your academy's full potential</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {/* Individual Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Individual Plan</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩24,900<span className="text-sm text-gray-600">/month</span></div>
            <p className="text-gray-600 text-sm">For tutors & private teachers</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Up to 15 total users</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">2GB cloud storage</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Web-only access</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Contacts & classrooms</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Sessions & assignments</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Email support</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Basic security features</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">+₩10,000 per 5 users</p>
            <p className="text-xs text-gray-500">+₩5,000 per 1GB storage</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              'Individual Plan',
              '₩24,900',
              'For tutors & private teachers',
              [
                'Up to 15 total users',
                '2GB cloud storage',
                'Web-only access',
                'Contacts & classrooms',
                'Sessions & assignments',
                'Email support',
                'Basic security features'
              ],
              ['+₩10,000 per 5 users', '+₩5,000 per 1GB storage']
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            Upgrade
          </Button>
        </Card>

        {/* Small Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Small Academy</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩199,000<span className="text-sm text-gray-600">/month</span></div>
            <p className="text-gray-600 text-sm">For growing academies</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">150 users (70 students)</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">25GB cloud storage</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Report cards included</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">App & web access</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Full management suite</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Priority email support</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Professional reports</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">+₩25,000 per 10 users</p>
            <p className="text-xs text-gray-500">+₩12,000 per 5GB storage</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              'Small Academy',
              '₩199,000',
              'For growing academies',
              [
                '150 users (70 students)',
                '25GB cloud storage',
                'Report cards included',
                'App & web access',
                'Full management suite',
                'Priority email support',
                'Professional reports'
              ],
              ['+₩25,000 per 10 users', '+₩12,000 per 5GB storage']
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            Upgrade
          </Button>
        </Card>

        {/* Medium Academy Plan - Most Popular */}
        <Card className="p-6 border-2 border-primary hover:shadow-lg transition-all duration-300 relative flex flex-col h-full">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-medium">Most Popular</span>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Medium Academy</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩349,000<span className="text-sm text-gray-600">/month</span></div>
            <p className="text-gray-600 text-sm">Established institutions</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">320 users (150 students)</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">100GB cloud storage</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">150 AI report cards</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Layout customization</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Consulting introduction</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">All features included</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Priority support</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">+₩25,000 per 10 users</p>
            <p className="text-xs text-gray-500">+₩15,000 per 10GB storage</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              'Medium Academy',
              '₩349,000',
              'Established institutions',
              [
                '320 users (150 students)',
                '100GB cloud storage',
                '150 AI report cards',
                'Layout customization',
                'Consulting introduction',
                'All features included',
                'Priority support'
              ],
              ['+₩25,000 per 10 users', '+₩15,000 per 10GB storage']
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            Upgrade
          </Button>
        </Card>

        {/* Large Academy Plan */}
        <Card className="p-6 hover:shadow-lg transition-all duration-300 flex flex-col h-full">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Large Academy</h3>
            <div className="text-3xl font-bold text-gray-900 mb-1">₩649,000<span className="text-sm text-gray-600">/month</span></div>
            <p className="text-gray-600 text-sm">Large institutions</p>
          </div>
          
          <ul className="space-y-3 mb-8 flex-grow">
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">650 users (300 students)</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">300GB cloud storage</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">600 AI report cards</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Advanced AI functions</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Training + consulting</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Enterprise features</span>
            </li>
            <li className="flex items-center space-x-3">
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-gray-700 text-sm">Multi-location support</span>
            </li>
          </ul>
          
          <div className="text-center mb-4">
            <p className="text-xs text-gray-500">+₩25,000 per 10 users</p>
            <p className="text-xs text-gray-500">+₩20,000 per 20GB storage</p>
            <p className="text-xs text-gray-500">+₩100,000 per 100 AI cards</p>
          </div>
          
          <Button 
            onClick={() => handleUpgradeClick(
              'Large Academy',
              '₩649,000',
              'Large institutions',
              [
                '650 users (300 students)',
                '300GB cloud storage',
                '600 AI report cards',
                'Advanced AI functions',
                'Training + consulting',
                'Enterprise features',
                'Multi-location support'
              ],
              ['+₩25,000 per 10 users', '+₩20,000 per 20GB storage', '+₩100,000 per 100 AI cards']
            )}
            className="w-full text-sm hover:scale-105 transition-transform duration-200"
          >
            Upgrade
          </Button>
        </Card>
      </div>

      {/* Enterprise Contact Section */}
      <Card className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 border-2 mb-12">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Looking for Something Bigger?
          </h3>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Need a custom enterprise solution with unlimited users, advanced integrations, or specialized features? 
            We&apos;d love to discuss how CLASSRAUM can scale to meet your institution&apos;s unique requirements.
          </p>
          <Button size="lg" className="text-base px-8 py-3 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl">
            Contact Us for Enterprise Solutions
          </Button>
        </div>
      </Card>

    </div>
  )
}