import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingDown, DollarSign, Home, CreditCard, Users } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="px-6 md:px-12 lg:px-24 py-6 flex justify-between items-center backdrop-blur-xl bg-white/70 border-b border-white/20 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <img 
            src="https://customer-assets.emergentagent.com/job_7c3fdd96-2e7c-4f0d-8929-2f39966615d7/artifacts/d1dzd93e_BankEzee%20Logo.png" 
            alt="BankEzee Logo" 
            className="h-12"
          />
        </div>
        <div className="flex gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/login')}
            className="text-slate-600 hover:text-primary transition-colors"
            data-testid="nav-login-btn"
          >
            Login
          </Button>
          <Button
            onClick={() => navigate('/lead-form')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-8"
            data-testid="nav-getstarted-btn"
          >
            Get Started
          </Button>
        </div>
      </nav>

      <section className="px-6 md:px-12 lg:px-24 py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 fade-in">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-none mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Your Loan,
            <br />
            <span className="text-primary">Simplified</span>
          </h2>
          <p className="text-lg leading-relaxed text-slate-600 mb-8 max-w-2xl">
            Merge multiple loans, reduce EMIs, or get fresh credit — all in one place.
            Bankezee connects you with the best loan solutions backed by expert agents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate('/lead-form')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-8 py-6 text-lg font-semibold"
              data-testid="hero-apply-btn"
            >
              Apply for Loan <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
        <div className="md:col-span-5">
          <img
            src="https://images.unsplash.com/photo-1758523671893-0ba21cf4260f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzNTl8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGZhbWlseSUyMGhvbGRpbmclMjBob3VzZSUyMGtleXN8ZW58MHx8fHwxNzcwMzA0MTg2fDA&ixlib=rb-4.1.0&q=85"
            alt="Happy family with home keys"
            className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover-lift"
          />
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 py-20 bg-white">
        <div className="text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>Our Services</h3>
          <p className="text-lg leading-relaxed text-slate-600 max-w-2xl mx-auto">
            Choose from a range of financial solutions tailored to your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: <TrendingDown className="w-8 h-8 text-primary" />,
              title: 'Reduce Home Loan EMI',
              desc: 'Lower your monthly payments with better rates',
            },
            {
              icon: <DollarSign className="w-8 h-8 text-primary" />,
              title: 'Merge Multiple Loans',
              desc: 'Consolidate all debts into one easy payment',
            },
            {
              icon: <Home className="w-8 h-8 text-primary" />,
              title: 'Top-up Loan',
              desc: 'Get additional funds on existing home loans',
            },
            {
              icon: <CreditCard className="w-8 h-8 text-primary" />,
              title: 'Fresh Loans',
              desc: 'New personal and home loans at competitive rates',
            },
          ].map((service, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-100 shadow-sm rounded-xl p-8 hover-lift"
              data-testid={`service-card-${idx}`}
            >
              <div className="mb-4">{service.icon}</div>
              <h4 className="text-2xl font-semibold tracking-tight mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {service.title}
              </h4>
              <p className="text-base leading-relaxed text-slate-600">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-5">
            <img
              src="https://images.unsplash.com/photo-1758599543152-a73184816eba?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxOTB8MHwxfHNlYXJjaHwzfHxwcm9mZXNzaW9uYWwlMjBidXNpbmVzcyUyMGhhbmRzaGFrZSUyMG1lZXRpbmd8ZW58MHx8fHwxNzcwMzA0MTkxfDA&ixlib=rb-4.1.0&q=85"
              alt="Professional partnership"
              className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover-lift"
            />
          </div>
          <div className="md:col-span-7">
            <h3 className="text-4xl md:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Join as Agent
            </h3>
            <p className="text-lg leading-relaxed text-slate-600 mb-6">
              Join our network of sales agents and start earning competitive commissions.
              Get your own QR code, generate leads, and track your earnings in real-time.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <Users className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <strong className="text-secondary">Sales Agents:</strong>
                  <span className="text-slate-600 ml-2">Generate detailed leads and earn commission</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Users className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <strong className="text-secondary">Retail Partners:</strong>
                  <span className="text-slate-600 ml-2">Quick lead capture with QR codes</span>
                </div>
              </li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => navigate('/agent-registration')}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-full px-8 py-6 text-lg font-semibold"
                data-testid="partner-agent-btn"
              >
                Register as Agent
              </Button>
              <Button
                onClick={() => navigate('/partner-registration')}
                variant="outline"
                className="bg-white text-secondary border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all rounded-full px-8 py-6 text-lg font-medium"
                data-testid="partner-retail-btn"
              >
                Register as Retail Partner
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-secondary text-white py-12 px-6 md:px-12 lg:px-24">
        <div className="text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_7c3fdd96-2e7c-4f0d-8929-2f39966615d7/artifacts/d1dzd93e_BankEzee%20Logo.png" 
            alt="BankEzee Logo" 
            className="h-10 mx-auto mb-4"
          />
          <p className="text-slate-300 mb-2">Your trusted partner for loan solutions</p>
          <p className="text-sm text-slate-400">© 2026 BankEzee. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;