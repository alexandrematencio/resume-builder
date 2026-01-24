'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Briefcase,
  FileText,
  Sparkles,
  Filter,
  Target,
  CheckCircle,
  ArrowRight,
  Zap,
  Clock
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-950">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-primary-900/80 backdrop-blur-sm border-b border-primary-200 dark:border-primary-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="AppTracker"
              width={40}
              height={20}
              className="h-5 w-auto"
            />
            <span className="text-xl font-semibold text-primary-900 dark:text-primary-50">
              AppTracker
            </span>
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 hover:text-primary-900 dark:hover:text-primary-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-primary text-sm"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-powered matching
              </div>

              <h1 className="text-4xl lg:text-5xl font-semibold text-primary-900 dark:text-primary-50 leading-tight mb-6">
                Know which jobs fit you
                <br />
                <span className="text-accent-600 dark:text-accent-400">before you apply.</span>
              </h1>

              <p className="text-lg text-primary-600 dark:text-primary-400 mb-8 leading-relaxed">
                Import any job description. AI scores it against your profile — skills match,
                salary fit, blockers. Then generates a tailored CV and cover letter in seconds.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup" className="btn-primary btn-lg">
                  Get started free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <Link href="#features" className="btn-secondary btn-lg">
                  See how it works
                </Link>
              </div>

              <p className="mt-10 text-sm text-primary-500 dark:text-primary-400">
                Free to use. No credit card required.
              </p>
            </div>

            {/* Right: Hero Image Placeholder */}
            <div className="relative">
              <div className="bg-white dark:bg-primary-800 rounded-xl shadow-xl border border-primary-200 dark:border-primary-700 overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-primary-100 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-error-400"></div>
                    <div className="w-3 h-3 rounded-full bg-warning-400"></div>
                    <div className="w-3 h-3 rounded-full bg-success-400"></div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white dark:bg-primary-800 rounded px-3 py-1 text-xs text-primary-400 text-center">
                      app.apptracker.io
                    </div>
                  </div>
                </div>
                {/* Placeholder for matching dashboard screenshot */}
                <div className="aspect-[4/3] bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-900 p-6 flex items-center justify-center">
                  <div className="text-center">
                    <Target className="w-16 h-16 text-primary-400 dark:text-primary-600 mx-auto mb-4" />
                    <p className="text-sm text-primary-500 dark:text-primary-400 font-medium">
                      Matching Dashboard
                    </p>
                    <p className="text-xs text-primary-400 dark:text-primary-500 mt-1">
                      Replace with: Job intelligence view showing match score, skills overlap, and insights
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating card - Stats */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-primary-800 rounded-lg shadow-lg border border-primary-200 dark:border-primary-700 p-4 w-48">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-primary-900 dark:text-primary-50">87%</p>
                    <p className="text-xs text-primary-500 dark:text-primary-400">Skills match</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white dark:bg-primary-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-primary-900 dark:text-primary-50 mb-4">
              Intelligent tools for a focused job search
            </h2>
            <p className="text-primary-600 dark:text-primary-400 max-w-2xl mx-auto">
              From evaluating fit to generating documents, every step is informed by AI analysis of your profile.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - Profile-to-Job Matching */}
            <div className="p-6 rounded-xl bg-primary-50 dark:bg-primary-800/50 border border-primary-100 dark:border-primary-700">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                Profile-to-Job Matching
              </h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm leading-relaxed">
                Paste a job description. AI compares requirements against your skills, experience, and preferences. See your match score instantly.
              </p>
            </div>

            {/* Feature 2 - Intelligent Filtering */}
            <div className="p-6 rounded-xl bg-primary-50 dark:bg-primary-800/50 border border-primary-100 dark:border-primary-700">
              <div className="w-12 h-12 bg-info-100 dark:bg-info-900/30 rounded-lg flex items-center justify-center mb-4">
                <Filter className="w-6 h-6 text-info-600 dark:text-info-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                Intelligent Filtering
              </h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm leading-relaxed">
                Jobs that don&apos;t meet your salary, location, or remote requirements are automatically flagged. Focus only on viable opportunities.
              </p>
            </div>

            {/* Feature 3 - AI-Tailored CVs */}
            <div className="p-6 rounded-xl bg-primary-50 dark:bg-primary-800/50 border border-primary-100 dark:border-primary-700">
              <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-success-600 dark:text-success-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                AI-Tailored CVs
              </h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm leading-relaxed">
                Generate a CV customized to each job&apos;s requirements. Your experience is restructured to highlight what matters most for the role.
              </p>
            </div>

            {/* Feature 4 - Cover Letters */}
            <div className="p-6 rounded-xl bg-primary-50 dark:bg-primary-800/50 border border-primary-100 dark:border-primary-700">
              <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                Cover Letters in Your Style
              </h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm leading-relaxed">
                French formal, American creative, or anything in between. AI drafts a letter matched to the company&apos;s culture and your tone.
              </p>
            </div>

            {/* Feature 5 - Role Profiles */}
            <div className="p-6 rounded-xl bg-primary-50 dark:bg-primary-800/50 border border-primary-100 dark:border-primary-700">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-lg flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6 text-accent-600 dark:text-accent-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                Role-Specific Profiles
              </h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm leading-relaxed">
                Create distinct professional identities for different job types. Frontend, fullstack, management — each with its own summary and highlights.
              </p>
            </div>

            {/* Feature 6 - Application Pipeline */}
            <div className="p-6 rounded-xl bg-primary-50 dark:bg-primary-800/50 border border-primary-100 dark:border-primary-700">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-700/50 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                Application Pipeline
              </h3>
              <p className="text-primary-600 dark:text-primary-400 text-sm leading-relaxed">
                Track every application from draft to offer. Schedule interviews, record outcomes, and see your progress at a glance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Feature Section - Job Matching */}
      <section className="py-20 px-6 bg-gradient-to-b from-primary-900 to-primary-950">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Feature preview placeholder */}
            <div className="order-2 lg:order-1">
              <div className="bg-primary-800 rounded-xl border border-primary-700 overflow-hidden">
                <div className="aspect-[4/3] p-6 flex items-center justify-center">
                  <div className="text-center">
                    <Target className="w-16 h-16 text-accent-500 mx-auto mb-4" />
                    <p className="text-sm text-primary-300 font-medium">
                      Intelligence View
                    </p>
                    <p className="text-xs text-primary-500 mt-1 max-w-xs">
                      Replace with: Intelligence view showing 87% match, skills comparison, and AI insights panel
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Copy */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-900/50 text-accent-300 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Core Feature
              </div>

              <h2 className="text-3xl lg:text-4xl font-semibold text-white leading-tight mb-6">
                AI evaluates every job against your profile
              </h2>

              <p className="text-lg text-primary-300 mb-8 leading-relaxed">
                Import a job description — by URL or paste. In seconds, AI extracts requirements, compares them to your skills and preferences, and gives you a clear picture: match score, skill gaps, red flags, and strategic advice.
              </p>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">Skills match analysis</span>
                    <p className="text-primary-400 text-sm mt-1">
                      See exactly which of your skills align with the role&apos;s requirements, and which ones you&apos;re missing.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">Hard blockers detected</span>
                    <p className="text-primary-400 text-sm mt-1">
                      Salary below your minimum? Wrong location? Remote policy mismatch? The system tells you before you invest time.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-white font-medium">Strategic insights</span>
                    <p className="text-primary-400 text-sm mt-1">
                      AI provides culture fit assessment, growth potential, and specific advice on how to position your application.
                    </p>
                  </div>
                </li>
              </ul>

              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition-colors"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white dark:bg-primary-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold text-primary-900 dark:text-primary-50 mb-4">
              Get started in minutes
            </h2>
            <p className="text-primary-600 dark:text-primary-400">
              Four steps from profile to tailored application.
            </p>
          </div>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-accent-700 dark:text-accent-300 font-semibold">1</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                  Build your profile
                </h3>
                <p className="text-primary-600 dark:text-primary-400">
                  Import your CV as a PDF or fill in your experience, skills, and preferences. This becomes the foundation AI uses to evaluate every job.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-accent-700 dark:text-accent-300 font-semibold">2</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                  Import a job description
                </h3>
                <p className="text-primary-600 dark:text-primary-400">
                  Paste the text or provide a URL. AI extracts the role&apos;s requirements, salary, location, and perks automatically.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-accent-700 dark:text-accent-300 font-semibold">3</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                  Review your match
                </h3>
                <p className="text-primary-600 dark:text-primary-400">
                  See your overall score, skills overlap, blockers, and strategic advice. Decide in seconds whether the job is worth pursuing.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6 items-start">
              <div className="w-12 h-12 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-accent-700 dark:text-accent-300 font-semibold">4</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary-900 dark:text-primary-50 mb-2">
                  Generate documents and apply
                </h3>
                <p className="text-primary-600 dark:text-primary-400">
                  AI creates a tailored CV and cover letter highlighting what makes you the right fit. Track the application through your pipeline.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/signup" className="btn-primary btn-lg">
              Start matching for free
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary-50 dark:bg-primary-950">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold text-primary-900 dark:text-primary-50 mb-6">
            Stop guessing. Start matching.
          </h2>
          <p className="text-lg text-primary-600 dark:text-primary-400 mb-8">
            Build your profile once. Evaluate every opportunity with AI. Apply with confidence. Free to start, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-primary btn-lg">
              Create free account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="/login" className="btn-secondary btn-lg">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-primary-900 dark:bg-primary-950 border-t border-primary-800">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="AppTracker"
                width={32}
                height={16}
                className="h-4 w-auto opacity-80"
              />
              <span className="text-primary-400 text-sm">
                AppTracker
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-primary-500">
              <Link href="/login" className="hover:text-primary-300 transition-colors">
                Log in
              </Link>
              <Link href="/signup" className="hover:text-primary-300 transition-colors">
                Sign up
              </Link>
            </div>
            <p className="text-primary-600 text-sm">
              2026 AppTracker. Built for job seekers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
