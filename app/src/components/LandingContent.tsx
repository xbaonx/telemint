import { Zap, Shield, Database, Layers, HelpCircle } from 'lucide-react';

export function LandingContent() {
  return (
    <div className="space-y-16 py-12 text-gray-100">
      
      {/* Features Section */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
          Why choose Mint Box?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 mb-4">
              <Database size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2">Permanent Storage</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your NFT metadata and images are stored securely on IPFS & Pinata, ensuring they last forever on the decentralized web.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-4">
              <Shield size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2">100% Ownership</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              We don't hold your keys. You mint directly from your own TON wallet. You own the collection, you own the NFT.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-4">
              <Zap size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2">Lightning Fast</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Powered by TON Blockchain, minting takes seconds with negligible gas fees (~0.05 TON).
            </p>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent rounded-3xl -z-10" />
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-700 before:to-transparent">
          
          {/* Step 1 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#0f172a] bg-blue-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              1
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Layers size={20} className="text-blue-400" />
                <h3 className="font-bold text-white">Connect Wallet</h3>
              </div>
              <p className="text-sm text-gray-400">Link your Tonkeeper or any TON wallet securely via TON Connect 2.0.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#0f172a] bg-purple-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              2
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Database size={20} className="text-purple-400" />
                <h3 className="font-bold text-white">Upload & Metadata</h3>
              </div>
              <p className="text-sm text-gray-400">Upload your artwork and define its name and description. We handle the IPFS pinning.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#0f172a] bg-green-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              3
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-2xl bg-white/5 border border-white/10 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Zap size={20} className="text-green-400" />
                <h3 className="font-bold text-white">Mint Instant NFT</h3>
              </div>
              <p className="text-sm text-gray-400">Confirm the transaction in your wallet. Boom! The NFT is yours on the blockchain.</p>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex gap-3 items-start">
              <HelpCircle size={20} className="text-gray-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-200">Is it really free to use?</h4>
                <p className="text-sm text-gray-400 mt-1">Mint Box doesn't charge service fees. You only pay the standard TON Blockchain network fees (gas) and a tiny storage fee, usually totaling under 0.1 TON.</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex gap-3 items-start">
              <HelpCircle size={20} className="text-gray-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-200">Where is my image stored?</h4>
                <p className="text-sm text-gray-400 mt-1">Your images are decentralized! We use IPFS (InterPlanetary File System) via Pinata to ensure your NFT data is permanent and uncensorable.</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex gap-3 items-start">
              <HelpCircle size={20} className="text-gray-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-200">Can I sell my NFT?</h4>
                <p className="text-sm text-gray-400 mt-1">Absolutely! Once minted, the NFT is in your wallet. You can list it on any TON marketplace like Getgems.io immediately.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
}
