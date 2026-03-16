export default function LoginHero() {
  return (
    <div className="absolute inset-0 hidden lg:flex flex-col justify-end p-20 pointer-events-none">
      <div className="max-w-2xl transform transition-all duration-1000 translate-y-0 opacity-100 mb-10">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 bg-white/20 backdrop-blur-xl rounded-full border border-white/30 mb-8 font-bold text-sm tracking-widest text-white uppercase shadow-lg">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span>System Active & Monitoring</span>
        </div>
        <h1 className="text-6xl xl:text-7xl font-black mb-6 tracking-tight leading-[1.1] text-white drop-shadow-2xl">
          Nexus <span className="text-blue-400">Hub</span>
        </h1>
        <p className="text-xl text-white font-bold leading-relaxed max-w-xl drop-shadow-2xl">
          Access your smart cyber defense platform to investigate AI-detected
          anomalies, phishing attempts, and suspicious zero-day threats.
        </p>
      </div>
    </div>
  );
}
