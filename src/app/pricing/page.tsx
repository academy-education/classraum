"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { useState, useEffect } from "react"
import Header from "@/components/shared/Header"

export default function PricingPage() {
  const [appUrl, setAppUrl] = useState("https://app.classraum-9vh678u89-daniel-kims-projects-7acd367a.vercel.app")

  // Set the correct app URL based on environment
  useEffect(() => {
    if (window.location.hostname === 'localhost') {
      const { protocol, port } = window.location
      setAppUrl(`${protocol}//app.localhost${port ? ':' + port : ''}`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="pricing" />

      {/* Hero Section */}
      <main className="mx-auto px-6 py-16" style={{ maxWidth: '1200px' }}>
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold leading-none mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start free and scale as you grow. No hidden fees, no complex contracts.
          </p>
        </div>

        {/* Pricing Cards */}
        <section className="mb-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Individual Plan */}
            <div className="bg-white rounded-2xl shadow-lg border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
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
              
              <a href={`${appUrl}/auth`}>
                <Button className="w-full text-sm hover:scale-105 transition-transform duration-200">Start Free Trial</Button>
              </a>
            </div>

            {/* Small Academy Plan */}
            <div className="bg-white rounded-2xl shadow-lg border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
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
              
              <a href={`${appUrl}/auth`}>
                <Button className="w-full text-sm hover:scale-105 transition-transform duration-200">Start Free Trial</Button>
              </a>
            </div>

            {/* Medium Academy Plan */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-primary p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative flex flex-col h-full">
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
              
              <a href={`${appUrl}/auth`}>
                <Button className="w-full text-sm hover:scale-105 transition-transform duration-200">Start Free Trial</Button>
              </a>
            </div>

            {/* Large Academy Plan */}
            <div className="bg-white rounded-2xl shadow-lg border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
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
              
              <a href={`${appUrl}/auth`}>
                <Button className="w-full text-sm hover:scale-105 transition-transform duration-200">Start Free Trial</Button>
              </a>
            </div>
          </div>
        </section>

        {/* Enterprise Contact Section */}
        <section className="mb-24">
          <div className="text-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 max-w-4xl mx-auto">
            <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
              Looking for Something Bigger?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Need a custom enterprise solution with unlimited users, advanced integrations, or specialized features? 
              We&apos;d love to discuss how CLASSRAUM can scale to meet your institution&apos;s unique requirements.
            </p>
            <a href="mailto:support@classraum.com?subject=Enterprise Inquiry" className="inline-block">
              <Button size="lg" className="text-base px-8 py-3 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl hover:bg-primary/90">
                Contact Us for Enterprise Solutions
              </Button>
            </a>
          </div>
        </section>

        {/* Productivity Benefits Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Transform Your Academy Operations
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              See how CLASSRAUM streamlines your educational workflow and saves valuable time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* AI-Powered Automation */}
            <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200 hover:border-purple-300 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer relative overflow-hidden flex flex-col">
              {/* Animated background overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/0 via-purple-100/30 to-pink-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
              
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-6 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                <svg className="w-6 h-6 text-white transition-transform duration-500 ease-out group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10 transition-colors duration-500 ease-out group-hover:text-purple-800">AI for Educational Management</h3>
              <p className="text-gray-700 mb-6 relative z-10 transition-colors duration-500 ease-out group-hover:text-gray-800">
                Instantly generate personalized report cards and student assessments with AI that understands educational needs.
              </p>
              <div className="space-y-2 text-sm text-gray-600 relative z-10 flex-grow">
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1">
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Automated report generation</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Intelligent student insights</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Smart scheduling optimization</span>
                </div>
              </div>
              <div className="mt-6 flex gap-3 relative z-10">
                <a href={`${appUrl}/auth`}>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm transition-all duration-300 ease-out hover:from-purple-600 hover:to-pink-600 hover:scale-105 hover:shadow-lg">
                    Get started
                  </Button>
                </a>
                <Button variant="ghost" className="text-purple-600 text-sm transition-all duration-300 ease-out hover:text-purple-700 hover:bg-purple-100 hover:scale-105">
                  Learn more
                </Button>
              </div>
            </div>

            {/* Unified Platform */}
            <div className="group bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-200 hover:border-blue-300 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer relative overflow-hidden flex flex-col">
              {/* Animated background overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100/0 via-blue-100/30 to-cyan-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
              
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-6 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                <svg className="w-6 h-6 text-white transition-transform duration-500 ease-out group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10 transition-colors duration-500 ease-out group-hover:text-blue-800">One Platform for All Academy Needs</h3>
              <p className="text-gray-700 mb-6 relative z-10 transition-colors duration-500 ease-out group-hover:text-gray-800">
                Replace multiple tools with one comprehensive platform that handles everything from attendance to parent communication.
              </p>
              <div className="space-y-2 text-sm text-gray-600 relative z-10 flex-grow">
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1">
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Unified student management</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Integrated communication</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Centralized data access</span>
                </div>
              </div>
              <div className="mt-6 flex gap-3 relative z-10">
                <a href={`${appUrl}/auth`}>
                  <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm transition-all duration-300 ease-out hover:from-blue-600 hover:to-cyan-600 hover:scale-105 hover:shadow-lg">
                    Get started
                  </Button>
                </a>
                <Button variant="ghost" className="text-blue-600 text-sm transition-all duration-300 ease-out hover:text-blue-700 hover:bg-blue-100 hover:scale-105">
                  Learn more
                </Button>
              </div>
            </div>

            {/* Professional Support */}
            <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200 hover:border-green-300 transition-all duration-500 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-105 cursor-pointer relative overflow-hidden flex flex-col">
              {/* Animated background overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-100/0 via-green-100/30 to-emerald-100/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"></div>
              
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mb-6 relative z-10 transition-all duration-500 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
                <svg className="w-6 h-6 text-white transition-transform duration-500 ease-out group-hover:scale-110" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10 transition-colors duration-500 ease-out group-hover:text-green-800">Expert Training & Support</h3>
              <p className="text-gray-700 mb-6 relative z-10 transition-colors duration-500 ease-out group-hover:text-gray-800">
                Get personalized guidance and comprehensive training to maximize your academy&apos;s digital transformation success.
              </p>
              <div className="space-y-2 text-sm text-gray-600 relative z-10 flex-grow">
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1">
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Personalized onboarding</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '50ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Ongoing training sessions</span>
                </div>
                <div className="flex items-center transition-all duration-300 ease-out group-hover:translate-x-1" style={{transitionDelay: '100ms'}}>
                  <Check className="w-4 h-4 text-green-500 mr-2 transition-colors duration-300 group-hover:text-green-600" />
                  <span className="transition-colors duration-300 group-hover:text-gray-800">Dedicated support team</span>
                </div>
              </div>
              <div className="mt-6 flex gap-3 relative z-10">
                <a href={`${appUrl}/auth`}>
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm transition-all duration-300 ease-out hover:from-green-600 hover:to-emerald-600 hover:scale-105 hover:shadow-lg">
                    Get started
                  </Button>
                </a>
                <Button variant="ghost" className="text-green-600 text-sm transition-all duration-300 ease-out hover:text-green-700 hover:bg-green-100 hover:scale-105">
                  Learn more
                </Button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Image src="/logo.png" alt="Classraum Logo" width={32} height={32} />
                <span className="text-xl font-bold">CLASSRAUM</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                AI-powered academy management platform that gives educators back their most valuable asset: time. Automate administrative tasks and focus on what matters most - teaching.
              </p>
              <div className="text-gray-400 text-sm">
                <p>support@classraum.com</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Quick Links</h3>
              <div className="space-y-2">
                <Link href="/#about" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  About
                </Link>
                <Link href="/pricing" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Pricing
                </Link>
                <Link href="/#contact" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Contact
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
                <Link href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features</h3>
              <div className="space-y-2">
                <Link href="/features/ai-report-cards" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  AI Report Cards
                </Link>
                <Link href="/features/customized-dashboard" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Customized Dashboard
                </Link>
                <Link href="/features/lesson-assignment-planner" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Lesson & Assignment Planner
                </Link>
                <Link href="/features/attendance-recording" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Attendance & Material Recording
                </Link>
                <Link href="/features/real-time-notifications" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Real-Time Notifications
                </Link>
                <Link href="/features/smart-linking-system" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Smart Linking System
                </Link>
                <Link href="/features/privacy-by-design" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Privacy by Design
                </Link>
                <Link href="/features/scheduling" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Auto Scheduling
                </Link>
                <Link href="/features/analytics" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Performance Analytics
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 CLASSRAUM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}