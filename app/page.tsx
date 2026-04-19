'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Shield,
  BookOpen,
  Pen,
  Stethoscope,
  Scale,
  Lightbulb,
  Lock,
  Zap,
  Layout,
  Layers,
  ArrowRight,
  X,
  Check,
  MessageSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'

function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true)
        observer.disconnect()
      }
    }, { threshold: 0.1, ...options })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  return { ref, isInView }
}

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const { ref, isInView } = useInView()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  )
}

const comparisonData = [
  {
    useCase: 'Security Research',
    chatgpt: "I can't help with explaining exploits or vulnerabilities...",
    infinet: 'Detailed technical breakdowns of attack vectors and defensive strategies'
  },
  {
    useCase: 'Medical Questions',
    chatgpt: "I'd recommend consulting with a healthcare professional...",
    infinet: 'Specific information with context, citations, and nuanced discussion'
  },
  {
    useCase: 'Creative Writing',
    chatgpt: "I'd prefer not to write content with mature themes...",
    infinet: 'Full creative freedom to explore complex characters and dark themes'
  },
  {
    useCase: 'Controversial Topics',
    chatgpt: "I should remain neutral and cannot provide opinions...",
    infinet: 'Genuine analysis and intellectual engagement with difficult questions'
  }
]

const useCases = [
  {
    icon: Shield,
    title: 'Security Professionals',
    description: 'Understand attacks to build better defenses. Get real technical depth without artificial barriers.'
  },
  {
    icon: BookOpen,
    title: 'Researchers & Academics',
    description: 'Access unfiltered information on sensitive topics. Your research deserves complete answers.'
  },
  {
    icon: Pen,
    title: 'Writers & Creatives',
    description: 'Explore dark themes, complex characters, and mature content without creative restrictions.'
  },
  {
    icon: Stethoscope,
    title: 'Medical Professionals',
    description: 'Get specific clinical data and frank discussions, not hedge-everything responses.'
  },
  {
    icon: Scale,
    title: 'Legal Professionals',
    description: 'Straight answers about grey areas. Navigate complexity without patronizing disclaimers.'
  },
  {
    icon: Lightbulb,
    title: 'Curious Minds',
    description: 'Ask hard questions and get honest engagement. Your curiosity is welcome here.'
  }
]

const features = [
  {
    icon: MessageSquare,
    title: 'No Content Filters',
    description: 'Ask anything, get real answers. No artificial restrictions on legitimate inquiries.'
  },
  {
    icon: Lock,
    title: 'Private by Default',
    description: "Your conversations aren't logged or used for training. What you discuss stays yours."
  },
  {
    icon: Zap,
    title: 'Fast Responses',
    description: 'Powered by cutting-edge models for rapid, intelligent output when you need it.'
  },
  {
    icon: Layout,
    title: 'Clean Interface',
    description: 'Focused on the conversation, not cluttered with distractions. Just you and AI.'
  },
  {
    icon: Layers,
    title: 'Projects & Organization',
    description: 'Keep conversations organized by topic. Find anything with powerful search.'
  }
]

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [activeComparison, setActiveComparison] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveComparison((prev) => (prev + 1) % comparisonData.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="dark">
      <div className="min-h-screen bg-[hsl(220,20%,6%)] text-[hsl(60,9%,94%)] mesh-gradient noise-overlay relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />

      {/* Sticky Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b shadow-lg' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/logo.png"
                alt="Infinet"
                width={32}
                height={32}
                className="transition-transform group-hover:scale-105"
              />
              <span className="text-xl font-semibold tracking-tight">Infinet</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/pricing" className="hidden sm:block">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Pricing
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button className="bg-amber-500 hover:bg-amber-600 text-background font-medium px-4 sm:px-6">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in">
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 leading-[1.1]">
                <span className="text-foreground">Intelligence</span>
                <br />
                <span className="text-gradient">without interference</span>
              </h1>
            </div>

            <p className="animate-fade-in-delay-1 text-lg sm:text-xl text-muted-foreground mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
              AI that treats you like an adult. Ask anything, get real answers.
              No content filters, no patronizing refusals—just genuine intelligence at your service.
            </p>

            <div className="animate-fade-in-delay-2 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-background font-medium px-8 py-6 text-lg group">
                  Start Chatting
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-border/50 hover:bg-secondary/50 px-8 py-6 text-lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Animated glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl animate-glow pointer-events-none" />
      </section>

      {/* Why Infinet - Comparison Section */}
      <section className="relative py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
              Why <span className="text-gradient">Infinet</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Mainstream AI is optimized for PR safety, not user utility. We're different.
            </p>
          </AnimatedSection>

          <AnimatedSection delay={200}>
            <div className="max-w-5xl mx-auto">
              {/* Comparison tabs */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {comparisonData.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveComparison(index)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeComparison === index
                        ? 'bg-amber-500 text-background'
                        : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {item.useCase}
                  </button>
                ))}
              </div>

              {/* Comparison cards */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative p-6 sm:p-8 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <X className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="font-medium text-muted-foreground">ChatGPT says...</span>
                  </div>
                  <p className="text-foreground/80 italic leading-relaxed">
                    "{comparisonData[activeComparison].chatgpt}"
                  </p>
                </div>

                <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="font-medium text-amber-400">Infinet provides...</span>
                  </div>
                  <p className="text-foreground leading-relaxed">
                    {comparisonData[activeComparison].infinet}
                  </p>
                </div>
              </div>

              <p className="text-center text-muted-foreground mt-8 text-sm">
                Your intentions are your business. We provide information—you decide what to do with it.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative py-20 sm:py-32 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
              Built for <span className="text-gradient">professionals</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Infinet is for people who need complete answers, not sanitized summaries.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {useCases.map((useCase, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="group p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-amber-500/30 transition-all duration-300 h-full">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
                    <useCase.icon className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {useCase.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12 sm:mb-16">
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold mb-4">
              Everything you need
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features wrapped in a clean, focused interface.
            </p>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <AnimatedSection key={index} delay={index * 100}>
                <div className="group p-6 rounded-2xl bg-card/30 border border-border/30 hover:border-border/60 transition-all duration-300">
                  <feature.icon className="w-8 h-8 text-amber-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Sister Product — Artifacial.io */}
      <section className="relative py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <a
              href="https://artifacial.io"
              target="_blank"
              rel="noopener noreferrer"
              className="group block max-w-5xl mx-auto"
            >
              <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent border border-violet-400/20 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-violet-400/40 hover:from-violet-500/15">
                {/* Decorative glow */}
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                      <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-300 text-xs font-medium mb-3">
                      Sister Product
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold mb-3 leading-tight">
                      Want to generate images without limits?
                    </h2>
                    <p className="text-muted-foreground text-base sm:text-lg mb-4 leading-relaxed">
                      Try <span className="text-violet-300 font-medium">artifacial.io</span> — our unrestricted image generation platform built for creators who need full creative freedom.
                    </p>
                    <div className="inline-flex items-center gap-2 text-violet-300 font-medium group-hover:gap-3 transition-all">
                      Visit artifacial.io
                      <ExternalLink className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="max-w-3xl mx-auto text-center p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 backdrop-blur-sm relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

              <div className="relative">
                <h2 className="font-display text-3xl sm:text-4xl font-semibold mb-4">
                  Ready to think freely?
                </h2>
                <p className="text-muted-foreground text-lg mb-8">
                  Start free, upgrade when you need more. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/sign-up">
                    <Button size="lg" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-background font-medium px-8">
                      Get Started Free
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-amber-500/30 hover:bg-amber-500/10">
                      View Plans
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Infinet"
                width={24}
                height={24}
              />
              <span className="font-medium">Infinet</span>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">
                Pricing
              </Link>
              <a href="https://artifacial.io" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                artifacial.io
              </a>
              <a href="mailto:support@infinetai.org" className="hover:text-foreground transition-colors">
                Support
              </a>
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>

            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Infinet. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}
