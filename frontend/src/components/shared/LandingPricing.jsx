import { Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";

export default function LandingPricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rzpLoaded, setRzpLoaded] = useState(false);
  const [rzpKeyId, setRzpKeyId] = useState(null);
  const plans = [
    {
      name: "Standard",
      price: "Free",
      period: "forever",
      description:
        "Essential cyber protection for individuals and cautious citizens navigating daily digital risks.",
      features: [
        { title: "Up to 5 daily threat scans" },
        { title: "Analyze text, URLs, and images" },
        { title: "Standard anomaly detection" },
        { title: "Basic explanation verdicts" },
        { title: "English language support" },
      ],
      ctaLabel: "Start For Free",
      highlighted: false,
    },
    {
      name: "Premium",
      price: "₹999",
      period: "per month",
      description:
        "Comprehensive, enterprise-grade cyber defense for proactive teams and security professionals.",
      features: [
        { title: "Unlimited threat scans", description: "Zero usage caps" },
        {
          title: "Deepfake audio & video analysis",
          description: "Up to 50 MB",
        },
        {
          title: "Multi-lingual capabilities",
          description: "Supports 8 regional Indian languages",
        },
        { title: "Real-time regional threat alerts" },
      ],
      highlighted: true,
      badgeText: "RECOMMENDED",
      ctaLabel: "Upgrade To Premium",
      guaranteeText: "Secure payments via Razorpay",
    },
  ];

  // Load Razorpay script on mount
  useEffect(() => {
    const envKey =
      import.meta.env.VITE_RAZORPAY_ID ||
      import.meta.env.VITE_RAZORPAY_KEY ||
      "rzp_test_mock";
    setRzpKeyId(envKey);

    // Check if script already exists
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      setRzpLoaded(true);
      return;
    }

    // Load Razorpay script from CDN
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      setRzpLoaded(true);
    };
    script.onerror = () => {
      setError("Failed to load payment gateway.");
    };
    document.body.appendChild(script);

    return () => {
      const s = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (s) {
        document.body.removeChild(s);
      }
    };
  }, []);

  // Handle successful payment - upgrade user subscription
  const handlePaymentSuccess = async (paymentId) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

      // Call backend to upgrade subscription
      const response = await fetch(`${apiUrl}/auth/upgrade-subscription`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user?.email,
          payment_id: paymentId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upgrade subscription");
      }

      await response.json();
      setSuccess(
        `✓ Payment successful! Account upgraded to Premium. Payment ID: ${paymentId}`
      );
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("❌ Subscription upgrade failed:", err);
      setError(`Payment recorded but subscription update failed: ${err.message}`);
      setLoading(false);
    }
  };

  // Handle premium plan upgrade
  const handleUpgrade = () => {
    setError(null);
    setSuccess(null);

    // Check if user is logged in
    if (!user) {
      setError("You must be signed in to upgrade. Redirecting...");
      setTimeout(() => navigate("/login"), 1500);
      return;
    }

    // Check if Razorpay is ready
    if (!rzpLoaded || !rzpKeyId) {
      setError("Payment gateway not ready. Please refresh and try again.");
      return;
    }

    setLoading(true);

    // Razorpay options (₹1 = 100 paise)
    const options = {
      key: rzpKeyId,
      amount: 100,
      currency: "INR",
      name: "KES Lumina",
      description: "Premium Plan — Monthly Subscription",
      prefill: {
        email: user?.email || "",
        name: user?.name || "User",
      },
      handler: function (response) {
        handlePaymentSuccess(response.razorpay_payment_id);
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
        },
      },
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        const errorMsg =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment declined";
        setError(`Payment failed: ${errorMsg}`);
        setLoading(false);
      });
      razorpay.open();
    } catch (err) {
      setError(err.message || "Failed to open payment gateway");
      setLoading(false);
    }
  };

  return (
    <section
      id="pricing"
      className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 lg:py-16 flex flex-col items-center justify-center min-h-[80vh]"
    >
      <div className="text-center mb-10 lg:mb-12">
        <h2 className="font-mono text-sm tracking-[0.3em] font-black text-cyan-400 uppercase mb-4">
          Flexible Plans
        </h2>
        <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          Choose Your <span className="text-white/40">Protection</span>
        </h3>
        <p className="text-lg text-white/50 font-medium max-w-2xl mx-auto mt-6">
          Whether you're an individual staying safe online or an organization
          securing your infrastructure, we have a plan designed for your
          security.
        </p>
      </div>

      {/* Error / Success banners */}
      {error && (
        <div className="mb-8 mx-auto max-w-2xl px-5 py-4 border border-red-500/30 bg-red-500/10 rounded-lg">
          <p className="text-red-400 text-sm font-mono">⚠ {error}</p>
        </div>
      )}
      {success && (
        <div className="mb-8 mx-auto max-w-2xl px-5 py-4 border border-cyan-500/30 bg-cyan-500/10 rounded-lg">
          <p className="text-cyan-400 text-sm font-mono">✓ {success}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-center items-stretch gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <div key={plan.name} className="flex-1 w-full max-w-md mx-auto">
            <div
              className={`relative h-full overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-[#0a0a0a] to-[#050505] p-[1px] shadow-2xl transition-all duration-300 hover:-translate-y-2 ${plan.highlighted ? "shadow-cyan-500/20" : ""}`}
            >
              {/* Border Gradient wrapper */}
              <div
                className={`absolute inset-0 bg-gradient-to-b ${plan.highlighted ? "from-teal-400 via-cyan-500 to-blue-600" : "from-white/20 to-white/5"} opacity-50`}
              ></div>

              <div className="relative flex h-full flex-col rounded-[2.5rem] bg-[#0a0a0a] p-6 lg:p-8">
                {plan.highlighted && (
                  <>
                    <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-teal-500/20 to-cyan-500/0 blur-2xl" />
                    <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/0 blur-2xl" />

                    <div className="absolute right-0 top-0 overflow-hidden rounded-tr-[2.5rem]">
                      <div className="absolute right-0 top-[28px] h-[3px] w-[100px] rotate-45 bg-gradient-to-r from-teal-400 to-cyan-500 transform translate-x-4" />
                      <span className="absolute right-3 top-4 text-[10px] font-black tracking-widest text-teal-400 uppercase font-mono">
                        {plan.badgeText}
                      </span>
                    </div>
                  </>
                )}

                <div className="relative">
                  <h4
                    className={`font-mono text-sm font-black uppercase tracking-[0.2em] ${plan.highlighted ? "text-cyan-400" : "text-white/50"}`}
                  >
                    {plan.name}
                  </h4>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-display text-4xl font-black text-white">
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm font-medium text-white/40">
                        /{plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-white/60 font-medium leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-white/10 pt-6 flex-1 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${plan.highlighted ? "bg-cyan-500/20" : "bg-white/5"} mt-0.5`}
                      >
                        <Check
                          className={`h-3 w-3 ${plan.highlighted ? "text-cyan-400" : "text-white/60"}`}
                          strokeWidth={3}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white/90">
                          {feature.title}
                        </p>
                        {feature.description && (
                          <p className="text-[11px] font-medium text-white/50 mt-1">
                            {feature.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative mt-6 pt-4">
                  {plan.highlighted ? (
                    <button
                      onClick={handleUpgrade}
                      disabled={loading}
                      className="group relative flex w-full justify-center items-center py-4 px-4 rounded-full font-mono font-black text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Processing..." : plan.ctaLabel}
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="group relative flex w-full justify-center items-center py-4 px-4 rounded-full font-mono font-black text-xs uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] bg-white/10 text-white hover:bg-white/20 border border-white/20"
                    >
                      {plan.ctaLabel}
                    </Link>
                  )}
                </div>

                {plan.guaranteeText && (
                  <p className="text-center text-[9px] font-mono tracking-widest text-white/30 uppercase mt-3">
                    {plan.guaranteeText}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
