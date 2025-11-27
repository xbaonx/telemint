import { Shield, FileText, MessageCircle, ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 pt-8 border-t border-white/10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        
        {/* Brand Column */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Mint Box Logo" className="w-8 h-8 object-contain rounded-lg" />
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              Mint Box
            </span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            The easiest way to mint NFTs on TON Blockchain directly from Telegram. Secure, fast, and decentralized.
          </p>
        </div>

        {/* Legal Links */}
        <div>
          <h3 className="font-semibold text-gray-200 mb-3">Legal</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <a href="/terms/" target="_blank" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <FileText size={14} />
                Terms of Service
              </a>
            </li>
            <li>
              <a href="/privacy/" target="_blank" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <Shield size={14} />
                Privacy Policy
              </a>
            </li>
          </ul>
        </div>

        {/* Community */}
        <div>
          <h3 className="font-semibold text-gray-200 mb-3">Community</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <a href="https://t.me/mintboxx_bot" target="_blank" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <MessageCircle size={14} />
                Telegram Bot
              </a>
            </li>
            <li>
              <a href="https://ton.org" target="_blank" className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                <ExternalLink size={14} />
                TON Ecosystem
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
        <p>© {currentYear} Mint Box. All rights reserved.</p>
        <div className="flex items-center gap-1">
          <span>Powered by</span>
          <span className="font-medium text-blue-400">TON Blockchain 💎</span>
        </div>
      </div>
    </footer>
  );
}
