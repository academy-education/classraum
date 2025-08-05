"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, School, Users, Download, Clock, Eye, CreditCard, Smartphone, Baby, Shield, HelpCircle } from "lucide-react"
import { useState } from "react"
import Header from "@/components/shared/Header"

export default function FAQsPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const faqs = [
    {
      id: 1,
      question: "Is this app school-specific?",
      answer: "No, CLASSRAUM is designed to work with any educational institution - from individual tutors to large schools and academies. Our platform is flexible and adapts to your specific needs, whether you're teaching 10 students or managing 1000+. You can customize the system to match your institution's workflow and requirements.",
      icon: School
    },
    {
      id: 2,
      question: "Who enters the grades?",
      answer: "Teachers and authorized staff members can enter grades directly into the system. Each user has specific permissions based on their role - teachers can only access their assigned classes, while administrators have broader access. All grade entries are tracked with timestamps and user identification for complete accountability.",
      icon: Users
    },
    {
      id: 3,
      question: "Can I download or print the reports?",
      answer: "Yes! All reports can be downloaded in multiple formats including PDF, Excel, and CSV. You can print individual student reports, class summaries, or comprehensive institutional reports. The system also allows you to customize report templates to match your institution's branding and requirements.",
      icon: Download
    },
    {
      id: 4,
      question: "What happens after the free trial?",
      answer: "After your 10-day free trial ends, you can choose to subscribe to one of our plans or your account will be paused. Your data remains safe and accessible for 30 days, giving you time to decide. If you subscribe within this period, you'll have immediate access to all your data and can continue using the platform seamlessly.",
      icon: Clock
    },
    {
      id: 5,
      question: "Who can see the report card data?",
      answer: "Access to report card data is strictly controlled. Students can only see their own data, parents can only access their children's information, and teachers can only view data for their assigned classes. Administrators have broader access based on their role. All access is logged and monitored for security purposes.",
      icon: Eye
    },
    {
      id: 6,
      question: "What happens if I cancel my subscription?",
      answer: "You can cancel your subscription at any time. Your data will remain accessible for 90 days after cancellation, allowing you to export any information you need. After this period, data is securely deleted from our servers. You can reactivate your account within the 90-day window to restore full access.",
      icon: CreditCard
    },
    {
      id: 7,
      question: "Is there a mobile app available?",
      answer: "Yes, we offer mobile apps for both iOS and Android devices (available with Medium Academy plan and above). The mobile app provides full functionality including grade entry, attendance tracking, communication tools, and report viewing. Students and parents can also access their information through the mobile app.",
      icon: Smartphone
    },
    {
      id: 8,
      question: "Can multiple children be tracked under one account?",
      answer: "Absolutely! Parent accounts can be linked to multiple children, allowing them to view all their children's progress from a single dashboard. Each child's data remains separate and secure, but parents get a consolidated view of attendance, grades, assignments, and communications for all their children.",
      icon: Baby
    },
    {
      id: 9,
      question: "Is my child's data safe and private?",
      answer: "Data security and privacy are our top priorities. We use enterprise-grade encryption, secure servers, and comply with all major privacy regulations including GDPR and COPPA. Student data is never shared with third parties, and we implement strict access controls to ensure only authorized individuals can view sensitive information.",
      icon: Shield
    },
    {
      id: 10,
      question: "Do you offer support if I have technical issues?",
      answer: "Yes! We provide comprehensive support through multiple channels including email, live chat, and phone support. Our support team is available during business hours, and we also offer extensive documentation, video tutorials, and a knowledge base. Premium plans include priority support with faster response times.",
      icon: HelpCircle
    }
  ]

  const toggleFAQ = (id: number) => {
    setOpenFAQ(openFAQ === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="faqs" />

      {/* Main Content */}
      <main className="mx-auto px-6 py-16" style={{ maxWidth: '1200px' }}>
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold mb-6">
            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">Questions</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Find answers to common questions about CLASSRAUM. Can&apos;t find what you&apos;re looking for? Contact our support team.
          </p>
        </div>

        {/* FAQ Section */}
        <section className="mb-24">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div
                  key={faq.id}
                  className="group relative bg-gradient-to-br from-white via-gray-50/30 to-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-400 ease-out hover:-translate-y-2 hover:scale-[1.01] border border-gray-100 hover:border-blue-200/50 overflow-hidden"
                >
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-400 ease-out rounded-3xl"></div>
                  <div className="absolute inset-[1px] bg-gradient-to-br from-white via-gray-50/50 to-white rounded-3xl"></div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-8 py-8 text-left flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50/40 hover:to-purple-50/20 rounded-3xl transition-all duration-300 ease-out group-hover:px-10"
                    >
                      <div className="flex items-center space-x-6">
                        {/* Enhanced icon with smooth gradient background */}
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl">
                            <faq.icon className="w-6 h-6 text-white transition-transform duration-300 ease-out group-hover:scale-105" />
                          </div>
                          {/* Smooth floating particle */}
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out group-hover:animate-pulse" style={{transitionDelay: `${index * 50}ms`}}></div>
                        </div>
                        <div className="flex-1">
                          <span className="text-xl font-bold text-gray-900 group-hover:text-blue-900 transition-colors duration-300 ease-out">{faq.question}</span>
                          <div className="h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-400 ease-out origin-left mt-2 rounded-full"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-purple-100 rounded-full flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-105">
                          {openFAQ === faq.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 ease-out" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 ease-out" />
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {openFAQ === faq.id && (
                      <div className="px-8 pb-8 transition-all duration-300 ease-out">
                        <div className="flex items-start space-x-6">
                          {/* Answer icon with smooth gradient */}
                          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transform transition-all duration-300 ease-out hover:scale-105">
                            <span className="text-white font-bold text-lg">A</span>
                          </div>
                          <div className="flex-1">
                            {/* Answer content with smooth styling */}
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-2xl p-6 border border-gray-100 shadow-sm transition-all duration-300 ease-out hover:shadow-md">
                              <div className="text-gray-800 leading-relaxed text-base">
                                {faq.answer}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Smooth decorative elements */}
                  <div className="absolute top-4 right-4 w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-60 transition-all duration-400 ease-out" style={{transitionDelay: `${index * 30}ms`}}></div>
                  <div className="absolute bottom-4 left-4 w-1 h-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-0 group-hover:opacity-40 transition-all duration-500 ease-out" style={{transitionDelay: `${index * 40}ms`}}></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Still Have Questions Section */}
        <section className="mb-16">
          <div className="text-center py-16 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-3xl">
            <div className="mx-auto px-6" style={{ maxWidth: '800px' }}>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">Still have questions?</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
                Our support team is here to help you get the most out of CLASSRAUM.
              </p>
              <a href="mailto:support@classraum.com">
                <Button size="lg" className="text-base px-8">
                  Contact Support
                </Button>
              </a>
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
                <Link href="/about" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  About
                </Link>
                <Link href="/pricing" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  Pricing
                </Link>
                <Link href="/faqs" className="block text-gray-400 hover:text-white transition-colors text-sm">
                  FAQs
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
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-gray-400 text-sm">© 2025 CLASSRAUM. All rights reserved.</p>
              <div className="flex space-x-6">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Privacy Policy
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Terms of Service
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}